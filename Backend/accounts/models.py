import uuid

from django.db import models
from django.contrib.auth.models import AbstractUser


class UserConsent(models.Model):
    """A user's acceptance of a legal document version.

    Records are immutable history: every acceptance creates a new row,
    so re-consenting to an updated document never overwrites an older one.
    """

    CONSENT_TYPE_CHOICES = [
        ('TERMS_OF_USE', 'Terms of Use'),
        ('PRIVACY_POLICY', 'Privacy Policy'),
        ('REFUND_POLICY', 'Refund & Cancellation Policy'),
    ]

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='consents',
    )
    consent_type = models.CharField(max_length=20, choices=CONSENT_TYPE_CHOICES)
    document_version = models.CharField(max_length=20, default='1.0')
    accepted = models.BooleanField(default=True)
    accepted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-accepted_at']
        indexes = [
            models.Index(fields=['user', 'consent_type']),
            models.Index(fields=['user', 'consent_type', '-accepted_at']),
        ]

    def __str__(self):
        return f'{self.user} — {self.consent_type} v{self.document_version}'


class User(AbstractUser):
    username = models.CharField(max_length=500, blank=True, null=True)
    email = models.EmailField(max_length=255, blank=True, null=True, unique=True)
    is_verified = models.BooleanField(default=False)
    is_profile_completed = models.BooleanField(default=False)
    verification_code = models.CharField(max_length=6, blank=True, null=True)
    verification_code_created_at = models.DateTimeField(blank=True, null=True)
    reset_code = models.CharField(max_length=6, blank=True, null=True)
    reset_code_created_at = models.DateTimeField(blank=True, null=True)

    # Security stamp used to invalidate all issued JWTs when role/permissions
    # change or an account is deactivated (defence against stale tokens).
    security_stamp = models.CharField(max_length=64, blank=True, default='')

    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    city_state = models.CharField(max_length=255, blank=True)

    faith = models.CharField(max_length=50, blank=True)
    denomination = models.ForeignKey(
        'profiles.Denomination',
        on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    place_of_worship = models.CharField(max_length=255, blank=True)

    highest_qualification = models.CharField(max_length=255, blank=True)
    institution = models.CharField(max_length=255, blank=True)
    profession = models.CharField(max_length=255, blank=True)
    workplace = models.CharField(max_length=255, blank=True)

    genotype = models.CharField(max_length=10, blank=True)
    blood_group = models.CharField(max_length=5, blank=True)
    love_language = models.CharField(max_length=50, blank=True)
    preferred_age_min = models.IntegerField(null=True, blank=True)
    preferred_age_max = models.IntegerField(null=True, blank=True)

    interests = models.TextField(blank=True)
    hobbies = models.TextField(blank=True)
    short_bio = models.TextField(blank=True)

    marital_status = models.CharField(max_length=20, blank=True)
    is_banned = models.BooleanField(default=False)
    state_of_residence = models.CharField(max_length=255, blank=True)
    state_of_origin = models.CharField(max_length=255, blank=True)

    ethnic_group = models.CharField(max_length=255, blank=True)

    weight = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    complexion = models.CharField(max_length=50, blank=True)
    looking_for = models.CharField(max_length=100, blank=True)
    preferred_location = models.TextField(blank=True)
    deal_breakers = models.TextField(blank=True)
    willing_to_relocate = models.BooleanField(null=True, blank=True)
    has_children = models.BooleanField(null=True, blank=True)
    number_of_children = models.IntegerField(null=True, blank=True)
    languages_spoken = models.TextField(blank=True)
    personality_traits = models.TextField(blank=True)
    alcohol = models.CharField(max_length=50, blank=True)
    smoking = models.CharField(max_length=50, blank=True)
    preferred_height_min = models.IntegerField(null=True, blank=True)
    preferred_height_max = models.IntegerField(null=True, blank=True)
    preferred_tribe = models.TextField(blank=True)

    about_self = models.TextField(blank=True)
    seeking_description = models.TextField(blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def save(self, *args, **kwargs):
        if not self.security_stamp:
            self.security_stamp = uuid.uuid4().hex
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email


class Activity(models.Model):
    ACTION_CHOICES = [
        ('profile_view', 'Profile Viewed'),
        ('like', 'Liked'),
        ('match', 'Matched'),
        ('message', 'Message Sent'),
        ('counselling', 'Counselling Session'),
    ]
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='activities',
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.CharField(max_length=255)
    related_user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='related_activities',
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
