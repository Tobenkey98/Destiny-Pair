"""Quota computation: remaining limits for the user's effective plan.

Counting rules
--------------
* Messages count only when sent. Free resets daily, paid plans reset monthly.
* Audio/video minutes are tracked per calendar month.
* Profile views, likes and saves are tracked per day.
* ``None`` from any ``*_remaining`` function means "unlimited".
"""

from datetime import timedelta

from django.utils import timezone

from chat.models import Conversation
from subscriptions.models import SubscriptionUsage
from subscriptions.services import plan_service

MONTH_START = None  # computed lazily (module import safety)


def _month_start():
    today = timezone.localdate()
    return today.replace(day=1)


def get_or_create_usage(user):
    """Return (usage, created). Keeps the usage row linked to the active sub."""
    usage, created = SubscriptionUsage.objects.get_or_create(user=user)
    sub = plan_service.get_active_subscription(user)
    if sub and usage.subscription_id != sub.id:
        usage.subscription = sub
        usage.save(update_fields=['subscription'])
    return usage, created


def messages_remaining(user):
    """Messages left in the current counting period, or None if unlimited."""
    plan = plan_service.get_effective_plan(user)
    if plan.is_unlimited('message_limit'):
        return None

    usage, _ = get_or_create_usage(user)
    now = timezone.localdate()
    if plan.message_reset_period == 'daily':
        if usage.messages_period != now:
            usage.messages_sent = 0
            usage.messages_period = now
            usage.save(update_fields=['messages_sent', 'messages_period'])
        period_start = now
    else:
        period_start = _month_start()
        if usage.messages_period != period_start:
            usage.messages_sent = 0
            usage.messages_period = period_start
            usage.save(update_fields=['messages_sent', 'messages_period'])

    return max(0, plan.message_limit - usage.messages_sent)


def message_used_count(user):
    usage, _ = get_or_create_usage(user)
    return usage.messages_sent


def active_conversations(user):
    """Number of conversations the user participates in."""
    return Conversation.objects.filter(participants=user).count()


def conversation_limit(user):
    plan = plan_service.get_effective_plan(user)
    return plan.active_conversation_limit  # None = unlimited


def minutes_remaining(user, call_type):
    """Audio/video minutes left this month, or None if unlimited."""
    plan = plan_service.get_effective_plan(user)
    if call_type == 'audio':
        limit = plan.audio_minutes_limit
    elif call_type == 'video':
        limit = plan.video_minutes_limit
    else:
        raise ValueError(f'Unknown call type: {call_type}')

    if limit is None:
        return None

    usage, _ = get_or_create_usage(user)
    period_start = _month_start()
    if usage.month != period_start:
        usage.audio_minutes_used = 0
        usage.video_minutes_used = 0
        usage.counselling_sessions_used = 0
        usage.month = period_start
        usage.save(update_fields=[
            'audio_minutes_used', 'video_minutes_used',
            'counselling_sessions_used', 'month',
        ])

    used = usage.audio_minutes_used if call_type == 'audio' else usage.video_minutes_used
    return max(0, limit - used)


def minutes_used(user, call_type):
    usage, _ = get_or_create_usage(user)
    return usage.audio_minutes_used if call_type == 'audio' else usage.video_minutes_used


def _daily_counter(user, field):
    usage, _ = get_or_create_usage(user)
    today = timezone.localdate()
    if usage.daily_period != today:
        usage.profile_views_today = 0
        usage.likes_today = 0
        usage.saves_today = 0
        usage.daily_period = today
        usage.save(update_fields=['profile_views_today', 'likes_today', 'saves_today', 'daily_period'])
    return getattr(usage, field, 0)


def _daily_limit(user, limit_attr):
    plan = plan_service.get_effective_plan(user)
    return getattr(plan, limit_attr, None)  # None = unlimited


def daily_views_used(user):
    return _daily_counter(user, 'profile_views_today')


def daily_views_remaining(user):
    limit = _daily_limit(user, 'profile_view_limit_daily')
    if limit is None:
        return None
    return max(0, limit - daily_views_used(user))


def daily_likes_used(user):
    return _daily_counter(user, 'likes_today')


def daily_likes_remaining(user):
    limit = _daily_limit(user, 'like_limit_daily')
    if limit is None:
        return None
    return max(0, limit - daily_likes_used(user))


def daily_saves_used(user):
    return _daily_counter(user, 'saves_today')


def daily_saves_remaining(user):
    limit = _daily_limit(user, 'save_limit_daily')
    if limit is None:
        return None
    return max(0, limit - daily_saves_used(user))


def counselling_sessions_remaining(user):
    plan = plan_service.get_effective_plan(user)
    if plan.free_counselling_sessions <= 0:
        return 0
    usage, _ = get_or_create_usage(user)
    period_start = _month_start()
    if usage.month != period_start:
        usage.counselling_sessions_used = 0
        usage.month = period_start
        usage.save(update_fields=['counselling_sessions_used', 'month'])
    return max(0, plan.free_counselling_sessions - usage.counselling_sessions_used)


def reset_usage_for_user(user, plan=None):
    """Reset every counter — called on plan activation/downgrade."""
    usage, _ = SubscriptionUsage.objects.get_or_create(user=user)
    now = timezone.localdate()
    usage.month = _month_start()
    usage.messages_sent = 0
    usage.messages_period = now
    usage.audio_minutes_used = 0
    usage.video_minutes_used = 0
    usage.counselling_sessions_used = 0
    usage.profile_views_today = 0
    usage.likes_today = 0
    usage.saves_today = 0
    usage.daily_period = now
    usage.active_conversations_count = active_conversations(user)
    if plan is not None:
        sub = plan_service.get_active_subscription(user)
        usage.subscription = sub
    usage.save()
    return usage


def reset_all_daily(today):
    """Batch reset daily counters (profile views, likes, saves)."""
    return SubscriptionUsage.objects.filter(daily_period__lt=today).update(
        profile_views_today=0,
        likes_today=0,
        saves_today=0,
        daily_period=today,
        updated_at=timezone.now(),
    )


def reset_all_monthly(month_start):
    """Batch reset monthly counters (messages, call minutes, counselling)."""
    return SubscriptionUsage.objects.filter(month__lt=month_start).update(
        month=month_start,
        messages_sent=0,
        audio_minutes_used=0,
        video_minutes_used=0,
        counselling_sessions_used=0,
        updated_at=timezone.now(),
    )