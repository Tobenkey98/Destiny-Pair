import uuid

from django.contrib.auth import get_user_model
from django.db.models.signals import pre_save
from django.dispatch import receiver

User = get_user_model()


@receiver(pre_save, sender=User)
def rotate_stamp_on_user_deactivation(sender, instance, **kwargs):
    """Invalidate issued tokens when an account is deactivated."""
    if not instance.pk:
        return
    try:
        old = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return
    if old.is_active and not instance.is_active:
        instance.security_stamp = uuid.uuid4().hex
