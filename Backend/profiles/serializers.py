from rest_framework import serializers

from .models import Photo, CoverPhoto, Denomination, PendingDenomination


class PhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = (
            'id', 'image', 'is_primary', 'is_ai_generated',
            'ai_confidence', 'created_at',
        )
        read_only_fields = ('id', 'is_ai_generated', 'ai_confidence', 'created_at')


class CoverPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoverPhoto
        fields = ('id', 'image', 'created_at')
        read_only_fields = ('id', 'created_at')


class DenominationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Denomination
        fields = ('id', 'name', 'slug', 'approved', 'is_active', 'created_at')
        read_only_fields = ('id', 'slug', 'created_at')


class DenominationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Denomination
        fields = ('name',)
        extra_kwargs = {
            'name': {'required': True, 'allow_blank': False},
        }

    def validate_name(self, value):
        from .services import DenominationService
        normalized = DenominationService.normalize_name(value)
        if not normalized:
            raise serializers.ValidationError("Denomination name cannot be empty")
        existing = DenominationService.find_existing(normalized)
        if existing:
            raise serializers.ValidationError("This denomination already exists")
        return normalized


class PendingDenominationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True, default=None)

    class Meta:
        model = PendingDenomination
        fields = ('id', 'name', 'user', 'user_email', 'approved', 'reviewed_by', 'reviewed_at', 'created_at')
        read_only_fields = ('id', 'approved', 'reviewed_by', 'reviewed_at', 'created_at')
