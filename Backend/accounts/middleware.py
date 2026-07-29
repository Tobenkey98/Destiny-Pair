from .services.audit_service import AuditService
from .services.role_service import RoleService


class AdminActivityMiddleware:
    ADMIN_PATHS = ['/api/admin/']

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response

        if not self._is_admin_request(request):
            return response

        if not RoleService.user_is_any_admin(request.user):
            return response

        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return response

        self._log_admin_activity(request, response)

        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None

        if not RoleService.user_is_any_admin(request.user):
            return None

        if not self._is_admin_request(request):
            return None

        if request.user.admin_profile.role != 'super_admin':
            if getattr(view_func, 'is_super_admin_only', False):
                from django.http import JsonResponse
                return JsonResponse(
                    {'error': 'Super Admin access required.'},
                    status=403,
                )

        return None

    def _is_admin_request(self, request):
        path = request.path.lower()
        return any(path.startswith(prefix) for prefix in self.ADMIN_PATHS)

    def _log_admin_activity(self, request, response):
        try:
            action_type_map = {
                'POST': 'create',
                'PUT': 'update',
                'PATCH': 'update',
                'DELETE': 'delete',
            }

            action = f"{request.method} {request.path}"
            action_type = action_type_map.get(request.method, 'other')

            target_model = self._extract_target_model(request.path)

            AuditService.log(
                actor=request.user,
                action=action,
                action_type=action_type,
                target_model=target_model,
                request=request,
            )
        except Exception:
            pass

    def _extract_target_model(self, path):
        parts = [p for p in path.split('/') if p]
        if len(parts) >= 3:
            return parts[2].capitalize()
        return 'Admin'
