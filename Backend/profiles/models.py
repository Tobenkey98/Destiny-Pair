import uuid

from django.db import models
from django.conf import settings
from django.utils.text import slugify
import re


def normalize_denomination_name(name):
    name = (name or "").strip()
    name = re.sub(r'\s+', ' ', name)
    name = re.sub(r'[^\w\s\-\.\,\&\'\(\)]', '', name)
    return name


class Denomination(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True)
    approved = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='denominations_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['slug']),
            models.Index(fields=['approved']),
        ]

    def save(self, *args, **kwargs):
        self.name = normalize_denomination_name(self.name)
        if not self.slug:
            self.slug = slugify(self.name) or 'unknown'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Testimonial(models.Model):
    quote = models.TextField()
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    approved = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='testimonials_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['approved']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name}: {self.quote[:40]}"


class PendingDenomination(models.Model):
    name = models.CharField(max_length=255)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='pending_denominations',
    )
    approved = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='denomination_reviews',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} (pending)"


def photo_upload_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'jpg'
    return f'photos/user_{instance.user.id}/{uuid.uuid4().hex}.{ext}'


class Photo(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='photos',
    )
    image = models.ImageField(upload_to=photo_upload_path)
    is_primary = models.BooleanField(default=False)
    is_ai_generated = models.BooleanField(null=True, blank=True)
    ai_confidence = models.FloatField(null=True, blank=True)
    approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_primary', '-created_at']


class CoverPhoto(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cover_photo',
    )
    image = models.ImageField(upload_to='covers/')
    created_at = models.DateTimeField(auto_now_add=True)
