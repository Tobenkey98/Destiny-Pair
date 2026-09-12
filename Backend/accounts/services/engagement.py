"""Login-time engagement nudges (best-effort, rate-limited).

Evaluated whenever a member signs in (email or social login). Each nudge
type fires at most once per NUDGE_TTL per user, and every failure mode is
swallowed so sign-in can never break because of a reminder email.
"""

import logging

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

NUDGE_TTL = 3 * 24 * 3600


def _display_name(user):
    return (user.first_name or user.username or user.email or 'there').strip()


def _once(key):
    try:
        if cache.get(key):
            return False
        cache.set(key, 1, NUDGE_TTL)
        return True
    except Exception:
        return False


def _send(subject, user, template, context):
    try:
        html_message = render_to_string(template, context)
        send_mail(
            subject,
            strip_tags(html_message),
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            html_message=html_message,
        )
    except Exception:
        logger.exception('Engagement nudge "%s" failed for %s', subject, user.email)


def profile_is_complete(user):
    required = [
        user.date_of_birth,
        user.gender,
        user.state_of_residence,
        user.about_self,
        user.profession,
    ]
    return all(bool(v) for v in required)


def has_photos(user):
    from profiles.models import CoverPhoto, Photo
    return (
        Photo.objects.filter(user=user).exists()
        and CoverPhoto.objects.filter(user=user).exists()
    )


def maybe_send_engagement_nudges(user):
    """Fire any due reminders for a freshly signed-in member. Never raises."""
    try:
        if not user or not getattr(user, 'email', None):
            return
        if hasattr(user, 'admin_profile'):
            return
        name = _display_name(user)

        if not profile_is_complete(user) and _once(f'engagement:profile:{user.id}'):
            _send(
                'Complete your DestinyPair profile',
                user,
                'accounts/engagement_profile.html',
                {
                    'recipient_name': name,
                    'profile_url': f'{settings.FRONTEND_URL}/dashboard/profile',
                },
            )

        if not has_photos(user) and _once(f'engagement:photos:{user.id}'):
            _send(
                'Add your photos to start connecting \u2014 DestinyPair',
                user,
                'matching/photo_reminder_email.html',
                {
                    'recipient_name': name,
                    'upload_url': f'{settings.FRONTEND_URL}/dashboard/profile',
                },
            )

        from subscriptions.services import plan_service
        if not plan_service.is_paid_subscriber(user) and _once(f'engagement:subscribe:{user.id}'):
            plan = plan_service.get_effective_plan(user)
            _send(
                'Unlock the full DestinyPair experience',
                user,
                'accounts/engagement_subscribe.html',
                {
                    'recipient_name': name,
                    'plan_name': getattr(plan, 'name', 'Free'),
                    'membership_url': f'{settings.FRONTEND_URL}/membership',
                },
            )
    except Exception:
        logger.exception('Engagement nudges failed for user %s', getattr(user, 'id', '?'))
