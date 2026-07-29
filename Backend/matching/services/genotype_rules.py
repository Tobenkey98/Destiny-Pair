GENOTYPE_SCORES = {
    ('AA', 'AA'): 15,
    ('AA', 'AS'): 15,
    ('AA', 'AC'): 15,
    ('AS', 'AA'): 15,
    ('AS', 'AS'): 5,
    ('AS', 'SS'): 0,
    ('SS', 'AS'): 0,
    ('SS', 'SS'): 0,
    ('SC', 'SC'): 0,
    ('AC', 'AA'): 15,
    ('AC', 'AC'): 5,
    ('AC', 'AS'): 5,
    ('AC', 'SS'): 0,
    ('AC', 'SC'): 0,
    ('SC', 'AC'): 0,
}

GENOTYPE_STATUS = {
    15: 'Highly Compatible',
    5: 'Moderately Compatible',
    0: 'Incompatible',
}


def get_genotype_compatibility(genotype_a, genotype_b):
    if not genotype_a or not genotype_b:
        return {'genotype_score': 0, 'status': 'Unknown'}
    key = (genotype_a.upper().strip(), genotype_b.upper().strip())
    score = GENOTYPE_SCORES.get(key, 0)
    return {
        'genotype_score': score,
        'status': GENOTYPE_STATUS.get(score, 'Unknown'),
    }


BLOOD_GROUP_COMPATIBILITY = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-'],
}


def get_blood_group_status(blood_group_a, blood_group_b):
    if not blood_group_a or not blood_group_b:
        return {'blood_group_status': 'Unknown'}
    compatible = BLOOD_GROUP_COMPATIBILITY.get(blood_group_a.upper().strip(), [])
    if blood_group_b.upper().strip() in compatible:
        return {'blood_group_status': 'Compatible'}
    return {'blood_group_status': 'Incompatible (informational only)'}
