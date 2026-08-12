from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from profiles.models import Denomination

User = get_user_model()

from .models import Activity


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': 'Passwords do not match'})
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class SocialAuthSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=['google', 'facebook'])
    access_token = serializers.CharField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)


class UserSerializer(serializers.ModelSerializer):
    primary_photo = serializers.SerializerMethodField()
    cover_photo = serializers.SerializerMethodField()
    denomination = serializers.PrimaryKeyRelatedField(
        queryset=Denomination.objects.all(), allow_null=True, required=False
    )
    denomination_name = serializers.CharField(
        source='denomination.name', read_only=True, default=None
    )
    custom_denomination = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name', 'phone',
            'date_of_birth', 'gender', 'city_state',
            'faith', 'denomination', 'denomination_name', 'place_of_worship',
            'highest_qualification', 'institution', 'profession', 'workplace',
            'genotype', 'blood_group', 'love_language',
            'preferred_age_min', 'preferred_age_max',
            'interests', 'hobbies', 'short_bio',
            'about_self', 'seeking_description',
            'is_verified', 'is_profile_completed',
            'marital_status', 'state_of_residence', 'state_of_origin',
            'ethnic_group',
            'weight', 'height', 'complexion', 'looking_for',
            'preferred_location', 'deal_breakers',
            'willing_to_relocate', 'has_children', 'number_of_children',
            'languages_spoken', 'personality_traits',
            'alcohol', 'smoking',
            'preferred_height_min', 'preferred_height_max',
            'preferred_tribe',
            'date_joined', 'primary_photo', 'cover_photo',
            'custom_denomination',
        )
        read_only_fields = ('id', 'is_verified', 'is_profile_completed', 'date_joined')

    def update(self, instance, validated_data):
        custom = validated_data.pop('custom_denomination', None)
        instance = super().update(instance, validated_data)
        if custom:
            from profiles.services import DenominationService
            DenominationService.create_pending(name=custom, user=instance)
        return instance

    def get_primary_photo(self, obj):
        photo = obj.photos.filter(is_primary=True).first()
        if photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(photo.image.url)
            return photo.image.url
        return None

    def get_cover_photo(self, obj):
        cover = getattr(obj, 'cover_photo', None)
        if cover and cover.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(cover.image.url)
            return cover.image.url
        return None


class DiscoverSerializer(serializers.ModelSerializer):
    primary_photo = serializers.SerializerMethodField()
    denomination_name = serializers.CharField(
        source='denomination.name', read_only=True, default=None
    )

    class Meta:
        model = User
        fields = (
            'id', 'first_name', 'last_name', 'date_of_birth', 'gender',
            'city_state', 'faith', 'denomination', 'denomination_name',
            'highest_qualification', 'profession', 'about_self', 'love_language',
            'interests', 'hobbies', 'short_bio',
            'ethnic_group', 'marital_status',
            'state_of_residence', 'state_of_origin',
            'seeking_description',
            'weight', 'height', 'complexion', 'alcohol', 'smoking',
            'preferred_location', 'preferred_height_min', 'preferred_height_max',
            'preferred_tribe',
            'primary_photo', 'is_verified',
        )

    def get_primary_photo(self, obj):
        photo = obj.photos.filter(is_primary=True).first()
        if photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(photo.image.url)
            return photo.image.url
        return None


class ActivitySerializer(serializers.ModelSerializer):
    related_user_name = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = '__all__'

    def get_related_user_name(self, obj):
        return obj.related_user.first_name if obj.related_user else None


class EmailSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)
