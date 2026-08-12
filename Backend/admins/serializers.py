from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import AdminProfile, AdminInvitation

User = get_user_model()


class UserListSerializer(serializers.ModelSerializer):
    is_admin = serializers.SerializerMethodField()
    admin_role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'gender', 'date_of_birth', 'city_state',
            'is_verified', 'is_active', 'is_banned',
            'is_profile_completed', 'is_staff', 'is_superuser',
            'date_joined', 'last_login',
            'is_admin', 'admin_role',
        ]

    def get_is_admin(self, obj):
        return hasattr(obj, 'admin_profile')

    def get_admin_role(self, obj):
        if hasattr(obj, 'admin_profile'):
            return obj.admin_profile.role
        return None


class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'date_of_birth', 'gender', 'city_state',
            'faith', 'denomination', 'place_of_worship',
            'highest_qualification', 'institution',
            'profession', 'workplace',
            'genotype', 'blood_group', 'love_language',
            'marital_status', 'state_of_residence',
            'state_of_origin', 'ethnic_group',
            'weight', 'height', 'complexion', 'looking_for',
            'preferred_location', 'deal_breakers',
            'willing_to_relocate', 'has_children', 'number_of_children',
            'languages_spoken', 'personality_traits',
            'alcohol', 'smoking',
            'preferred_height_min', 'preferred_height_max',
            'preferred_tribe',
            'about_self', 'seeking_description',
            'is_verified', 'is_active', 'is_banned',
            'is_profile_completed', 'is_staff', 'is_superuser',
            'date_joined', 'last_login',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class AdminProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    invited_by_email = serializers.EmailField(source='invited_by.email', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)

    class Meta:
        model = AdminProfile
        fields = [
            'id', 'user', 'email', 'first_name', 'last_name',
            'role', 'department', 'phone_number',
            'is_active', 'is_approved',
            'invited_by', 'invited_by_email', 'approved_by', 'approved_by_email',
            'approved_at', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'created_at', 'updated_at',
            'is_approved', 'invited_by', 'approved_by', 'approved_at',
        ]


class AdminInvitationSerializer(serializers.ModelSerializer):
    invited_by_email = serializers.EmailField(source='invited_by.email', read_only=True)

    class Meta:
        model = AdminInvitation
        fields = [
            'id', 'email', 'role', 'department', 'token',
            'used', 'used_at', 'created_at', 'expires_at',
            'invited_by', 'invited_by_email',
        ]
        read_only_fields = ['id', 'token', 'used', 'used_at', 'created_at', 'expires_at']


class AdminSignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, default='')
    last_name = serializers.CharField(max_length=150, required=False, default='')
    role = serializers.ChoiceField(choices=AdminProfile.ROLE_CHOICES, required=False, allow_blank=True, default='super_admin')
    invitation_token = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': 'Passwords do not match'})
        return attrs


class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class AuditLogSerializer(serializers.Serializer):
    actor_email = serializers.EmailField(source='actor.email', read_only=True)
    actor_name = serializers.SerializerMethodField()
    action = serializers.CharField()
    action_type = serializers.CharField()
    target_model = serializers.CharField()
    target_id = serializers.CharField()
    target_repr = serializers.CharField()
    changes = serializers.JSONField()
    ip_address = serializers.IPAddressField()
    device = serializers.CharField()
    endpoint = serializers.CharField()
    created_at = serializers.DateTimeField()

    def get_actor_name(self, obj):
        if obj.actor:
            return f"{obj.actor.first_name} {obj.actor.last_name}".strip()
        return "System"


class RoleAssignmentSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=AdminProfile.ROLE_CHOICES)
    department = serializers.ChoiceField(
        choices=AdminProfile.DEPARTMENT_CHOICES, required=False, default=''
    )
    is_active = serializers.BooleanField(required=False, default=True)
