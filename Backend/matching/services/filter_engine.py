from django.db.models import Q, Exists, OuterRef
from django.contrib.auth import get_user_model
from django.utils import timezone

from matching.models import Match
from subscriptions.models import UserSubscription

User = get_user_model()


def get_qualified_candidates(user):
    """
    Returns a queryset of users who pass all hard filters
    for the given user. Excludes the user themself.
    """
    qs = User.objects.filter(
        is_verified=True,
        is_active=True,
        is_banned=False,
    ).exclude(id=user.id)

    qs = _exclude_same_gender(qs, user)
    qs = _exclude_existing_matches(qs, user)
    qs = _exclude_blocked_or_rejected(qs, user)
    qs = _exclude_expired_subscriptions(qs)
    qs = _apply_religion_filter(qs, user)

    # The remaining preference filters (denomination, age range, state,
    # marital status, genotype, education, occupation) are deliberately NOT
    # applied as hard filters here. They feed into the compatibility score
    # (see compatibility_engine) so that nearby-but-not-perfect matches still
    # appear; hard exclusions would empty Discover for a small user base.

    return qs.distinct()


def _exclude_same_gender(qs, user):
    if user.gender:
        qs = qs.exclude(gender=user.gender)
    return qs


def _exclude_existing_matches(qs, user):
    matched_ids = Match.objects.filter(
        Q(from_user=user) | Q(to_user=user)
    ).values('from_user_id', 'to_user_id')

    exclude_ids = set()
    for m in matched_ids:
        if m['from_user_id'] == user.id:
            exclude_ids.add(m['to_user_id'])
        else:
            exclude_ids.add(m['from_user_id'])

    return qs.exclude(id__in=exclude_ids)


def _exclude_blocked_or_rejected(qs, user):
    rejected_ids = Match.objects.filter(
        Q(from_user=user, status='rejected') | Q(to_user=user, status='rejected')
    ).values('from_user_id', 'to_user_id')

    exclude_ids = set()
    for m in rejected_ids:
        if m['from_user_id'] == user.id:
            exclude_ids.add(m['to_user_id'])
        else:
            exclude_ids.add(m['from_user_id'])

    return qs.exclude(id__in=exclude_ids)


def _exclude_expired_subscriptions(qs):
    now = timezone.now()
    expired_user_ids = UserSubscription.objects.filter(
        active=False, end_date__lt=now
    ).values_list('user_id', flat=True)
    return qs.exclude(id__in=expired_user_ids)


def _apply_religion_filter(qs, user):
    if user.faith:
        qs = qs.filter(faith__iexact=user.faith)
    return qs


def _apply_denomination_filter(qs, user):
    if user.denomination_id:
        qs = qs.filter(
            Q(denomination_id=user.denomination_id) |
            Q(denomination__isnull=True)
        )
    return qs


def _apply_age_range_filter(qs, user):
    from datetime import date
    today = date.today()

    if user.preferred_age_min:
        min_birth_year = today.year - user.preferred_age_max
        qs = qs.filter(date_of_birth__year__lte=min_birth_year)

    if user.preferred_age_max:
        max_birth_year = today.year - user.preferred_age_min
        qs = qs.filter(date_of_birth__year__gte=max_birth_year)

    return qs


def _apply_state_preference_filter(qs, user):
    if user.state_of_residence:
        qs = qs.filter(
            Q(state_of_residence__iexact=user.state_of_residence) |
            Q(state_of_origin__iexact=user.state_of_residence)
        )
    return qs


def _apply_marital_status_filter(qs, user):
    if user.marital_status == 'single':
        qs = qs.filter(
            Q(marital_status='single') | Q(marital_status='')
        )
    return qs


def _apply_genotype_filter(qs, user):
    if user.genotype:
        qs = qs.filter(
            Q(genotype__iexact=user.genotype) |
            Q(genotype='')
        )
    return qs


def _apply_education_filter(qs, user):
    if user.highest_qualification:
        qs = qs.filter(
            Q(highest_qualification__iexact=user.highest_qualification) |
            Q(highest_qualification='')
        )
    return qs


def _apply_occupation_filter(qs, user):
    if user.profession:
        qs = qs.filter(
            Q(profession__iexact=user.profession) |
            Q(profession='')
        )
    return qs
