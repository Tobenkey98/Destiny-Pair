"""Expiry reminders: in-app notification plus a branded renewal email.

Shared by the Celery task (``subscriptions.tasks``) and the
``send_expiry_reminders`` management command so the exact same reminders are
fired whether the broker is running or cron invokes the command.
"""

from subscriptions.services import expiry_service
from subscriptions.services.notifications import send_expiry_reminder_email


def run_expiry_reminders(hours=48):
    """Notify (email + in-app) every subscriber whose plan ends in <hours>."""
    from notifications.models import Notification

    count = 0
    subscribers = expiry_service.expiring_soon(hours=hours).select_related('user', 'plan')
    for sub in subscribers:
        user = sub.user
        Notification.objects.create(
            user=user,
            title='Subscription expiring soon',
            message=(
                f'Your {sub.plan.name} plan expires on '
                f'{sub.end_date.strftime("%d %b %Y")}. Renew to keep your perks.'
            ),
        )
        send_expiry_reminder_email(sub)
        count += 1
    return count