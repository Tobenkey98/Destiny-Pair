from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'is_verified', 'is_staff', 'date_joined')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone', 'date_of_birth', 'gender', 'city_state')}),
        ('Faith', {'fields': ('faith', 'denomination', 'place_of_worship')}),
        ('Education & Work', {'fields': ('highest_qualification', 'institution', 'profession', 'workplace')}),
        ('About', {'fields': ('about_self', 'seeking_description')}),
        ('Status', {'fields': ('is_verified', 'is_profile_completed', 'is_active', 'is_staff', 'is_superuser')}),
        ('Groups', {'fields': ('groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )
