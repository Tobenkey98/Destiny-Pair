"""Deactivate overdue subscriptions and reset usage counters.

Usage:  python manage.py expire_subscriptions [--reset-daily] [--reset-monthly]
"""

from django.core.management.base import BaseCommand

from subscriptions.services import expiry_service, quota_service


class Command(BaseCommand):
    help = 'Expire overdue subscriptions and optionally reset usage counters.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset-daily', action='store_true',
            help='Also reset daily counters (profile views, likes, saves).',
        )
        parser.add_argument(
            '--reset-monthly', action='store_true',
            help='Also reset monthly counters (messages, call minutes).',
        )

    def handle(self, *args, **options):
        expired = expiry_service.expire_overdue()
        self.stdout.write(self.style.SUCCESS(f'Expired {len(expired)} overdue subscription(s).'))

        if options['reset_daily']:
            from django.utils import timezone
            n = quota_service.reset_all_daily(timezone.localdate())
            self.stdout.write(self.style.SUCCESS(f'Reset daily counters for {n} row(s).'))

        if options['reset_monthly']:
            from django.utils import timezone
            n = quota_service.reset_all_monthly(timezone.localdate().replace(day=1))
            self.stdout.write(self.style.SUCCESS(f'Reset monthly counters for {n} row(s).'))