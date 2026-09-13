"""Transactional emails for subscriptions (renewal reminders)."""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _display_name(user):
    return (user.first_name or user.username or user.email or 'There').strip()


def _send(subject, recipient_email, template, context):
    if not recipient_email:
        return
    try:
        html_message = render_to_string(template, context)
        plain_message = strip_tags(html_message)
        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [recipient_email],
            html_message=html_message,
        )
        logger.info('Email "%s" sent to %s', subject, recipient_email)
    except Exception:
        logger.exception('Failed to send "%s" to %s', subject, recipient_email)


def send_expiry_reminder_email(subscription):
    """Branded reminder to a subscriber whose plan ends within 48h."""
    user = subscription.user
    if not user.email:
        return
    _send(
        f'Your {subscription.plan.name} membership expiring soon \u2014 renew now \u2764',
        user.email,
        'subscriptions/expiry_reminder_email.html',
        {
            'recipient_name': _display_name(user),
            'plan_name': subscription.plan.name,
            'expiry_date': subscription.end_date.strftime('%d %b %Y'),
            'renew_url': f'{settings.FRONTEND_URL}/membership',
        },
    )