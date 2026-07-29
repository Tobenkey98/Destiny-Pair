from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    ACTION_TYPES = [
        ('create', 'Create'),
        ('read', 'Read'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('other', 'Other'),
    ]

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=255)
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES, default='other')
    target_model = models.CharField(max_length=100, blank=True, default='')
    target_id = models.CharField(max_length=50, blank=True, default='')
    target_repr = models.CharField(max_length=255, blank=True, default='')
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, default='')
    device = models.CharField(max_length=255, blank=True, default='')
    endpoint = models.CharField(max_length=500, blank=True, default='')
    method = models.CharField(max_length=10, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs_auditlog'
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['actor', '-created_at']),
            models.Index(fields=['target_model', 'target_id']),
            models.Index(fields=['action_type']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.action} by {self.actor} at {self.created_at}"
