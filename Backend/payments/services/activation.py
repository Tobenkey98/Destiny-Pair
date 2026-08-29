"""Shared subscription activation used by the payment gateways.

Kept gateway-agnostic so individual gateway modules can be added/removed
without duplicating the activation logic.
"""

import logging
from datetime import timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)


def activate_paid_subscription(payment):
    """Activate (or renew) the user's subscription for the paid plan.

    Marks the payment completed, creates/renews the UserSubscription and
    resets the user's usage counters. Safe to call from the webhook handler
    and from the verify-payment endpoint.
    """
    from subscriptions.services import expiry_service, quota_service

    if payment.status != 'completed':
        payment.status = 'completed'
        payment.save(update_fields=['status'])

    plan = payment.plan
    user = payment.user
    now = timezone.now()

    subscription = payment.subscription
    if subscription is None:
        subscription = user.subscriptions.filter(
            plan=plan, status='active',
        ).order_by('-start_date').first()

    if subscription is None:
        from subscriptions.models import UserSubscription
        subscription = UserSubscription(
            user=user,
            plan=plan,
            start_date=now,
            end_date=now + timedelta(days=plan.duration_days),
            status='active',
            auto_renew=True,
        )
        subscription.save()
    else:
        expiry_service.renew_subscription(subscription, payment.reference)

    if payment.subscription_id != subscription.id:
        payment.subscription = subscription
        payment.save(update_fields=['subscription'])

    quota_service.reset_usage_for_user(user, plan=plan)
    logger.info('Subscription activated: user=%s plan=%s ref=%s',
                user.id, plan.slug, payment.reference)
    return subscription
