from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

ROLE_GROUP_MAP = {
    'super_admin': 'Super Admin',
    'operations_admin': 'Operations Admin',
    'moderator': 'Moderator',
    'counsellor': 'Counsellor',
}


class RoleService:

    @staticmethod
    def get_all_roles():
        return list(ROLE_GROUP_MAP.keys())

    @staticmethod
    def get_or_create_group(role):
        group_name = ROLE_GROUP_MAP.get(role, role)
        group, _ = Group.objects.get_or_create(name=group_name)
        return group

    @staticmethod
    def sync_user_groups(user, role):
        target_group_name = ROLE_GROUP_MAP.get(role, role)
        target_group, _ = Group.objects.get_or_create(name=target_group_name)

        current_groups = user.groups.all()
        for group in current_groups:
            if group.name in ROLE_GROUP_MAP.values():
                user.groups.remove(group)

        user.groups.add(target_group)
        _assign_role_permissions(target_group, role)

    @staticmethod
    def user_has_role(user, role):
        if not hasattr(user, 'admin_profile'):
            return False
        profile = user.admin_profile
        return (
            profile.role == role and
            profile.is_active and
            profile.is_approved and
            user.is_active
        )

    @staticmethod
    def get_user_role(user):
        if not hasattr(user, 'admin_profile'):
            return None
        profile = user.admin_profile
        if not profile.is_active or not profile.is_approved or not user.is_active:
            return None
        return profile.role

    @staticmethod
    def user_is_any_admin(user):
        if not user.is_authenticated:
            return False
        if not user.is_active:
            return False
        if not hasattr(user, 'admin_profile'):
            return False
        profile = user.admin_profile
        return profile.is_active and profile.is_approved

    @staticmethod
    def super_admin_exists():
        from admins.models import AdminProfile
        return AdminProfile.objects.filter(role='super_admin').exists()

    @staticmethod
    def create_default_groups():
        for role in ROLE_GROUP_MAP:
            RoleService.get_or_create_group(role)

    @staticmethod
    def setup_roles():
        """Idempotently create the role groups and (re)assign their permissions.

        Safe to run multiple times; it only adds/updates, never removes.
        """
        for role in ROLE_GROUP_MAP:
            group = RoleService.get_or_create_group(role)
            _assign_role_permissions(group, role)
        return RoleService.get_all_roles()

    @staticmethod
    def get_role_hierarchy():
        return {
            'super_admin': 4,
            'operations_admin': 3,
            'moderator': 2,
            'counsellor': 1,
        }

    @staticmethod
    def is_higher_or_equal_role(user_role, target_role):
        hierarchy = RoleService.get_role_hierarchy()
        user_level = hierarchy.get(user_role, 0)
        target_level = hierarchy.get(target_role, 0)
        return user_level >= target_level


def _assign_role_permissions(group, role):
    permission_map = _get_role_permission_map()
    codenames = permission_map.get(role, [])

    perms = Permission.objects.filter(codename__in=codenames)
    group.permissions.set(perms)


def _get_role_permission_map():
    return {
        'super_admin': _get_all_permission_codenames(),
        'operations_admin': [
            'view_user', 'change_user',
            'view_match', 'change_match',
            'view_subscription', 'change_subscription',
            'view_payment',
            'view_conversation', 'view_message',
            'add_notification', 'change_notification',
            'view_counsellingsession',
            'view_activity',
        ],
        'moderator': [
            'view_user', 'change_user',
            'view_photo', 'change_photo',
            'view_match',
            'view_conversation', 'view_message',
            'view_counsellingsession',
        ],
        'counsellor': [
            'view_counsellingsession', 'change_counsellingsession',
            'add_counsellingsession',
            'view_user',
        ],
    }


def _get_all_permission_codenames():
    all_perms = Permission.objects.values_list('codename', flat=True)
    return list(all_perms)
