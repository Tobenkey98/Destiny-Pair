from decimal import Decimal

from django.conf import settings
from django.db import models


class SubscriptionPlan(models.Model):
    """A billable membership tier with feature limits.

    ``None`` on any limit field means unlimited.
    """

    BILLING_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]
    MESSAGE_PERIOD_CHOICES = [
        ('daily', 'Daily'),
        ('monthly', 'Monthly'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    billing_cycle = models.CharField(max_length=10, choices=BILLING_CYCLE_CHOICES, default='monthly')
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, default='')

    # --- Limits (None = unlimited) ---
    message_limit = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Max messages per counting period. Null = unlimited.',
    )
    message_reset_period = models.CharField(
        max_length=10, choices=MESSAGE_PERIOD_CHOICES, default='monthly',
    )
    active_conversation_limit = models.PositiveIntegerField(null=True, blank=True)
    audio_minutes_limit = models.PositiveIntegerField(null=True, blank=True)
    video_minutes_limit = models.PositiveIntegerField(null=True, blank=True)
    profile_view_limit_daily = models.PositiveIntegerField(null=True, blank=True)
    like_limit_daily = models.PositiveIntegerField(null=True, blank=True)
    save_limit_daily = models.PositiveIntegerField(null=True, blank=True)

    # --- Feature flags ---
    can_use_advanced_filters = models.BooleanField(default=False)
    can_see_likes = models.BooleanField(default=False)
    can_see_visitors = models.BooleanField(default=False)
    can_send_voice_notes = models.BooleanField(default=False)
    can_use_read_receipts = models.BooleanField(default=False)
    can_appear_featured = models.BooleanField(default=False)
    can_use_profile_boost = models.BooleanField(default=False)
    discover_priority = models.IntegerField(default=0)
    free_counselling_sessions = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name

    @property
    def duration_days(self):
        """Compatibility with the admin dashboard (billing_cycle = monthly)."""
        return 30

    def is_unlimited(self, limit_attr):
        return getattr(self, limit_attr, None) is None


class UserSubscription(models.Model):
    """A user's subscription to a plan."""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    payment_reference = models.CharField(max_length=255, blank=True, default='')
    auto_renew = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Kept for admin/frontend compatibility; synced from `status` on save.
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'end_date']),
        ]

    def save(self, *args, **kwargs):
        self.active = self.status == 'active'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user} — {self.plan.name} ({self.status})'


class SubscriptionUsage(models.Model):
    """Per-user usage counters for quota enforcement."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription_usage',
    )
    subscription = models.ForeignKey(
        UserSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='usages',
    )
    month = models.DateField(null=True, blank=True)
    messages_sent = models.PositiveIntegerField(default=0)
    messages_period = models.DateField(null=True, blank=True)
    audio_minutes_used = models.PositiveIntegerField(default=0)
    video_minutes_used = models.PositiveIntegerField(default=0)
    counselling_sessions_used = models.PositiveIntegerField(default=0)
    profile_views_today = models.PositiveIntegerField(default=0)
    likes_today = models.PositiveIntegerField(default=0)
    saves_today = models.PositiveIntegerField(default=0)
    daily_period = models.DateField(null=True, blank=True)
    active_conversations_count = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Usage: {self.user}'


class CallSession(models.Model):
    """A billed audio/video call between two matched users."""

    CALL_TYPE_CHOICES = [
        ('audio', 'Audio'),
        ('video', 'Video'),
    ]

    conversation = models.ForeignKey(
        'chat.Conversation',
        on_delete=models.CASCADE,
        related_name='call_sessions',
    )
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='initiated_calls',
    )
    call_type = models.CharField(max_length=5, choices=CALL_TYPE_CHOICES)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    billed_minutes = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['initiated_by', 'call_type']),
            models.Index(fields=['ended_at']),
        ]

    def __str__(self):
        return f'{self.call_type} call by {self.initiated_by}'