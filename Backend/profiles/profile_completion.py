from django.db.models import Q

REQUIRED_FIELDS = [
    "primary_photo",
    "date_of_birth",
    "gender",
    "state_of_residence",
    "marital_status",
    "denomination",
    "vibes",
    "hobbies",
    "languages",
    "describe_yourself",
    "what_you_seek",
    "preferred_age",
    "preferred_height",
    "preferred_weight",
    "preferred_locations",
    "genotype",
    "blood_group",
    "height",
    "weight",
]

# Mapping for frontend display or internal checks
FIELD_LABELS = {
    "primary_photo": "Primary profile photo",
    "date_of_birth": "Date of birth",
    "gender": "Gender",
    "state_of_residence": "State of residence",
    "marital_status": "Relationship status",
    "denomination": "Denomination",
    "vibes": "Vibes (select 1-5)",
    "hobbies": "Hobbies (select 1-7)",
    "languages": "Languages",
    "describe_yourself": "Describe yourself",
    "what_you_seek": "What you seek",
    "preferred_age": "Preferred age range",
    "preferred_height": "Preferred height range",
    "preferred_weight": "Preferred weight range",
    "preferred_locations": "Preferred locations",
    "genotype": "Genotype",
    "blood_group": "Blood group",
    "height": "Height",
    "weight": "Weight",
}

def _has_primary_photo(user):
    return user.photos.filter(is_primary=True).exists() or user.photos.exists()

def _check_field(user, field):
    """Return True if field is considered complete."""
    if field == "primary_photo":
        return _has_primary_photo(user)
    if field == "date_of_birth":
        return bool(user.date_of_birth)
    if field == "gender":
        return bool((user.gender or "").strip())
    if field == "state_of_residence":
        return bool((user.state_of_residence or "").strip())
    if field == "marital_status":
        return bool((user.marital_status or "").strip())
    if field == "denomination":
        return bool(user.denomination_id)
    if field == "vibes":
        try:
            count = user.vibes.filter(is_active=True).count()
            return 1 <= count <= 5
        except Exception:
            return False
    if field == "hobbies":
        # count hobbies_m2m
        try:
            qs = user.hobbies_m2m.filter(is_active=True)
            count = qs.count()
            return 1 <= count <= 7
        except Exception:
            return False
    if field == "languages":
        try:
            return user.languages_m2m.filter(is_active=True).exists()
        except Exception:
            return False
    if field == "describe_yourself":
        return bool((user.about_self or "").strip())
    if field == "what_you_seek":
        return bool((user.seeking_description or "").strip())
    if field == "preferred_age":
        min_a = user.preferred_age_min
        max_a = user.preferred_age_max
        if min_a is None or max_a is None:
            return False
        try:
            min_a = int(min_a); max_a = int(max_a)
        except Exception:
            return False
        if min_a < 18 or max_a < 18 or min_a > 80 or max_a > 80:
            return False
        return min_a <= max_a
    if field == "preferred_height":
        min_h = user.preferred_height_min
        max_h = user.preferred_height_max
        if min_h is None or max_h is None:
            return False
        try:
            min_h = int(min_h); max_h = int(max_h)
        except Exception:
            return False
        if min_h < 100 or max_h > 250 or min_h <= 0 or max_h <= 0:
            return False
        return min_h <= max_h
    if field == "preferred_weight":
        min_w = user.preferred_weight_min
        max_w = user.preferred_weight_max
        if min_w is None or max_w is None:
            return False
        try:
            min_w = int(min_w); max_w = int(max_w)
        except Exception:
            return False
        if min_w < 30 or max_w > 300 or min_w <= 0 or max_w <= 0:
            return False
        return min_w <= max_w
    if field == "preferred_locations":
        try:
            return user.preferred_locations.filter(is_active=True).exists()
        except Exception:
            return False
    if field == "genotype":
        return bool((user.genotype or "").strip())
    if field == "blood_group":
        return bool((user.blood_group or "").strip())
    if field == "height":
        # either height_cm or legacy height
        if getattr(user, 'height_cm', None) is not None:
            try:
                v = int(user.height_cm)
                return 100 <= v <= 250
            except Exception:
                return False
        # fallback to legacy height
        if getattr(user, 'height', None) is not None:
            try:
                v = int(user.height)
                return 100 <= v <= 250
            except Exception:
                return False
        return False
    if field == "weight":
        weight_val = getattr(user, 'weight_kg', None)
        if weight_val is not None:
            try:
                v = float(weight_val)
                return 30 <= v <= 300
            except Exception:
                return False
        legacy = getattr(user, 'weight', None)
        if legacy is not None:
            try:
                v = float(legacy)
                return 30 <= v <= 300
            except Exception:
                return False
        return False
    return False


def calculate_profile_completion(user):
    """
    Calculate profile completion dynamically.
    Returns dict with percentage, is_complete, missing_fields, completed_fields, total_fields
    """
    missing = []
    completed = []
    for field in REQUIRED_FIELDS:
        if _check_field(user, field):
            completed.append(field)
        else:
            missing.append(field)

    total = len(REQUIRED_FIELDS)
    done = len(completed)
    percentage = int(round((done / total) * 100)) if total else 100
    is_complete = len(missing) == 0

    # Optionally update cached flag without manual trigger elsewhere
    # Keep is_profile_completed in sync but don't rely on it for checks
    try:
        if user.is_profile_completed != is_complete:
            # Avoid recursion / signals; update quietly if needed
            # We don't save here automatically to avoid side effects in read operations
            # Caller can decide to persist; but we can offer helper
            pass
    except Exception:
        pass

    return {
        "percentage": percentage,
        "is_complete": is_complete,
        "missing_fields": missing,
        "completed_fields": completed,
        "total_fields": total,
        "completed_count": done,
    }

def is_profile_complete(user):
    """Reusable check for access control. Returns True only if 100% complete."""
    result = calculate_profile_completion(user)
    return result["is_complete"]

def get_missing_field_labels(user):
    result = calculate_profile_completion(user)
    return [FIELD_LABELS.get(f, f) for f in result["missing_fields"]]


def sync_profile_completed_flag(user):
    """Sync the cached ``is_profile_completed`` flag from the dynamic result.

    The dynamic calculation remains the source of truth; this only keeps the
    DB flag fresh for quick checks, admin views and analytics. Returns the
    calculation result dict.
    """
    result = calculate_profile_completion(user)
    try:
        if user.is_profile_completed != result["is_complete"]:
            type(user).objects.filter(pk=user.pk).update(
                is_profile_completed=result["is_complete"]
            )
            user.is_profile_completed = result["is_complete"]
    except Exception:
        pass
    return result
