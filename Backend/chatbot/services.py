import time

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

from .knowledge import FALLBACK_REPLY, SYSTEM_PROMPT


def is_configured():
    return bool(settings.CHATBOT_API_KEY and settings.CHATBOT_API_BASE)


def chat_completion(messages):
    """Call the OpenAI-compatible endpoint and return the reply text.

    Raises on failure so callers can store the message and fall back to a
    canned reply / escalation instead of breaking the chat.
    """
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {settings.CHATBOT_API_KEY}",
        'HTTP-Referer': settings.FRONTEND_URL,
        'X-Title': 'DestinyPair Support Bot',
    }
    payload = {
        'model': settings.CHATBOT_MODEL,
        'messages': messages,
        'temperature': 0.3,
        'max_tokens': settings.CHATBOT_MAX_TOKENS,
    }
    url = settings.CHATBOT_API_BASE.rstrip('/') + '/chat/completions'
    resp = requests.post(url, headers=headers, json=payload, timeout=settings.CHATBOT_TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    try:
        return data['choices'][0]['message']['content'].strip()
    except (KeyError, IndexError, TypeError):
        raise RuntimeError('Unexpected response from AI provider')


def build_messages(user_messages):
    """Convert stored messages into OpenAI-style turns (system + history).

    ``user_messages`` is an ordered list of (role, content) tuples from the
    current conversation only — no cross-user data can leak.
    """
    turns = [{'role': 'system', 'content': SYSTEM_PROMPT}]
    for role, content in user_messages:
        if role in ('user', 'assistant'):
            turns.append({'role': role, 'content': content})
    return turns


def client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or '0.0.0.0'


def rate_limit_exceeded(ip, session_id):
    """Simple per-session + per-IP guard using the shared cache.

    Guests and signed-in users both share a session counter to keep it fair.
    If the cache is unavailable we fail open so the chat never breaks.
    """
    if not settings.CHATBOT_ENABLED:
        return False
    now = int(time.time())
    window = settings.CHATBOT_RATE_WINDOW
    per_session = settings.CHATBOT_RATE_PER_SESSION
    per_ip = settings.CHATBOT_RATE_PER_IP

    try:
        session_key = f'chatbot:rate:s:{session_id}:{now // window}'
        s_count = cache.get(session_key, 0)
        if s_count >= per_session:
            return True
        cache.set(session_key, s_count + 1, window + 60)

        ip_key = f'chatbot:rate:ip:{ip}:{now // window}'
        i_count = cache.get(ip_key, 0)
        if i_count >= per_ip:
            return True
        cache.set(ip_key, i_count + 1, window + 60)
    except Exception:
        return False

    return False


def notify_super_admins(title, message):
    """Create durable notification rows for every active super admin."""
    from accounts.services.role_service import RoleService
    from notifications.models import Notification

    created = 0
    for user in get_user_model().objects.all():
        if user.is_active and RoleService.user_has_role(user, 'super_admin'):
            Notification.objects.create(user=user, title=title, message=message)
            created += 1
    return created


def auto_escalate(conversation, category='not_answered', summary=''):
    """Create a ticket for any conversation that ends unresolved."""
    from .models import BotTicket

    if conversation.tickets.exists():
        return conversation.tickets.first()

    ticket = BotTicket.objects.create(
        conversation=conversation,
        user=conversation.user,
        category=category,
        summary=(summary or conversation.title or 'Unresolved chat')[:2000],
    )
    conversation.status = 'escalated'
    conversation.escalated_at = timezone.now()
    conversation.save(update_fields=['status', 'escalated_at', 'updated_at'])

    user_desc = conversation.user.email if conversation.user else 'Guest user'
    notify_super_admins(
        title='New chatbot escalation',
        message=f'{user_desc} raised a support ticket: {ticket.get_category_display()}',
    )
    return ticket


def fallback_reply():
    return FALLBACK_REPLY