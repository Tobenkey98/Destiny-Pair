from django.db import models
from django.conf import settings


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    GATEWAY_CHOICES = [
        ('paystack', 'Paystack'),
        ('monnify', 'Monnify'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    plan = models.ForeignKey(
        'subscriptions.SubscriptionPlan',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    subscription = models.ForeignKey(
        'subscriptions.UserSubscription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    gateway = models.CharField(max_length=20, choices=GATEWAY_CHOICES, default='paystack')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='NGN')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50, blank=True, default='')
    reference = models.CharField(max_length=255, blank=True, default='')
    transaction_reference = models.CharField(max_length=255, blank=True, default='')
    transaction_id = models.CharField(max_length=255, blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference']),
            models.Index(fields=['transaction_reference']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f'{self.reference} ({self.status})'