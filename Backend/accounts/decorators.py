from functools import wraps
from django.http import JsonResponse
from django.utils.decorators import available_attrs
from .services.role_service import RoleService


def admin_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required.'}, status=401)
        if not RoleService.user_is_any_admin(request.user):
            return JsonResponse({'error': 'Admin access required.'}, status=403)
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def require_super_admin(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required.'}, status=401)
        if not RoleService.user_has_role(request.user, 'super_admin'):
            return JsonResponse({'error': 'Super Admin access required.'}, status=403)
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def require_operations_admin(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required.'}, status=401)
        if not RoleService.user_has_role(request.user, 'operations_admin'):
            return JsonResponse({'error': 'Operations Admin access required.'}, status=403)
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def require_moderator(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required.'}, status=401)
        if not RoleService.user_has_role(request.user, 'moderator'):
            return JsonResponse({'error': 'Moderator access required.'}, status=403)
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def require_counsellor(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required.'}, status=401)
        if not RoleService.user_has_role(request.user, 'counsellor'):
            return JsonResponse({'error': 'Counsellor access required.'}, status=403)
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def require_role(*allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required.'}, status=401)
            for role in allowed_roles:
                if RoleService.user_has_role(request.user, role):
                    return view_func(request, *args, **kwargs)
            return JsonResponse(
                {'error': f'Required role(s): {", ".join(allowed_roles)}'},
                status=403,
            )
        return _wrapped_view
    return decorator


def prevent_privilege_escalation(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        user_role = RoleService.get_user_role(request.user)
        if user_role:
            target_role = kwargs.get('target_role', request.POST.get('role', ''))
            if target_role and not RoleService.is_higher_or_equal_role(user_role, target_role):
                return JsonResponse(
                    {'error': 'Cannot assign a role equal to or higher than your own.'},
                    status=403,
                )
        return view_func(request, *args, **kwargs)
    return _wrapped_view
