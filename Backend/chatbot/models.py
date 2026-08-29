from django.conf import settings
from django.db import models


class BotConversation(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('escalated', 'Escalated'),
        ('resolved', 'Resolved'),
    ]

    # None for guests — the session_id still groups their messages.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='bot_conversations',
    )
    session_id = models.CharField(max_length=64, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    title = models.CharField(max_length=255, blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    escalated_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['session_id']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f'BotConversation {self.session_id}'


class BotMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]

    conversation = models.ForeignKey(
        BotConversation, on_delete=models.CASCADE, related_name='messages'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    latency_ms = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.role}: {self.content[:40]}'


class BotTicket(models.Model):
    """An escalated issue the bot could not resolve — surfaced to Super Admin."""

    CATEGORY_CHOICES = [
        ('not_answered', 'Question not answered'),
        ('complaint', 'Complaint'),
        ('bug', 'Bug / Technical issue'),
        ('billing', 'Payment / Billing'),
        ('account', 'Account issue'),
        ('report_user', 'Report a user'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('new', 'New'),
        ('in_review', 'In Review'),
        ('resolved', 'Resolved'),
    ]

    conversation = models.ForeignKey(
        BotConversation, on_delete=models.CASCADE, related_name='tickets'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='bot_tickets',
    )
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    summary = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'BotTicket #{self.pk} ({self.category})'


class BotFeedback(models.Model):
    """User feedback on a bot reply — used to improve answers over time."""

    conversation = models.ForeignKey(
        BotConversation, on_delete=models.CASCADE, related_name='feedback'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    comment = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'BotFeedback #{self.pk}'
