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
        ('super_admin', 'Platform Administrator'),
        ('operations_admin', 'Operation Manager'),
        ('moderator', 'Community Manager'),
        ('counsellor', 'Support and Counselling Manager'),
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
        ('operations_admin', 'Operation Manager'),
        ('moderator', 'Community Manager'),
        ('counsellor', 'Support and Counselling Manager'),
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


class IntegrationSetting(models.Model):
    """Runtime-overridable third-party API setting.

    An admin-managed value that is preferred over the value baked into
    ``settings`` / the server's ``.env``, so a change made in the Integrations
    page takes effect immediately (no process restart needed) while the same
    value is also written back to ``Backend/.env`` so it survives restarts and
    stays aligned with what the workflow deploys.
    """

    key = models.CharField(max_length=120, unique=True)
    value = models.TextField(blank=True, default='')
    group = models.CharField(max_length=60, blank=True, default='')
    label = models.CharField(max_length=160, blank=True, default='')
    description = models.TextField(blank=True, default='')
    is_secret = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='integration_updates',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admins_integrationsetting'
        verbose_name = 'Integration Setting'
        verbose_name_plural = 'Integration Settings'
        ordering = ['group', 'key']

    def __str__(self):
        return f"{self.key}"

    @property
    def masked_value(self):
        if not self.value:
            return ''
        if not self.is_secret or len(self.value) <= 4:
            return '*' * len(self.value)
        return f"{'*' * (len(self.value) - 4)}{self.value[-4:]}"


class AdminNotification(models.Model):
    """A persisted notification shown in the admin bell / Notifications page.

    Unlike the computed activity feed, this is stored per recipient so read
    state can be tracked and the unread badge decrements as admins view them.
    """

    TYPE_CHOICES = [
        ('new_user', 'New User'),
        ('user_login', 'User Login'),
        ('new_admin', 'New Admin'),
        ('admin_login', 'Admin Login'),
        ('match', 'Match'),
        ('counselling', 'Counselling'),
        ('photo', 'Photo'),
        ('bot_ticket', 'Bot Ticket'),
        ('system', 'System'),
        ('custom', 'Custom'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_notifications',
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='system')
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default='')
    link = models.CharField(max_length=500, blank=True, default='')
    event_key = models.CharField(max_length=255, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admins_adminnotification'
        verbose_name = 'Admin Notification'
        verbose_name_plural = 'Admin Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"{self.title} -> {self.recipient_id}"


class SeoSetting(models.Model):
    """Singleton row holding the live website's search / social metadata."""

    site_title = models.CharField(max_length=160, blank=True, default='')
    tagline = models.CharField(max_length=200, blank=True, default='')
    description = models.TextField(blank=True, default='')
    keywords = models.CharField(max_length=500, blank=True, default='')
    og_title = models.CharField(max_length=160, blank=True, default='')
    og_description = models.TextField(blank=True, default='')
    og_image = models.CharField(max_length=500, blank=True, default='')
    canonical_url = models.CharField(max_length=500, blank=True, default='')
    google_analytics_id = models.CharField(max_length=60, blank=True, default='')
    google_site_verification = models.CharField(max_length=200, blank=True, default='')
    robots = models.CharField(max_length=120, blank=True, default='index, follow')
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='seo_updates',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admins_seosetting'
        verbose_name = 'SEO Setting'
        verbose_name_plural = 'SEO Settings'

    def __str__(self):
        return self.site_title or 'SEO Settings'


def default_published_at():
    return timezone.now()


class ContentItem(models.Model):
    """A published piece of content (blog post, devotional, article) managed
    from the admin Content page and rendered on the live website."""

    CATEGORY_CHOICES = [
        ('blog', 'Blog Article'),
        ('devotional', 'Devotional'),
        ('article', 'Article'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='blog')
    excerpt = models.TextField(blank=True, default='')
    body = models.TextField()
    cover_image = models.ImageField(upload_to='content/', blank=True, null=True)
    author_name = models.CharField(max_length=160, blank=True, default='')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    featured = models.BooleanField(default=False)
    published_at = models.DateTimeField(default=default_published_at)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='content_items',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admins_contentitem'
        verbose_name = 'Content Item'
        verbose_name_plural = 'Content Items'
        ordering = ['-published_at']

    def __str__(self):
        return self.title
