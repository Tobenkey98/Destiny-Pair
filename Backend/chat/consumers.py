import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from chat.models import Conversation, Message
from accounts.models import Activity

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conv_id = self.scope['url_route']['kwargs']['conv_id']
        self.room_group_name = f'chat_{self.conv_id}'

        user = await self.get_user()
        if not user or not await self.is_participant(user):
            await self.close()
            return

        self.user = user
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_online',
                'user_id': user.id,
                'first_name': user.first_name or 'User',
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            if hasattr(self, 'user'):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_offline',
                        'user_id': self.user.id,
                    }
                )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type', 'message')

        if msg_type == 'message':
            text = data.get('text', '').strip()
            if not text:
                return
            msg = await self.save_message(text)
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

        elif msg_type == 'audio':
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

        elif msg_type == 'typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_typing',
                    'user_id': self.user.id,
                    'first_name': self.user.first_name or 'User',
                    'is_typing': data.get('is_typing', False),
                }
            )

        elif msg_type == 'call_offer':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'call_offer',
                    'sender_id': self.user.id,
                    'sender_name': self.user.first_name or 'User',
                    'offer': data.get('offer'),
                }
            )

        elif msg_type == 'call_answer':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'call_answer',
                    'sender_id': self.user.id,
                    'answer': data.get('answer'),
                }
            )

        elif msg_type == 'ice_candidate':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'ice_candidate',
                    'sender_id': self.user.id,
                    'candidate': data.get('candidate'),
                }
            )

        elif msg_type == 'call_end':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'call_end',
                    'sender_id': self.user.id,
                }
            )

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

    async def user_online(self, event):
        await self.send(text_data=json.dumps({
            'type': 'online',
            'user_id': event['user_id'],
            'first_name': event['first_name'],
        }))

    async def user_offline(self, event):
        await self.send(text_data=json.dumps({
            'type': 'offline',
            'user_id': event['user_id'],
        }))

    async def call_offer(self, event):
        if event['sender_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'call_offer',
                'sender_id': event['sender_id'],
                'sender_name': event['sender_name'],
                'offer': event['offer'],
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
    def get_user(self):
        query_string = self.scope['query_string'].decode()
        token = None
        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param.split('=', 1)[1]
                break
        if not token:
            return None
        try:
            access = AccessToken(token)
            return User.objects.get(id=access['user_id'])
        except Exception:
            return None

    @database_sync_to_async
    def is_participant(self, user):
        return Conversation.objects.filter(id=self.conv_id, participants=user).exists()

    @database_sync_to_async
    def save_message(self, text):
        msg = Message.objects.create(
            conversation_id=self.conv_id,
            sender=self.user,
            text=text,
        )
        Activity.objects.create(
            user=self.user,
            action='message',
            description='Sent a message',
            related_user=Conversation.objects.get(id=self.conv_id).participants.exclude(id=self.user.id).first(),
        )
        Conversation.objects.filter(id=self.conv_id).update(updated_at=msg.created_at)
        return msg
