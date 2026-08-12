"""Usage enforcement: gate every premium action and record usage.

Every ``can_*`` method returns a structured decision::

    {"allowed": bool, "reason": str|None, "remaining": int|None, "upgrade_required": bool}

``remaining`` is ``None`` when the limit is unlimited.
"""

from django.utils import timezone
from django.db.models import Q

from chat.models import Conversation, Message
from matching.models import Match
from subscriptions.models import CallSession, SubscriptionUsage
from subscriptions.services import plan_service, quota_service


def _allowed():
    return {'allowed': True, 'reason': None, 'remaining': None, 'upgrade_required': False}


def _denied(reason, remaining=0, upgrade_required=True):
    return {
        'allowed': False,
        'reason': reason,
        'remaining': remaining if remaining is not None else 0,
        'upgrade_required': upgrade_required,
    }


# ---------------------------------------------------------------------------
# Feature checks
# ---------------------------------------------------------------------------

def can_use_advanced_filters(user):
    if plan_service.has_feature(user, 'can_use_advanced_filters'):
        return _allowed()
    return _denied('ADVANCED_FILTERS_REQUIRED', upgrade_required=True)


def can_see_likes(user):
    if plan_service.has_feature(user, 'can_see_likes'):
        return _allowed()
    return _denied('LIKES_VISIBILITY_REQUIRED', upgrade_required=True)


def can_see_visitors(user):
    if plan_service.has_feature(user, 'can_see_visitors'):
        return _allowed()
    return _denied('VISITORS_VISIBILITY_REQUIRED', upgrade_required=True)


def can_send_voice_notes(user):
    if plan_service.has_feature(user, 'can_send_voice_notes'):
        return _allowed()
    return _denied('VOICE_NOTES_REQUIRED', upgrade_required=True)


# ---------------------------------------------------------------------------
# Messaging
# ---------------------------------------------------------------------------

def can_send_message(user):
    remaining = quota_service.messages_remaining(user)
    if remaining is None or remaining > 0:
        return _allowed()
    return _denied('MESSAGE_LIMIT_REACHED', remaining=remaining, upgrade_required=True)


def record_message_sent(user):
    quota_service.messages_remaining(user)  # ensures the period bucket is fresh
    usage, _ = quota_service.get_or_create_usage(user)
    SubscriptionUsage.objects.filter(pk=usage.pk).update(
        messages_sent=usage.messages_sent + 1,
        active_conversations_count=quota_service.active_conversations(user),
        updated_at=timezone.now(),
    )


def can_start_conversation(user):
    limit = quota_service.conversation_limit(user)
    if limit is None:
        return _allowed()
    active = quota_service.active_conversations(user)
    if active < limit:
        return _allowed()
    return _denied('CONVERSATION_LIMIT_REACHED', remaining=0, upgrade_required=True)


def sync_active_conversations(user):
    usage, _ = quota_service.get_or_create_usage(user)
    SubscriptionUsage.objects.filter(pk=usage.pk).update(
        active_conversations_count=quota_service.active_conversations(user),
        updated_at=timezone.now(),
    )


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------

def can_view_profile(user):
    remaining = quota_service.daily_views_remaining(user)
    if remaining is None or remaining > 0:
        return _allowed()
    return _denied('DAILY_PROFILE_VIEW_LIMIT_REACHED', remaining=remaining, upgrade_required=True)


def record_profile_view(user):
    quota_service.daily_views_remaining(user)
    usage, _ = quota_service.get_or_create_usage(user)
    SubscriptionUsage.objects.filter(pk=usage.pk).update(
        profile_views_today=usage.profile_views_today + 1,
        updated_at=timezone.now(),
    )


def can_like_profile(user):
    remaining = quota_service.daily_likes_remaining(user)
    if remaining is None or remaining > 0:
        return _allowed()
    return _denied('DAILY_LIKE_LIMIT_REACHED', remaining=remaining, upgrade_required=True)


def record_like(user):
    quota_service.daily_likes_remaining(user)
    usage, _ = quota_service.get_or_create_usage(user)
    SubscriptionUsage.objects.filter(pk=usage.pk).update(
        likes_today=usage.likes_today + 1,
        updated_at=timezone.now(),
    )


