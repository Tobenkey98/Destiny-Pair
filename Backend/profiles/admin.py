from django.contrib import admin

from .models import Photo, CoverPhoto


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'is_primary', 'approved', 'created_at')
    list_filter = ('is_primary', 'approved', 'is_ai_generated')
    search_fields = ('user__email',)


@admin.register(CoverPhoto)
class CoverPhotoAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'created_at')
