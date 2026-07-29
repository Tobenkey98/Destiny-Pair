from django.db import models
from django.conf import settings

# Create your models here.
class Counsellor(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    bio = models.TextField()

    specialization = models.CharField(
        max_length=255
    )

    active = models.BooleanField(
        default=True
    )




class CounsellingRequest(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    counsellor = models.ForeignKey(
        Counsellor,
        on_delete=models.SET_NULL,
        null=True
    )

    topic = models.CharField(
        max_length=255
    )

    description = models.TextField()

    status = models.CharField(
        max_length=50,
        default='pending'
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )


class CounsellingSession(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('upcoming', 'Upcoming'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='counselling_sessions',
    )
    counsellor_name = models.CharField(max_length=255)
    counsellor_email = models.EmailField(blank=True, default='')
    title = models.CharField(max_length=255)
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='scheduled')
    session_type = models.CharField(max_length=20, default='video')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-time']