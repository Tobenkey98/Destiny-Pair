import re
from datetime import date

from .genotype_rules import get_genotype_compatibility, get_blood_group_status

WEIGHTS = {
    'religion': 20,
    'denomination': 8,
    'age': 12,
    'location': 8,
    'genotype': 12,
    'marital_status': 8,
    'education': 4,
    'occupation': 4,
    'lifestyle': 4,
    'vibes': 5,
    'hobbies': 5,
    'languages': 3,
    'height': 4,
    'weight': 3,
}


def compute_compatibility(user_a, user_b):
    """
    Returns a full compatibility breakdown between two users.
    Score is 0-100 based on weighted criteria including new normalized fields.
    """
    religion_score = _score_religion(user_a, user_b)
    denomination_score = _score_denomination(user_a, user_b)
    age_score = _score_age(user_a, user_b)
    # Legacy location + new preferred locations scoring
    location_score = _score_location(user_a, user_b)
    preferred_location_score = _score_preferred_locations(user_a, user_b)
    # Combine location signals
    location_score = min(location_score + preferred_location_score, WEIGHTS['location'] + 2)
    genotype_result = get_genotype_compatibility(user_a.genotype, user_b.genotype)
    genotype_score = genotype_result['genotype_score']
    marital_status_score = _score_marital_status(user_a, user_b)
    education_score = _score_education(user_a, user_b)
    occupation_score = _score_occupation(user_a, user_b)
    lifestyle_score = _score_lifestyle(user_a, user_b)
    vibes_score = _score_vibes(user_a, user_b)
    hobbies_score = _score_hobbies(user_a, user_b)
    languages_score = _score_languages(user_a, user_b)
    height_score = _score_height(user_a, user_b)
    weight_score = _score_weight(user_a, user_b)

    total = (
        religion_score +
        denomination_score +
        age_score +
        location_score +
        genotype_score +
        marital_status_score +
        education_score +
        occupation_score +
        lifestyle_score +
        vibes_score +
        hobbies_score +
        languages_score +
        height_score +
        weight_score
    )
    total = min(total, 100)

    blood_group_status = get_blood_group_status(user_a.blood_group, user_b.blood_group)

    return {
        'user_id': user_b.id,
        'compatibility_score': total,
        'religion_score': religion_score,
        'denomination_score': denomination_score,
        'age_score': age_score,
        'location_score': location_score,
        'genotype_score': genotype_score,
        'genotype_status': genotype_result['status'],
        'marital_status_score': marital_status_score,
        'education_score': education_score,
        'occupation_score': occupation_score,
        'lifestyle_score': lifestyle_score,
        'vibes_score': vibes_score,
        'hobbies_score': hobbies_score,
        'languages_score': languages_score,
        'height_score': height_score,
        'weight_score': weight_score,
        'blood_group_status': blood_group_status['blood_group_status'],
        'recommendation_level': _recommendation_level(total),
    }


def _score_religion(user_a, user_b):
    if not user_a.faith or not user_b.faith:
        return 0
    if user_a.faith.lower() == user_b.faith.lower():
        return WEIGHTS['religion']
    return 0


def _score_denomination(user_a, user_b):
    if not user_a.denomination_id or not user_b.denomination_id:
        return 0
    if user_a.denomination_id == user_b.denomination_id:
        return WEIGHTS['denomination']
    return 0


def _score_age(user_a, user_b):
    if not user_a.date_of_birth or not user_b.date_of_birth:
        return 0
    age_a = _age_from_dob(user_a.date_of_birth)
    age_b = _age_from_dob(user_b.date_of_birth)
    diff = abs(age_a - age_b)
    if diff <= 3:
        return WEIGHTS['age']
    elif diff <= 7:
        return 10
    elif diff <= 10:
        return 5
    return 0


def _score_location(user_a, user_b):
    score = 0
    if user_a.city_state and user_b.city_state:
        if user_a.city_state.lower() == user_b.city_state.lower():
            score += 5

    if user_a.state_of_residence and user_b.state_of_residence:
        if user_a.state_of_residence.lower() == user_b.state_of_residence.lower():
            score += 5
    elif user_a.state_of_residence and user_b.state_of_origin:
        if user_a.state_of_residence.lower() == user_b.state_of_origin.lower():
            score += 3

    return min(score, WEIGHTS['location'])


def _score_marital_status(user_a, user_b):
    if not user_a.marital_status or not user_b.marital_status:
        return 0
    if user_a.marital_status.lower() == user_b.marital_status.lower():
        return WEIGHTS['marital_status']
    return 0


def _score_education(user_a, user_b):
    if not user_a.highest_qualification or not user_b.highest_qualification:
        return 0
    if user_a.highest_qualification.lower() == user_b.highest_qualification.lower():
        return WEIGHTS['education']
    return 2


def _score_occupation(user_a, user_b):
    if not user_a.profession or not user_b.profession:
        return 0
    if user_a.profession.lower() == user_b.profession.lower():
        return WEIGHTS['occupation']
    return 0


