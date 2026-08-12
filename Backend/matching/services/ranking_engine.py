from .compatibility_engine import compute_compatibility


def rank_candidates(user, candidates):
    """
    Takes a user and a queryset of candidate users.
    Returns a list of dicts sorted by compatibility score descending.
    Uses select_related/prefetch_related to avoid N+1 queries.
    """
    if not candidates:
        return []

    candidates = candidates.select_related('denomination').prefetch_related('photos')

    results = []
    for candidate in candidates:
        score_data = compute_compatibility(user, candidate)
        score_data['user'] = candidate
        results.append(score_data)

    results.sort(key=lambda x: x['compatibility_score'], reverse=True)
    return results
