"""Transactional emails for likes and matches.

Every like notifies the recipient by email, and both sides are emailed the
moment a mutual match forms. Sending is best-effort: failures are logged but
never block the like/match request. Emails are sent synchronously (same
pattern as the verification email) so nothing depends on a broker.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _display_name(user):
    return (user.first_name or user.username or user.email or 'Someone').strip()


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


def send_like_email(liker, liked):
    """Email the person who received a like (sent for every single like)."""
    if liked.id == liker.id:
        return
    _send(
        'You have a new admirer on DestinyPair \u2764',
        liked.email,
        'matching/like_email.html',
        {
            'recipient_name': _display_name(liked),
            'sender_name': _display_name(liker),
            'profile_url': f'{settings.FRONTEND_URL}/dashboard/discover',
        },
    )


def send_match_email(match_a, match_b):
    """Email both users immediately when a mutual match forms."""
    if match_a.id == match_b.id:
        return
    _send(
        'It\u2019s a match! \u2764 \u2014 DestinyPair',
        match_a.email,
        'matching/match_email.html',
        {
            'recipient_name': _display_name(match_a),
            'other_name': _display_name(match_b),
            'chat_url': f'{settings.FRONTEND_URL}/dashboard/chat',
        },
    )
    _send(
        'It\u2019s a match! \u2764 \u2014 DestinyPair',
        match_b.email,
        'matching/match_email.html',
        {
            'recipient_name': _display_name(match_b),
            'other_name': _display_name(match_a),
            'chat_url': f'{settings.FRONTEND_URL}/dashboard/chat',
        },
    )