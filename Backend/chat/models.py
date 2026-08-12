from django.db import models
from django.conf import settings

# Create your models here.
class Conversation(models.Model):

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )



 
class Message(models.Model):

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    message = models.TextField()

    audio = models.FileField(
        upload_to='chat/audio/',
        null=True,
        blank=True,
    )

    is_read = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )   