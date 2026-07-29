import uuid

from django.db import models
from django.conf import settings
from django.utils import timezone


def generate_invitation_token():
    return uuid.uuid4().hex


def default_invitation_expiry():
    return timezone.now() + timezone.timedelta(days=7)


class AdminProfile(models.Model):
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('operations_admin', 'Operations Admin'),
        ('moderator', 'Moderator'),
        ('counsellor', 'Counsellor'),
    ]

    DEPARTMENT_CHOICES = [
        ('management', 'Management'),
        ('operations', 'Operations'),
        ('moderation', 'Moderation'),
        ('counselling', 'Counselling'),
        ('support', 'Support'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_profile',
    )
    department = models.CharField(max_length=100, choices=DEPARTMENT_CHOICES, blank=True, default='')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    phone_number = models.CharField(max_length=20, blank=True, default='')
    is_active = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invited_admins',
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_admins',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admins_adminprofile'
        verbose_name = 'Admin Profile'
        verbose_name_plural = 'Admin Profiles'

    def __str__(self):
        return f"{self.user.email} ({self.get_role_display()})"


class AdminInvitation(models.Model):
    """Invitation sent by the Super Admin to onboard a new administrator.

    The invitee signs up with the token; their account stays pending until the
    Super Admin approves it.
    """

    ROLE_CHOICES = [
        ('operations_admin', 'Operations Admin'),
        ('moderator', 'Moderator'),
        ('counsellor', 'Counsellor'),
    ]

    DEPARTMENT_CHOICES = AdminProfile.DEPARTMENT_CHOICES

    email = models.EmailField(max_length=255)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    department = models.CharField(
        max_length=100, choices=DEPARTMENT_CHOICES, blank=True, default=''
    )
    token = models.CharField(
        max_length=64, unique=True, default=generate_invitation_token
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_invitations',
    )
    used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=default_invitation_expiry)

    class Meta:
        db_table = 'admins_admininvitation'
        verbose_name = 'Admin Invitation'
        verbose_name_plural = 'Admin Invitations'
        ordering = ['-created_at']

    def __str__(self):
        return f"Invite {self.email} -> {self.get_role_display()}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return not self.used and not self.is_expired