def _score_lifestyle(user_a, user_b):
    score = 0
    a_interests = _parse_list(user_a.interests)
    b_interests = _parse_list(user_b.interests)
    if a_interests and b_interests:
        common = a_interests & b_interests
        score += min(len(common) * 2, 3)

    a_hobbies = _parse_list(user_a.hobbies)
    b_hobbies = _parse_list(user_b.hobbies)
    if a_hobbies and b_hobbies:
        common = a_hobbies & b_hobbies
        score += min(len(common) * 2, 2)

    return min(score, WEIGHTS['lifestyle'])


def _score_vibes(a, b):
    try:
        a_ids = set(a.vibes.filter(is_active=True).values_list('id', flat=True))
        b_ids = set(b.vibes.filter(is_active=True).values_list('id', flat=True))
        if not a_ids or not b_ids:
            return 0
        common = a_ids & b_ids
        return min(len(common) * 2, WEIGHTS['vibes'])
    except Exception:
        return 0

def _score_hobbies(a, b):
    try:
        a_ids = set(a.hobbies_m2m.filter(is_active=True).values_list('id', flat=True))
        b_ids = set(b.hobbies_m2m.filter(is_active=True).values_list('id', flat=True))
        # Fallback to legacy text parsing if M2M empty
        if not a_ids:
            a_ids = _parse_list(a.hobbies)
            b_ids = _parse_list(b.hobbies) if not b_ids else b_ids
            if a_ids and b_ids:
                common = a_ids & b_ids
                return min(len(common), WEIGHTS['hobbies'])
            return 0
        if not a_ids or not b_ids:
            return 0
        common = a_ids & b_ids
        return min(len(common) * 2, WEIGHTS['hobbies'])
    except Exception:
        return 0

def _score_languages(a, b):
    try:
        a_ids = set(a.languages_m2m.filter(is_active=True).values_list('id', flat=True))
        b_ids = set(b.languages_m2m.filter(is_active=True).values_list('id', flat=True))
        if not a_ids or not b_ids:
            return 0
        common = a_ids & b_ids
        return min(len(common) * 1, WEIGHTS['languages'])
    except Exception:
        return 0

def _score_height(a, b):
    try:
        a_h = getattr(a, 'height_cm', None) or getattr(a, 'height', None)
        b_h = getattr(b, 'height_cm', None) or getattr(b, 'height', None)
        if not a_h or not b_h:
            return 0
        a_h = int(a_h); b_h = int(b_h)
        # Check if each fits other's preferred range
        score = 0
        if a.preferred_height_min and a.preferred_height_max and a.preferred_height_min <= b_h <= a.preferred_height_max:
            score += 2
        if b.preferred_height_min and b.preferred_height_max and b.preferred_height_min <= a_h <= b.preferred_height_max:
            score += 2
        return min(score, WEIGHTS['height'])
    except Exception:
        return 0

def _score_weight(a, b):
    try:
        a_w = getattr(a, 'weight_kg', None) or getattr(a, 'weight', None)
        b_w = getattr(b, 'weight_kg', None) or getattr(b, 'weight', None)
        if not a_w or not b_w:
            return 0
        a_w = float(a_w); b_w = float(b_w)
        score = 0
        if a.preferred_weight_min and a.preferred_weight_max and a.preferred_weight_min <= b_w <= a.preferred_weight_max:
            score += 1
        if b.preferred_weight_min and b.preferred_weight_max and b.preferred_weight_min <= a_w <= b.preferred_weight_max:
            score += 2
        return min(score, WEIGHTS['weight'])
    except Exception:
        return 0

def _score_preferred_locations(a, b):
    try:
        a_locs = set(a.preferred_locations.filter(is_active=True).values_list('id', flat=True))
        b_locs = set(b.preferred_locations.filter(is_active=True).values_list('id', flat=True))
        if not a_locs or not b_locs:
            return 0
        # Direct overlap in preferred locations is a strong signal
        if a_locs & b_locs:
            return 2
        # Check if each user's actual location is in other's preferences
        # Simplified: if state_of_residence matches any preferred location name
        a_state = (a.state_of_residence or "").strip().lower()
        b_state = (b.state_of_residence or "").strip().lower()
        a_pref_names = {n.lower() for n in a.preferred_locations.values_list('name', flat=True)}
        b_pref_names = {n.lower() for n in b.preferred_locations.values_list('name', flat=True)}
        score = 0
        if b_state and b_state in a_pref_names: score += 1
        if a_state and a_state in b_pref_names: score += 1
        # Handle Anywhere / Outside special categories
        if "anywhere in nigeria" in a_pref_names or "anywhere in nigeria" in b_pref_names:
            score += 1
        return min(score, 2)
    except Exception:
        return 0

def _age_from_dob(dob):
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _parse_list(text):
    if not text:
        return set()
    items = re.split(r'[,;|\n]+', text)
    return {i.strip().lower() for i in items if i.strip()}


def _recommendation_level(score):
    if score >= 90:
        return 'Excellent Match'
    elif score >= 75:
        return 'Strong Match'
    elif score >= 60:
        return 'Good Match'
    elif score >= 40:
        return 'Moderate Match'
    return 'Low Match'
