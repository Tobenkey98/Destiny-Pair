import json
import re

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from django.core.cache import cache

from chat.models import Conversation, Message
from chat.content_policy import check_message_policy
from accounts.models import Activity

User = get_user_model()

PRESENCE_GROUP = 'presence'
ONLINE_IDS_KEY = 'chat_online_ids'
CONN_KEY_TPL = 'chat_conns_{user_id}'
RATE_LIMIT_KEY_TPL = 'chat_rate_{user_id}'
SIGNALING_KEY_TPL = 'chat_signal_{user_id}'

ONLINE_TTL = 12 * 60 * 60
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 90
SIGNALING_WINDOW = 60
SIGNALING_MAX = 120
MAX_MESSAGE_LEN = 4000

CONTROL_CHARS_RE = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')
CONV_ID_RE = re.compile(r'^\d+$')


def sanitize_text(text):
    text = text or ''
    if not isinstance(text, str):
        text = str(text)
    text = CONTROL_CHARS_RE.sub('', text)
    return text.strip()[:MAX_MESSAGE_LEN]


def extract_token(scope):
    """Extract a JWT access token strictly from the negotiated subprotocol.

    Tokens are never accepted from the URL query string, so credentials never
    leak into access logs, proxies, or referrer headers.
    """
    for protocol in scope.get('subprotocols') or []:
        if protocol.startswith('Bearer.'):
            return protocol[len('Bearer.'):]
    return None


ALLOWED_ORIGINS = None


def origin_allowed(scope):
    """Reject cross-site WebSocket handshakes (CSWSH / DNS-rebinding guard).

    Browsers always send an ``Origin`` (or ``Sec-WebSocket-Origin``) header on
    WebSocket upgrades; non-browser clients may omit it and are allowed through.
    """
    global ALLOWED_ORIGINS
    if ALLOWED_ORIGINS is None:
        from django.conf import settings
        allowed = {
            'http://localhost:5173', 'http://127.0.0.1:5173',
            'http://localhost:8002', 'http://127.0.0.1:8002',
            'http://localhost:8005', 'http://127.0.0.1:8005',
        }
        for host in getattr(settings, 'ALLOWED_HOSTS', []) or []:
            if host == '*':
                continue
            allowed.add(f'http://{host}')
            allowed.add(f'https://{host}')
        for origin in getattr(settings, 'CORS_ALLOWED_ORIGINS', []) or []:
            allowed.add(origin)
        frontend_url = getattr(settings, 'FRONTEND_URL', '') or ''
        if frontend_url:
            allowed.add(frontend_url)
        ALLOWED_ORIGINS = allowed

    for key, value in scope.get('headers') or []:
        if key in (b'origin', b'sec-websocket-origin'):
            return value.decode('latin-1') in ALLOWED_ORIGINS
    return True


