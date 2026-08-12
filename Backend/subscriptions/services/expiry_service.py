"""Expiry & renewal: auto-expire overdue subscriptions and reset usage."""

from datetime import timedelta

from django.utils import timezone

from subscriptions.models import UserSubscription, SubscriptionUsage


def expire_overdue():
    """Deactivate any active subscription past its end_date.

    Used by a scheduled task (and management command) so an expired plan
    immediately reverts the user to the Free tier. Returns the list of
    affected subscription ids.
    """
    now = timezone.now()
    expired = UserSubscription.objects.filter(
        status='active',
        active=True,
        end_date__isnull=False,
        end_date__lt=now,
    )
    ids = list(expired.values_list('id', flat=True))
    if ids:
        expired.update(status='expired', active=False)
        SubscriptionUsage.objects.filter(subscription_id__in=ids).update(subscription=None)
    return ids


def expiring_soon(hours=48):
    """Active subscriptions ending within the given window (for reminders)."""
    now = timezone.now()
    return UserSubscription.objects.filter(
        status='active',
        active=True,
        end_date__isnull=False,
        end_date__gt=now,
        end_date__lte=now + timedelta(hours=hours),
    )


def renew_subscription(subscription, payment_reference=None):
    """Roll a subscription forward by its plan duration and re-activate it."""
    plan = subscription.plan
    now = timezone.now()
    subscription.start_date = now
    subscription.end_date = now + timedelta(days=plan.duration_days)
    subscription.status = 'active'
    subscription.active = True
    if payment_reference:
        subscription.payment_reference = payment_reference
    subscription.save()
    return subscription