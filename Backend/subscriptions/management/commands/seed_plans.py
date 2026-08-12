"""Seed the four subscription plans (idempotent).

Usage:  python manage.py seed_plans
"""

from django.core.management.base import BaseCommand

from subscriptions.models import SubscriptionPlan


def plan_defaults():
    return {
        'free': dict(
            name='Free',
            slug='free',
            price=0,
            billing_cycle='monthly',
            description=(
                'The starting point: browse verified profiles and get to know '
                'the community before you commit.'
            ),
            message_limit=10,
            message_reset_period='daily',
            active_conversation_limit=3,
            audio_minutes_limit=0,
            video_minutes_limit=0,
            profile_view_limit_daily=20,
            like_limit_daily=5,
            save_limit_daily=3,
            can_use_advanced_filters=False,
            can_see_likes=False,
            can_see_visitors=False,
            can_send_voice_notes=False,
            can_use_read_receipts=False,
            can_appear_featured=False,
            can_use_profile_boost=False,
            discover_priority=0,
            free_counselling_sessions=0,
        ),
        'basic': dict(
            name='Basic',
            slug='basic',
            price=5500,
            billing_cycle='monthly',
            description=(
                'Unlimited messaging, more daily discovery, voice notes and '
                'audio calls with your matches.'
            ),
            message_limit=None,
            message_reset_period='monthly',
            active_conversation_limit=None,
            audio_minutes_limit=60,
            video_minutes_limit=0,
            profile_view_limit_daily=None,
            like_limit_daily=20,
            save_limit_daily=10,
            can_use_advanced_filters=True,
            can_see_likes=False,
            can_see_visitors=True,
            can_send_voice_notes=True,
            can_use_read_receipts=True,
            can_appear_featured=False,
            can_use_profile_boost=False,
            discover_priority=1,
            free_counselling_sessions=0,
        ),
        'premium': dict(
            name='Premium',
            slug='premium',
            price=10000,
            billing_cycle='monthly',
            description=(
                'The fullest experience: video calls, see who liked you, '
                'priority visibility and all premium features.'
            ),
            message_limit=None,
            message_reset_period='monthly',
            active_conversation_limit=None,
            audio_minutes_limit=300,
            video_minutes_limit=120,
            profile_view_limit_daily=None,
            like_limit_daily=None,
            save_limit_daily=30,
            can_use_advanced_filters=True,
            can_see_likes=True,
            can_see_visitors=True,
            can_send_voice_notes=True,
            can_use_read_receipts=True,
            can_appear_featured=True,
            can_use_profile_boost=True,
            discover_priority=2,
            free_counselling_sessions=1,
        ),
        'kingdom': dict(
            name='Kingdom',
            slug='kingdom',
            price=15000,
            billing_cycle='monthly',
            description=(
                'The signature plan: every perk of Premium plus free monthly '
                'counselling sessions and highest discovery priority.'
            ),
            message_limit=None,
            message_reset_period='monthly',
            active_conversation_limit=None,
            audio_minutes_limit=600,
            video_minutes_limit=240,
            profile_view_limit_daily=None,
            like_limit_daily=None,
            save_limit_daily=None,
            can_use_advanced_filters=True,
            can_see_likes=True,
            can_see_visitors=True,
            can_send_voice_notes=True,
            can_use_read_receipts=True,
            can_appear_featured=True,
            can_use_profile_boost=True,
            discover_priority=3,
            free_counselling_sessions=3,
        ),
    }


class Command(BaseCommand):
    help = 'Seed (or update) the four subscription plans.'

    def handle(self, *args, **options):
        defaults = plan_defaults()
        created, updated = 0, 0
        for slug, fields in defaults.items():
            fields = dict(fields)
            slug_value = fields.pop('slug')
            _, was_created = SubscriptionPlan.objects.update_or_create(
                slug=slug_value,
                defaults=fields,
            )
            if was_created:
                created += 1
            else:
                updated += 1
            self.stdout.write(self.style.SUCCESS(f'  plan {slug_value}: ok'))

        self.stdout.write(self.style.SUCCESS(
            f'Done — {created} created, {updated} updated.'
        ))