class PresenceConsumerBase(AsyncWebsocketConsumer):
    """Base consumer implementing a global, cache-backed presence system.

    Every authenticated socket joins the global ``PRESENCE_GROUP``. Online
    membership is counted per user in Redis so multiple tabs/connections don't
    produce false offline broadcasts. New connections receive a snapshot of
    everyone currently online.
    """

    async def connect(self):
        if not origin_allowed(self.scope):
            await self.close(code=4004)
            return
        self.user = await self.authenticate_user()
        if self.user is None:
            await self.close(code=4001)
            return

        await self.channel_layer.group_add(PRESENCE_GROUP, self.channel_name)
        await self.accept(subprotocol=await self.accepted_subprotocol())

        await self.mark_online(self.user.id)
        await self.channel_layer.group_send(
            PRESENCE_GROUP,
            {
                'type': 'user_online',
                'user_id': self.user.id,
                'first_name': self.user.first_name or 'User',
            }
        )
        await self.send_presence_snapshot()

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user is not None:
            await self.channel_layer.group_discard(PRESENCE_GROUP, self.channel_name)
            was_last = await self.mark_offline(self.user.id)
            if was_last:
                await self.channel_layer.group_send(
                    PRESENCE_GROUP,
                    {'type': 'user_offline', 'user_id': self.user.id},
                )

    async def receive(self, text_data):
        # Presence sockets only observe; they never accept messages.
        return

    async def accepted_subprotocol(self):
        subs = self.scope.get('subprotocols') or []
        for preferred in ('dp',):
            if preferred in subs:
                return preferred
        return subs[0] if subs else None

    @database_sync_to_async
    def authenticate_user(self):
        token = extract_token(self.scope)
        if not token:
            return None
        try:
            access = AccessToken(token)
        except Exception:
            return None
        try:
            user = User.objects.get(id=access['user_id'])
        except (User.DoesNotExist, KeyError, AttributeError, TypeError):
            return None
        if not user.is_active or getattr(user, 'is_banned', False):
            return None
        stamp = access.get('stamp')
        if stamp is not None and stamp != (user.security_stamp or ''):
            return None
        return user

    @database_sync_to_async
    def mark_online(self, user_id):
        conn_key = CONN_KEY_TPL.format(user_id=user_id)
        cache.set(conn_key, int(cache.get(conn_key, 0) or 0) + 1, ONLINE_TTL)
        online = set(cache.get(ONLINE_IDS_KEY, set()) or set())
        online.add(user_id)
        cache.set(ONLINE_IDS_KEY, online, ONLINE_TTL)

    @database_sync_to_async
    def mark_offline(self, user_id):
        conn_key = CONN_KEY_TPL.format(user_id=user_id)
        count = int(cache.get(conn_key, 0) or 0)
        if count <= 1:
            cache.delete(conn_key)
            online = set(cache.get(ONLINE_IDS_KEY, set()) or set())
            online.discard(user_id)
            cache.set(ONLINE_IDS_KEY, online, ONLINE_TTL)
            return True
        cache.set(conn_key, count - 1, ONLINE_TTL)
        return False

    @database_sync_to_async
    def get_online_ids(self):
        return set(cache.get(ONLINE_IDS_KEY, set()) or set())

    @database_sync_to_async
    def allow_message(self, user_id):
        key = RATE_LIMIT_KEY_TPL.format(user_id=user_id)
        count = int(cache.get(key, 0) or 0)
        if count >= RATE_LIMIT_MAX:
            return False
        cache.set(key, count + 1, RATE_LIMIT_WINDOW)
        return True

    @database_sync_to_async
    def allow_signaling(self, user_id):
        key = SIGNALING_KEY_TPL.format(user_id=user_id)
        count = int(cache.get(key, 0) or 0)
        if count >= SIGNALING_MAX:
            return False
        cache.set(key, count + 1, SIGNALING_WINDOW)
        return True

    async def send_presence_snapshot(self):
        online = await self.get_online_ids()
        online.discard(self.user.id)
        await self.send(text_data=json.dumps({
            'type': 'presence_snapshot',
            'online': list(online),
        }))

    # --- Client-facing global presence handlers ---
    async def user_online(self, event):
        await self.send(text_data=json.dumps({
            'type': 'online',
            'user_id': event['user_id'],
            'first_name': event.get('first_name', 'User'),
        }))

    async def user_offline(self, event):
        await self.send(text_data=json.dumps({
            'type': 'offline',
            'user_id': event['user_id'],
        }))


class PresenceConsumer(PresenceConsumerBase):
    """Dedicated presence-only socket (ws/presence/)."""

    pass