def can_save_profile(user):
    remaining = quota_service.daily_saves_remaining(user)
    if remaining is None or remaining > 0:
        return _allowed()
    return _denied('DAILY_SAVE_LIMIT_REACHED', remaining=remaining, upgrade_required=True)


def record_save(user):
    quota_service.daily_saves_remaining(user)
    usage, _ = quota_service.get_or_create_usage(user)
    SubscriptionUsage.objects.filter(pk=usage.pk).update(
        saves_today=usage.saves_today + 1,
        updated_at=timezone.now(),
    )


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------

MIN_MESSAGES_BEFORE_CALL = 10


def _mutual_match(user, other):
    return Match.objects.filter(
        from_user=user, to_user=other, status='matched',
    ).exists() and Match.objects.filter(
        from_user=other, to_user=user, status='matched',
    ).exists()


def can_make_audio_call(user, minutes=1, conversation_id=None):
    return _can_make_call(user, 'audio', minutes, conversation_id)


def can_make_video_call(user, minutes=1, conversation_id=None):
    return _can_make_call(user, 'video', minutes, conversation_id)


def _can_make_call(user, call_type, minutes, conversation_id):
    remaining = quota_service.minutes_remaining(user, call_type)
    if remaining is not None and remaining < 1:
        return _denied(
            'AUDIO_MINUTES_EXHAUSTED' if call_type == 'audio' else 'VIDEO_MINUTES_EXHAUSTED',
            remaining=remaining,
            upgrade_required=True,
        )

    if conversation_id:
        conv = Conversation.objects.filter(id=conversation_id, participants=user).first()
        if conv is None:
            return _denied('CONVERSATION_NOT_FOUND', remaining=remaining)
        other = conv.participants.exclude(id=user.id).first()
        if other is None:
            return _denied('CONVERSATION_NOT_FOUND', remaining=remaining)

        if not _mutual_match(user, other):
            return _denied('NOT_MUTUAL_MATCH', remaining=remaining)
        if not (user.is_verified and other.is_verified):
            return _denied('EMAIL_NOT_VERIFIED', remaining=remaining)
        exchanged = Message.objects.filter(conversation=conv).count()
        if exchanged < MIN_MESSAGES_BEFORE_CALL:
            return _denied('INSUFFICIENT_MESSAGES', remaining=remaining)

    return _allowed()


def start_call_session(user, call_type, conversation_id):
    """Create a CallSession for an accepted call."""
    return CallSession.objects.create(
        conversation_id=conversation_id,
        initiated_by=user,
        call_type=call_type,
    )


def end_call_session(session, now=None):
    """Finalize a call: compute duration and bill minutes to the initiator."""
    now = now or timezone.now()
    if session.ended_at is not None:
        return session

    if session.started_at:
        seconds = max(0, int((now - session.started_at).total_seconds()))
    else:
        seconds = 0
    billed = max(1, -(-seconds // 60))  # ceil division, minimum 1 minute

    session.ended_at = now
    session.duration_seconds = seconds
    session.billed_minutes = billed
    session.save(update_fields=['ended_at', 'duration_seconds', 'billed_minutes'])

    quota_service.minutes_remaining(session.initiated_by, session.call_type)
    usage, _ = quota_service.get_or_create_usage(session.initiated_by)
    if session.call_type == 'audio':
        used = usage.audio_minutes_used + billed
        SubscriptionUsage.objects.filter(pk=usage.pk).update(
            audio_minutes_used=used, updated_at=timezone.now(),
        )
    else:
        used = usage.video_minutes_used + billed
        SubscriptionUsage.objects.filter(pk=usage.pk).update(
            video_minutes_used=used, updated_at=timezone.now(),
        )
    return session


# ---------------------------------------------------------------------------
# Counselling (Kingdom free sessions)
# ---------------------------------------------------------------------------

def can_use_counselling_session(user):
    remaining = quota_service.counselling_sessions_remaining(user)
    if remaining is None or remaining > 0:
        return _allowed()
    return _denied('COUNSELLING_QUOTA_EXHAUSTED', remaining=0, upgrade_required=True)


def record_counselling_session(user):
    quota_service.counselling_sessions_remaining(user)
    usage, _ = quota_service.get_or_create_usage(user)
    SubscriptionUsage.objects.filter(pk=usage.pk).update(
        counselling_sessions_used=usage.counselling_sessions_used + 1,
        updated_at=timezone.now(),
    )