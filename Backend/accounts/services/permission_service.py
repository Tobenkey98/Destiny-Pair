from .role_service import RoleService


class PermissionService:

    @staticmethod
    def can_access_module(user, module):
        role = RoleService.get_user_role(user)
        if role is None:
            return False

        access_map = {
            'super_admin': PermissionService._super_admin_modules(),
            'operations_admin': PermissionService._operations_admin_modules(),
            'moderator': PermissionService._moderator_modules(),
            'counsellor': PermissionService._counsellor_modules(),
        }

        return module in access_map.get(role, [])

    @staticmethod
    def can_perform_action(user, action, resource=None):
        role = RoleService.get_user_role(user)

        if role == 'super_admin':
            return True

        if resource == 'payment' and role != 'operations_admin':
            return False

        if resource == 'subscription' and role != 'operations_admin':
            return False

        if resource == 'audit_log' and role != 'super_admin':
            return False

        if resource == 'role_management' and role != 'super_admin':
            return False

        if resource == 'system_settings' and role != 'super_admin':
            return False

        if resource == 'photo_approval' and role not in ('moderator', 'super_admin'):
            return False

        if resource == 'user_ban' and role not in ('moderator', 'super_admin', 'operations_admin'):
            return False

        if resource == 'counselling' and role not in ('counsellor', 'super_admin'):
            return False

        return True

    @staticmethod
    def filter_queryset_by_role(user, queryset, model_name):
        return queryset

    @staticmethod
    def _super_admin_modules():
        return [
            'dashboard', 'users', 'subscriptions', 'payments',
            'moderation', 'reports', 'counselling', 'settings',
            'audit', 'roles', 'notifications', 'messages',
            'analytics', 'content', 'admins',
        ]

    @staticmethod
    def _operations_admin_modules():
        return [
            'dashboard', 'users', 'subscriptions', 'payments',
            'matches', 'notifications', 'support',
        ]

    @staticmethod
    def _moderator_modules():
        return [
            'dashboard', 'moderation', 'reports', 'users',
        ]

    @staticmethod
    def _counsellor_modules():
        return [
            'dashboard', 'counselling',
        ]
