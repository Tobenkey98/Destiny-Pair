import re
from datetime import date

from .genotype_rules import get_genotype_compatibility, get_blood_group_status

WEIGHTS = {
    'religion': 25,
    'denomination': 10,
    'age': 15,
    'location': 10,
    'genotype': 15,
    'marital_status': 10,
    'education': 5,
    'occupation': 5,
    'lifestyle': 5,
}


def compute_compatibility(user_a, user_b):
    """
    Returns a full compatibility breakdown between two users.
    Score is 0-100 based on weighted criteria.
    """
    religion_score = _score_religion(user_a, user_b)
    denomination_score = _score_denomination(user_a, user_b)
    age_score = _score_age(user_a, user_b)
    location_score = _score_location(user_a, user_b)
    genotype_result = get_genotype_compatibility(user_a.genotype, user_b.genotype)
    genotype_score = genotype_result['genotype_score']
    marital_status_score = _score_marital_status(user_a, user_b)
    education_score = _score_education(user_a, user_b)
    occupation_score = _score_occupation(user_a, user_b)
    lifestyle_score = _score_lifestyle(user_a, user_b)

    total = (
        religion_score +
        denomination_score +
        age_score +
        location_score +
        genotype_score +
        marital_status_score +
        education_score +
        occupation_score +
        lifestyle_score
    )

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
