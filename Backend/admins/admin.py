from django.contrib import admin
from .models import AdminProfile


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'department', 'is_active', 'created_at')
    list_filter = ('role', 'department', 'is_active')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
