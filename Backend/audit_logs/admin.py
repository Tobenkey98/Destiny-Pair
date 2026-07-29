from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'actor', 'target_model', 'action_type', 'created_at')
    list_filter = ('action_type', 'target_model', 'created_at')
    search_fields = ('action', 'actor__email', 'target_repr')
    readonly_fields = ('actor', 'action', 'action_type', 'target_model',
                       'target_id', 'target_repr', 'changes', 'ip_address',
                       'user_agent', 'device', 'endpoint', 'method', 'created_at')
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
