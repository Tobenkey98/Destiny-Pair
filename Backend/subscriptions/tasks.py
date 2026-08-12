"""Scheduled subscription maintenance tasks.

Run with:  celery -A Destiny_Pair worker -l info
The beats are best configured on the broker (or django-celery-beat); the
``subscriptions`` management commands provide a manual fallback:

    python manage.py expire_subscriptions
    python manage.py reset_usage
"""

import logging

from celery import shared_task

from subscriptions.services import expiry_service, quota_service

logger = logging.getLogger(__name__)


@shared_task
def expire_overdue_subscriptions():
    """Deactivate subscriptions past their end date (hourly)."""
    ids = expiry_service.expire_overdue()
    if ids:
        logger.info('Expired %d overdue subscription(s): %s', len(ids), ids)
    return {'expired': len(ids)}


@shared_task
def send_expiry_reminders():
    """Notify users whose subscription ends within the next 48h."""
    from notifications.models import Notification

    count = 0
    for sub in expiry_service.expiring_soon(hours=48).select_related('user', 'plan'):
        user = sub.user
        Notification.objects.create(
            user=user,
            title='Subscription expiring soon',
            message=(
                f'Your {sub.plan.name} plan expires on '
                f'{sub.end_date.strftime("%d %b %Y")}. Renew to keep your perks.'
            ),
        )
        count += 1
    if count:
        logger.info('Sent %d expiry reminder(s)', count)
    return {'reminders': count}


@shared_task
def reset_daily_usage():
    """Reset daily counters for every user's usage row."""
    from django.utils import timezone

    today = timezone.localdate()
    updated = quota_service.reset_all_daily(today)
    return {'updated': updated}


@shared_task
def reset_monthly_usage():
    """Reset monthly counters (messages for monthly plans, call minutes)."""
    from django.utils import timezone

    month_start = timezone.localdate().replace(day=1)
    updated = quota_service.reset_all_monthly(month_start)
    return {'updated': updated}