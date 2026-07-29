from django.db import models
from django.conf import settings


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='NGN')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50, blank=True, default='')
    reference = models.CharField(max_length=255, blank=True, default='')
    transaction_id = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
