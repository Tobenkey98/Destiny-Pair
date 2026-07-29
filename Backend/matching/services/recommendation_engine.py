from datetime import timedelta
from collections import Counter

from django.db.models import Q
from django.utils import timezone

from matching.models import Match, ProfileView, SavedProfile
from .compatibility_engine import compute_compatibility


def get_personalized_recommendations(user, candidates_queryset):
    """
    Analyzes user behaviour and returns recommendations
    boosted by preference patterns. Rule-based, no AI.
    """
    preferences = _analyze_user_preferences(user)
    candidates = list(candidates_queryset)
    scored = []

    for candidate in candidates:
        base = compute_compatibility(user, candidate)
        boost = _calculate_boost(candidate, preferences)
        base['compatibility_score'] = min(base['compatibility_score'] + boost, 100)
        base['boost'] = boost
        base['user'] = candidate
        scored.append(base)

    scored.sort(key=lambda x: x['compatibility_score'], reverse=True)
    return scored


def _analyze_user_preferences(user):
    """
    Extracts preference patterns from the user's past behaviour.
    Returns a dict of liked characteristics with their frequencies.
    """
    preferences = {
        'faith': Counter(),
        'denomination': Counter(),
        'age_range': Counter(),
        'city_state': Counter(),
        'profession': Counter(),
        'highest_qualification': Counter(),
        'genotype': Counter(),
    }

    ninety_days_ago = timezone.now() - timedelta(days=90)

    liked_matches = Match.objects.filter(
        from_user=user,
        status__in=['liked', 'matched'],
        created_at__gte=ninety_days_ago
    ).select_related('to_user')

    for match in liked_matches:
        target = match.to_user
        if target.faith:
            preferences['faith'][target.faith] += 1
        if target.denomination:
            preferences['denomination'][target.denomination] += 1
        if target.city_state:
            preferences['city_state'][target.city_state] += 1
        if target.profession:
            preferences['profession'][target.profession] += 1
        if target.highest_qualification:
            preferences['highest_qualification'][target.highest_qualification] += 1
        if target.genotype:
            preferences['genotype'][target.genotype] += 1
        if target.date_of_birth:
            from datetime import date
            today = date.today()
            age = today.year - target.date_of_birth.year - (
                (today.month, today.day) < (target.date_of_birth.month, target.date_of_birth.day)
            )
            age_key = (age // 5) * 5
            preferences['age_range'][f'{age_key}-{age_key + 4}'] += 1

    viewed = ProfileView.objects.filter(
        viewer=user,
        created_at__gte=ninety_days_ago
    ).values_list('viewed_id', flat=True)

    viewed_users = Match.objects.filter(
        Q(from_user_id__in=viewed) | Q(to_user_id__in=viewed)
    )

    return preferences


def _calculate_boost(candidate, preferences):
    """
    Calculates a boost score (0-15) based on how well the
    candidate matches the user's demonstrated preferences.
    """
    boost = 0

    if candidate.faith and preferences['faith']:
        total = sum(preferences['faith'].values())
        freq = preferences['faith'].get(candidate.faith, 0)
        if total > 0 and freq / total > 0.3:
            boost += 4

    if candidate.city_state and preferences['city_state']:
        total = sum(preferences['city_state'].values())
        freq = preferences['city_state'].get(candidate.city_state, 0)
        if total > 0 and freq / total > 0.3:
            boost += 3

    if candidate.profession and preferences['profession']:
        total = sum(preferences['profession'].values())
        freq = preferences['profession'].get(candidate.profession, 0)
        if total > 0 and freq / total > 0.3:
            boost += 2

    if candidate.highest_qualification and preferences['highest_qualification']:
        total = sum(preferences['highest_qualification'].values())
        freq = preferences['highest_qualification'].get(candidate.highest_qualification, 0)
        if total > 0 and freq / total > 0.3:
            boost += 2

    if candidate.genotype and preferences['genotype']:
        total = sum(preferences['genotype'].values())
        freq = preferences['genotype'].get(candidate.genotype, 0)
        if total > 0 and freq / total > 0.3:
            boost += 2

    if candidate.date_of_birth and preferences['age_range']:
        from datetime import date
        today = date.today()
        age = today.year - candidate.date_of_birth.year - (
            (today.month, today.day) < (candidate.date_of_birth.month, candidate.date_of_birth.day)
        )
        age_key = f'{(age // 5) * 5}-{(age // 5) * 5 + 4}'
        total = sum(preferences['age_range'].values())
        freq = preferences['age_range'].get(age_key, 0)
        if total > 0 and freq / total > 0.3:
            boost += 2

    return min(boost, 15)
