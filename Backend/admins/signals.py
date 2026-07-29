from django.db.models.signals import post_save, pre_save
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.dispatch import receiver
import uuid

from accounts.services.role_service import RoleService
from .models import AdminProfile

User = get_user_model()


@receiver(post_save, sender=User)
def create_admin_profile_for_staff(sender, instance, created, **kwargs):
    if instance.is_superuser and created:
        from .models import AdminProfile
        AdminProfile.objects.get_or_create(
            user=instance,
            defaults={
                'role': 'super_admin',
                'department': 'management',
                'is_active': True,
            },
        )
        RoleService.sync_user_groups(instance, 'super_admin')


@receiver(pre_save, sender=User)
def prevent_admin_deactivation_bypass(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = User.objects.get(pk=instance.pk)
            if old.is_staff and hasattr(old, 'admin_profile') and old.admin_profile.is_active:
                if not instance.is_staff:
                    return
        except User.DoesNotExist:
            pass


@receiver(pre_save, sender=AdminProfile)
def rotate_stamp_on_role_or_status_change(sender, instance, **kwargs):
    """Revoke all issued tokens when an admin's role or active status changes."""
    if not instance.pk:
        return
    try:
        old = AdminProfile.objects.get(pk=instance.pk)
    except AdminProfile.DoesNotExist:
        return
    if old.role != instance.role or old.is_active != instance.is_active:
        new_stamp = uuid.uuid4().hex
        User.objects.filter(pk=instance.user_id).update(security_stamp=new_stamp)
        instance.user.security_stamp = new_stamp
