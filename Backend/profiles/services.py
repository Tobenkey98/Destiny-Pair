import re

from django.db import transaction
from django.utils.text import slugify
from django.utils import timezone

from .models import Denomination, PendingDenomination


class DenominationService:

    @staticmethod
    def normalize_name(name):
        name = (name or "").strip()
        name = re.sub(r'\s+', ' ', name)
        name = re.sub(r'[^\w\s\-\.\,\&\'\(\)]', '', name)
        return name

    @staticmethod
    def generate_slug(name):
        slug = slugify(name)
        if not slug:
            slug = "unknown"
        return slug

    @staticmethod
    def get_approved():
        return Denomination.objects.filter(
            approved=True, is_active=True
        ).order_by('name')

    @staticmethod
    def get_by_id(denomination_id):
        try:
            return Denomination.objects.get(id=denomination_id)
        except Denomination.DoesNotExist:
            return None

    @staticmethod
    def find_existing(name):
        normalized = DenominationService.normalize_name(name)
        if not normalized:
            return None
        slug = DenominationService.generate_slug(normalized)
        qs = Denomination.objects.filter(slug__iexact=slug)
        if qs.exists():
            return qs.first()
        qs2 = Denomination.objects.filter(name__iexact=normalized)
        if qs2.exists():
            return qs2.first()
        return None

    @staticmethod
    @transaction.atomic
    def create(name, created_by=None, approved=True):
        normalized = DenominationService.normalize_name(name)
        if not normalized:
            raise ValueError("Denomination name cannot be empty")
        existing = DenominationService.find_existing(normalized)
        if existing:
            return existing
        slug = DenominationService.generate_slug(normalized)
        obj = Denomination.objects.create(
            name=normalized,
            slug=slug,
            approved=approved,
            created_by=created_by,
        )
        return obj

    @staticmethod
    @transaction.atomic
    def create_pending(name, user=None):
        normalized = DenominationService.normalize_name(name)
        if not normalized:
            raise ValueError("Denomination name cannot be empty")
        existing_approved = DenominationService.find_existing(normalized)
        if existing_approved and existing_approved.approved:
            return existing_approved, False
        pending, created = PendingDenomination.objects.get_or_create(
            name__iexact=normalized,
            defaults={'name': normalized, 'user': user},
        )
        if not created:
            pending.name = normalized
            pending.user = user
            pending.save(update_fields=['name', 'user'])
        return pending, created

    @staticmethod
    @transaction.atomic
    def approve_pending(pending_id, reviewer):
        try:
            pending = PendingDenomination.objects.select_related('user').get(
                id=pending_id, approved=False
            )
        except PendingDenomination.DoesNotExist:
            return None, "PendingDenomination not found"
        existing = DenominationService.find_existing(pending.name)
        if existing:
            if not existing.approved:
                existing.approved = True
                existing.save(update_fields=['approved'])
            denomination = existing
        else:
            denomination = DenominationService.create(
                name=pending.name,
                created_by=pending.user,
                approved=True,
            )
        pending.approved = True
        pending.reviewed_by = reviewer
        pending.reviewed_at = timezone.now()
        pending.save(update_fields=['approved', 'reviewed_by', 'reviewed_at'])
        return denomination, None

    @staticmethod
    @transaction.atomic
    def reject_pending(pending_id, reviewer):
        try:
            pending = PendingDenomination.objects.get(
                id=pending_id, approved=False
            )
        except PendingDenomination.DoesNotExist:
            return None, "PendingDenomination not found"
        pending.reviewed_by = reviewer
        pending.reviewed_at = timezone.now()
        pending.save(update_fields=['reviewed_by', 'reviewed_at'])
        return pending, None

    @staticmethod
    def get_pending():
        return PendingDenomination.objects.filter(
            approved=False, reviewed_by__isnull=True
        ).order_by('-created_at')

    @staticmethod
    def get_all_pending():
        return PendingDenomination.objects.all().order_by('-created_at')
