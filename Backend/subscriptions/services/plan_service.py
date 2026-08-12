"""Plan resolution: which plan a user is effectively on, and feature flags."""

from subscriptions.models import SubscriptionPlan, UserSubscription

FREE_SLUG = 'free'

# Boolean feature fields on SubscriptionPlan that can be gated with
# @require_feature / can_<feature>(user).
FEATURE_FIELDS = (
    'can_use_advanced_filters',
    'can_see_likes',
    'can_see_visitors',
    'can_send_voice_notes',
    'can_use_read_receipts',
    'can_appear_featured',
    'can_use_profile_boost',
)


def get_default_plan():
    """The Free plan — the default tier for every registered user."""
    return SubscriptionPlan.objects.filter(slug=FREE_SLUG, is_active=True).first()


def get_plan(slug):
    return SubscriptionPlan.objects.filter(slug=slug, is_active=True).first()


def get_active_subscription(user):
    """The user's currently active subscription, if any."""
    return (
        UserSubscription.objects
        .filter(user=user, status='active', active=True)
        .select_related('plan')
        .order_by('-start_date')
        .first()
    )


def get_effective_plan(user):
    """The plan currently governing the user (falls back to Free)."""
    sub = get_active_subscription(user)
    if sub:
        return sub.plan
    default = get_default_plan()
    if default:
        return default
    return SubscriptionPlan(slug=FREE_SLUG, name='Free')


def get_effective_slug(user):
    return get_effective_plan(user).slug


def has_feature(user, feature_name):
    if feature_name not in FEATURE_FIELDS:
        raise ValueError(f'Unknown subscription feature: {feature_name}')
    return bool(getattr(get_effective_plan(user), feature_name, False))


def is_paid_subscriber(user):
    return get_effective_slug(user) != FREE_SLUG


def get_plan_for_user(user):
    sub = get_active_subscription(user)
    return (sub.plan if sub else get_default_plan())