class ChatConsumer(PresenceConsumerBase):
    """Per-conversation messaging socket with global presence participation."""

    async def connect(self):
        if not origin_allowed(self.scope):
            await self.close(code=4004)
            return
        raw_conv = self.scope['url_route']['kwargs'].get('conv_id')
        if not raw_conv or not CONV_ID_RE.match(raw_conv):
            await self.close(code=4400)
            return
        self.conv_id = int(raw_conv)
        self.room_group_name = f'chat_{self.conv_id}'

        self.user = await self.authenticate_user()
        if self.user is None:
            await self.close(code=4001)
            return
        if not await self.is_participant(self.user):
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.channel_layer.group_add(PRESENCE_GROUP, self.channel_name)
        await self.accept(subprotocol=await self.accepted_subprotocol())

        await self.mark_online(self.user.id)
        await self.channel_layer.group_send(
            PRESENCE_GROUP,
            {
                'type': 'user_online',
                'user_id': self.user.id,
                'first_name': self.user.first_name or 'User',
            }
        )
        await self.send_presence_snapshot()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        if hasattr(self, 'user') and self.user is not None:
            await self.channel_layer.group_discard(PRESENCE_GROUP, self.channel_name)
            was_last = await self.mark_offline(self.user.id)
            if was_last:
                await self.channel_layer.group_send(
                    PRESENCE_GROUP,
                    {'type': 'user_offline', 'user_id': self.user.id},
                )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        msg_type = data.get('type')

        if msg_type in ('audio', 'call_offer', 'call_answer', 'ice_candidate', 'call_end'):
            if not await self.allow_signaling(self.user.id):
                return

        if msg_type == 'message':
            if not await self.allow_message(self.user.id):
                await self.send(text_data=json.dumps({'type': 'rate_limited', 'message': 'Slow down'}))
                return
            text = sanitize_text(data.get('text'))
            if not text:
                return
            violation = check_message_policy(text)
            if violation:
                await self.send(text_data=json.dumps({
                    'type': 'policy_block',
                    'code': violation['code'],
                    'category': violation['category'],
                    'reason': violation['reason'],
                }))
                return
            if not await self.check_message_quota():
                await self.send(text_data=json.dumps({
                    'type': 'quota_denied',
                    'error': 'MESSAGE_LIMIT_REACHED',
                    'detail': 'Your message limit is exhausted for this period.',
                }))
                return
            msg = await self.save_message(text)
            await self.record_message_sent()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'id': msg.id,
                    'sender_id': self.user.id,
                    'sender_name': self.user.first_name or 'User',
                    'text': text,
                    'created_at': msg.created_at.isoformat(),
                }
            )
            return

        if msg_type == 'audio':
            msg_id = data.get('id')
            audio_url = data.get('audio_url', '')
            created_at = data.get('created_at', '')
            if not audio_url:
                return
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_audio',
                    'id': msg_id,
                    'sender_id': self.user.id,
                    'sender_name': self.user.first_name or 'User',
                    'audio_url': audio_url,
                    'created_at': created_at,
                }
            )
            return

        if msg_type == 'typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_typing',
                    'user_id': self.user.id,
                    'first_name': self.user.first_name or 'User',
                    'is_typing': bool(data.get('is_typing', False)),
                }
            )
            return

        if msg_type == 'call_offer':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'call_offer',
                    'sender_id': self.user.id,
                    'sender_name': self.user.first_name or 'User',
                    'offer': data.get('offer'),
                    'call_type': data.get('call_type', 'video'),
                }
            )
            return

        if msg_type == 'call_answer':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'call_answer',
                    'sender_id': self.user.id,
                    'answer': data.get('answer'),
                }
            )
            return

        if msg_type == 'ice_candidate':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'ice_candidate',
                    'sender_id': self.user.id,
                    'candidate': data.get('candidate'),
                }
            )
            return

        if msg_type == 'call_end':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'call_end',
                    'sender_id': self.user.id,
                }
            )
            return

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'id': event['id'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'text': event['text'],
            'created_at': event['created_at'],
        }))

    async def chat_audio(self, event):
        await self.send(text_data=json.dumps({
            'type': 'audio',
            'id': event['id'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'audio_url': event['audio_url'],
            'created_at': event['created_at'],
        }))

    async def user_typing(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'first_name': event['first_name'],
            'is_typing': event['is_typing'],
        }))

    async def call_offer(self, event):
        if event['sender_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'call_offer',
                'sender_id': event['sender_id'],
                'sender_name': event['sender_name'],
                'offer': event['offer'],
                'call_type': event.get('call_type', 'video'),
            }))

    async def call_answer(self, event):
        if event['sender_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'call_answer',
                'sender_id': event['sender_id'],
                'answer': event['answer'],
            }))

    async def ice_candidate(self, event):
        if event['sender_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'ice_candidate',
                'sender_id': event['sender_id'],
                'candidate': event['candidate'],
            }))

    async def call_end(self, event):
        if event['sender_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'call_end',
                'sender_id': event['sender_id'],
            }))

    @database_sync_to_async
    def is_participant(self, user):
        return Conversation.objects.filter(id=self.conv_id, participants=user).exists()

    @database_sync_to_async
    def save_message(self, text):
        msg = Message.objects.create(
            conversation_id=self.conv_id,
            sender=self.user,
            message=text,
        )
        Activity.objects.create(
            user=self.user,
            action='message',
            description='Sent a message',
            related_user=Conversation.objects.get(id=self.conv_id).participants.exclude(id=self.user.id).first(),
        )
        Conversation.objects.filter(id=self.conv_id).update(updated_at=msg.created_at)
        return msg

    @database_sync_to_async
    def check_message_quota(self):
        from subscriptions.services import usage_service
        return usage_service.can_send_message(self.user)['allowed']

    @database_sync_to_async
    def record_message_sent(self):
        from subscriptions.services import usage_service
        usage_service.record_message_sent(self.user)