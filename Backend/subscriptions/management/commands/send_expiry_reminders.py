"""Send renewal reminders (email + in-app) for expiring subscriptions.

Usage:  python manage.py send_expiry_reminders [--hours 48]
"""

from django.core.management.base import BaseCommand

from subscriptions.services.reminders import run_expiry_reminders


class Command(BaseCommand):
    help = 'Remind subscribers whose plan expires within the window to renew.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours', type=int, default=48,
            help='Remind subscriptions ending within this many hours (default 48).',
        )

    def handle(self, *args, **options):
        count = run_expiry_reminders(hours=options['hours'])
        self.stdout.write(self.style.SUCCESS(
            f'Sent {count} expiry reminder(s) for the next {options["hours"]}h window.'
        ))