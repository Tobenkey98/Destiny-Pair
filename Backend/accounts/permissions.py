from rest_framework.permissions import BasePermission, IsAuthenticated
from .services.role_service import RoleService


class IsAuthenticatedAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_active:
            return False
        return RoleService.user_is_any_admin(request.user)


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return RoleService.user_has_role(request.user, 'super_admin')


class IsOperationsAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return RoleService.user_has_role(request.user, 'operations_admin')


class IsModerator(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return RoleService.user_has_role(request.user, 'moderator')


class IsCounsellor(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return RoleService.user_has_role(request.user, 'counsellor')


class IsSuperAdminOrOperationsAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            RoleService.user_has_role(request.user, 'super_admin') or
            RoleService.user_has_role(request.user, 'operations_admin')
        )


class IsSuperAdminOrModerator(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            RoleService.user_has_role(request.user, 'super_admin') or
            RoleService.user_has_role(request.user, 'moderator')
        )


class IsSuperAdminOrCounsellor(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            RoleService.user_has_role(request.user, 'super_admin') or
            RoleService.user_has_role(request.user, 'counsellor')
        )


class IsSuperAdminOrOperationsAdminOrModerator(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            RoleService.user_has_role(request.user, 'super_admin') or
            RoleService.user_has_role(request.user, 'operations_admin') or
            RoleService.user_has_role(request.user, 'moderator')
        )


class HasRole(BasePermission):
    allowed_roles = []

    def __init__(self, roles=None):
        if roles is not None:
            self.allowed_roles = roles

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return any(
            RoleService.user_has_role(request.user, role)
            for role in self.allowed_roles
        )


class IsAdminAndActive(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_active:
            return False
        if not hasattr(request.user, 'admin_profile'):
            return False
        return request.user.admin_profile.is_active
