"""Remove test data so the live database holds only real activity.

Deletes every non-admin user except explicitly kept ones (plus anything tied
to them: payments, chat conversations, chatbot history, pending denomination
suggestions; matches, messages, subscriptions, photos, reports and other
CASCADE-linked rows go with the user automatically). Admin accounts,
subscription plans, denominations, testimonials and audit history are never
touched.

Examples:
    # See what would go, deleting nothing:
    python manage.py clear_test_data --keep-email real1@x.com --keep-email real2@y.com

    # Actually delete (keeps the two real users + all admins):
    python manage.py clear_test_data --keep-email real1@x.com --keep-email real2@y.com --confirm

    # Additionally keep anyone who joined on/after a date:
    python manage.py clear_test_data --keep-joined-since 2026-09-09 --confirm
"""

from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone


class Command(BaseCommand):
    help = "Delete test users and their data, keeping admins and kept real users."

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-email',
            action='append',
            default=[],
            help="Email of a real user to keep. Repeatable.",
        )
        parser.add_argument(
            '--keep-joined-since',
            default=None,
            help="Keep non-admin users who joined on/after YYYY-MM-DD.",
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help="Without this flag the command only reports (dry run).",
        )

    def handle(self, *args, **options):
        from chat.models import Conversation
        from chatbot.models import BotConversation, BotFeedback, BotTicket
        from payments.models import Payment
        from profiles.models import PendingDenomination

        User = get_user_model()

        keep_emails = {(e or '').strip().lower() for e in options['keep_email'] if (e or '').strip()}
        keep_since = None
        if options['keep_joined_since']:
            try:
                naive = datetime.strptime(options['keep_joined_since'], '%Y-%m-%d')
                keep_since = timezone.make_aware(naive) if timezone.is_naive(naive) else naive
            except ValueError:
                raise CommandError("--keep-joined-since must be YYYY-MM-DD")

        admins = User.objects.filter(admin_profile__isnull=False)
        admin_ids = set(admins.values_list('id', flat=True))

        candidates = User.objects.filter(admin_profile__isnull=True)
        kept_ids = set()
        for u in candidates.only('id', 'email', 'date_joined'):
            if (u.email or '').lower() in keep_emails:
                kept_ids.add(u.id)
            elif keep_since and u.date_joined and u.date_joined >= keep_since:
                kept_ids.add(u.id)
        removed_ids = set(candidates.values_list('id', flat=True)) - kept_ids

        payments = Payment.objects.filter(user_id__in=removed_ids).count()
        bot_convos = BotConversation.objects.filter(user_id__in=removed_ids).count()
        bot_loose = (
            BotTicket.objects.filter(user_id__in=removed_ids).count()
            + BotFeedback.objects.filter(user_id__in=removed_ids).count()
        )
        pending_denoms = PendingDenomination.objects.filter(user_id__in=removed_ids).count()
        touched_convos = Conversation.objects.filter(participants__in=removed_ids).distinct()
        drop_convos = 0
        for c in touched_convos.only('id'):
            member_ids = set(c.participants.values_list('id', flat=True))
            if not member_ids <= (kept_ids | admin_ids):
                drop_convos += 1

        self.stdout.write(f"Admins (always kept): {admins.count()}")
        self.stdout.write(f"Real users kept: {len(kept_ids)}")
        self.stdout.write(f"Test users to delete: {len(removed_ids)}")
        self.stdout.write(f"  payments: {payments}, chatbot conversations: {bot_convos}, "
                          f"loose bot tickets/feedback: {bot_loose}, "
                          f"pending denominations: {pending_denoms}, "
                          f"chat conversations: {drop_convos}")

        if not options['confirm']:
            self.stdout.write(self.style.WARNING("Dry run — nothing deleted. Re-run with --confirm to execute."))
            return

        if not removed_ids:
            self.stdout.write(self.style.SUCCESS("Nothing to delete."))
            return

        with transaction.atomic():
            Payment.objects.filter(user_id__in=removed_ids).delete()
            BotConversation.objects.filter(user_id__in=removed_ids).delete()
            BotTicket.objects.filter(user_id__in=removed_ids).delete()
            BotFeedback.objects.filter(user_id__in=removed_ids).delete()
            PendingDenomination.objects.filter(user_id__in=removed_ids).delete()
            for c in Conversation.objects.filter(participants__in=removed_ids).distinct():
                member_ids = set(c.participants.values_list('id', flat=True))
                if not member_ids <= (kept_ids | admin_ids):
                    c.delete()
            n_objects, details = User.objects.filter(id__in=removed_ids).delete()
            n_users = details.get(User._meta.label, 0)

        self.stdout.write(self.style.SUCCESS(
            f"Deleted {n_users} test users ({n_objects} rows including their payments, "
            f"conversations, chatbot history and pending suggestions). "
            f"Kept {admins.count()} admins and {len(kept_ids)} real users."
        ))
