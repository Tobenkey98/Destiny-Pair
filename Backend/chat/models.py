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


class ModerationLog(models.Model):
    """A block audit trail for the chat content policy.

    One row is written every time the real-time monitor stops a message
    (contact-sharing, sexual content, or money talk) so admins can review
    who tried what. The offending message is never stored as a ``Message``,
    only an excerpt and the matched terms.
    """

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='chat_moderation_logs',
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='received_chat_moderation_logs',
    )

    conversation = models.ForeignKey(
        Conversation,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='moderation_logs',
    )

    excerpt = models.TextField(
        blank=True,
        default='',
        help_text='First characters of the blocked message, for admin review.',
    )

    matched_terms = models.TextField(
        blank=True,
        default='',
        help_text='The exact snippets that triggered the block.',
    )

    category = models.CharField(
        max_length=20,
        blank=True,
        default='',
    )

    code = models.CharField(
        max_length=40,
        blank=True,
        default='',
    )

    channel = models.CharField(
        max_length=10,
        blank=True,
        default='ws',
        help_text='"ws" for WebSocket messages, "rest" for REST API messages.',
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['category']),
            models.Index(fields=['sender']),
        ]

    def __str__(self):
        return f'{self.code} (#{self.sender_id}) @ {self.created_at:%Y-%m-%d %H:%M}'   