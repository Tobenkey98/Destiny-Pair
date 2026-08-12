"""Permission decorators for subscription-gated actions.

Usage::

    @require_subscription(('basic', 'premium', 'kingdom'))
    def post(self, request, ...): ...

    @require_feature('can_send_voice_notes')
    def post(self, request, ...): ...

The decorators return 403 with a structured body when the user's effective
plan does not satisfy the requirement.
"""

from functools import wraps

from rest_framework import status
from rest_framework.response import Response

from subscriptions.services import plan_service


def require_subscription(allowed_slugs):
    """Allow only users whose effective plan is in ``allowed_slugs``."""
    allowed = set(allowed_slugs)

    def decorator(view_func):
        @wraps(view_func)
        def wrapped(view, request, *args, **kwargs):
            plan = plan_service.get_effective_plan(request.user)
            if plan.slug not in allowed:
                return Response(
                    {
                        'error': 'SUBSCRIPTION_REQUIRED',
                        'detail': f'This action requires a paid plan: {", ".join(sorted(allowed))}.',
                        'required_slugs': sorted(allowed),
                        'current_slug': plan.slug,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            return view_func(view, request, *args, **kwargs)
        return wrapped
    return decorator


def require_feature(feature_name):
    """Allow only users whose effective plan grants ``feature_name``."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapped(view, request, *args, **kwargs):
            if not plan_service.has_feature(request.user, feature_name):
                plan = plan_service.get_effective_plan(request.user)
                return Response(
                    {
                        'error': 'FEATURE_REQUIRED',
                        'detail': f'This action requires the {feature_name} feature.',
                        'feature': feature_name,
                        'current_slug': plan.slug,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            return view_func(view, request, *args, **kwargs)
        return wrapped
    return decorator