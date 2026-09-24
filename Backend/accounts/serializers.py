from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from profiles.models import Denomination, Vibe, Hobby, Language, LocationOption

User = get_user_model()

from .models import Activity

# Fallback vocabularies for when live DB hasn't been seeded yet (e.g., fresh deploy)
# These mirror Frontend/src/pages/dashboard/ProfileCenter.jsx FALLBACK_* constants
FALLBACK_VIBES = ["Faith-Focused","Caring","Cheerful","Communicative","Ambitious","Supportive","Family-Oriented","Adventurous","Creative","Loves Learning","Easygoing","Thoughtful","Patient","Outgoing","Confident"]
FALLBACK_HOBBIES = ["Reading","Cooking","Baking","Football","Basketball","Gaming","Music","Movies & Series","Photography","Travelling","Fitness & Gym","Dancing","Singing","Writing","Drawing & Painting","Cycling","Swimming","Hiking","Volunteering","Bible Study","Church Activities","Technology","Entrepreneurship","Learning New Skills","Podcasts","Gardening","Fashion","Road Trips","Exploring New Places","Board Games","Other"]
FALLBACK_LANGUAGES = ["English","Pidgin English","Yoruba","Igbo","Hausa","Efik","Ibibio","Edo","Urhobo","Itsekiri","Ijaw","Tiv","Nupe","Idoma","Igala","Kanuri","Fulfulde","Ebira","French","Arabic","Spanish","German","Other"]
FALLBACK_LOCATIONS = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT (Abuja)","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara","Anywhere in Nigeria","Outside Nigeria"]

# Map fallback synthetic IDs (9000+) to names for auto-creation
FALLBACK_MAP = {}
for i, name in enumerate(FALLBACK_VIBES):
    FALLBACK_MAP[9000+i] = ("vibe", name)
for i, name in enumerate(FALLBACK_HOBBIES):
    FALLBACK_MAP[9100+i] = ("hobby", name)
for i, name in enumerate(FALLBACK_LANGUAGES):
    FALLBACK_MAP[9200+i] = ("language", name)
for i, name in enumerate(FALLBACK_LOCATIONS):
    FALLBACK_MAP[9300+i] = ("location", name)

class FlexibleM2MField(serializers.PrimaryKeyRelatedField):
    """PrimaryKeyRelatedField that auto-creates fallback vocabularies when ID >=9000 is sent before DB is seeded."""
    def to_internal_value(self, data):
        try:
            return super().to_internal_value(data)
        except serializers.ValidationError:
            # Try fallback synthetic ID
            try:
                fid = int(data)
            except Exception:
                raise
            if fid in FALLBACK_MAP:
                kind, name = FALLBACK_MAP[fid]
                from django.utils.text import slugify
                if kind == "vibe":
                    obj, _ = Vibe.objects.get_or_create(name=name, defaults={"slug": slugify(name), "is_active": True})
                    return obj
                elif kind == "hobby":
                    obj, _ = Hobby.objects.get_or_create(name=name, defaults={"slug": slugify(name), "is_active": True})
                    return obj
                elif kind == "language":
                    obj, _ = Language.objects.get_or_create(name=name, defaults={"slug": slugify(name), "is_active": True})
                    return obj
                elif kind == "location":
                    cat = "anywhere_nigeria" if "Anywhere" in name else "outside_nigeria" if "Outside" in name else "state"
                    obj, _ = LocationOption.objects.get_or_create(name=name, defaults={"slug": slugify(name), "category": cat, "is_active": True})
                    return obj
            raise


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
    vibes = FlexibleM2MField(
        queryset=Vibe.objects.filter(is_active=True), many=True, required=False
    )
    vibes_detail = serializers.SerializerMethodField(read_only=True)
    hobbies_m2m = FlexibleM2MField(
        queryset=Hobby.objects.filter(is_active=True), many=True, required=False
    )
    hobbies_m2m_detail = serializers.SerializerMethodField(read_only=True)
    languages_m2m = FlexibleM2MField(
        queryset=Language.objects.filter(is_active=True), many=True, required=False
    )
    languages_m2m_detail = serializers.SerializerMethodField(read_only=True)
    preferred_locations = FlexibleM2MField(
        queryset=LocationOption.objects.filter(is_active=True), many=True, required=False
    )
    preferred_locations_detail = serializers.SerializerMethodField(read_only=True)
    profile_completion = serializers.SerializerMethodField(read_only=True)
    preferred_age = serializers.SerializerMethodField(read_only=True)
    preferred_height = serializers.SerializerMethodField(read_only=True)
    preferred_weight = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'public_id', 'email', 'first_name', 'last_name', 'phone',
            'date_of_birth', 'gender', 'city_state',
            'faith', 'denomination', 'denomination_name', 'place_of_worship',
            'highest_qualification', 'institution', 'profession', 'workplace',
            'genotype', 'blood_group', 'love_language',
            'preferred_age_min', 'preferred_age_max', 'preferred_age',
            'interests', 'hobbies', 'short_bio',
            'about_self', 'seeking_description',
            'is_verified', 'is_profile_completed', 'profile_completion',
            'marital_status', 'state_of_residence', 'state_of_origin',
            'ethnic_group', 'nationality',
            'weight', 'height', 'height_cm', 'weight_kg', 'complexion', 'looking_for',
            'preferred_location', 'preferred_locations', 'preferred_locations_detail',
            'deal_breakers',
            'willing_to_relocate', 'has_children', 'number_of_children',
            'languages_spoken', 'personality_traits',
            'alcohol', 'smoking',
            'preferred_height_min', 'preferred_height_max', 'preferred_height',
            'preferred_weight_min', 'preferred_weight_max', 'preferred_weight',
            'preferred_tribe',
            'vibes', 'vibes_detail', 'hobbies_m2m', 'hobbies_m2m_detail',
            'languages_m2m', 'languages_m2m_detail', 'custom_hobby',
            'date_joined', 'primary_photo', 'cover_photo',
            'custom_denomination',
        )
        read_only_fields = ('id', 'public_id', 'is_verified', 'is_profile_completed', 'date_joined')

    def validate(self, attrs):
        # Cross-field validation for ranges
        preferred_age_min = attrs.get('preferred_age_min', getattr(self.instance, 'preferred_age_min', None) if self.instance else None)
        preferred_age_max = attrs.get('preferred_age_max', getattr(self.instance, 'preferred_age_max', None) if self.instance else None)
        if preferred_age_min is not None and preferred_age_max is not None:
            if int(preferred_age_min) > int(preferred_age_max):
                raise serializers.ValidationError({'preferred_age_min': 'Minimum age must be less than or equal to maximum age'})
            if int(preferred_age_min) < 18 or int(preferred_age_max) > 80:
                raise serializers.ValidationError({'preferred_age_min': 'Age must be between 18 and 80'})
        preferred_height_min = attrs.get('preferred_height_min', getattr(self.instance, 'preferred_height_min', None) if self.instance else None)
        preferred_height_max = attrs.get('preferred_height_max', getattr(self.instance, 'preferred_height_max', None) if self.instance else None)
        if preferred_height_min is not None and preferred_height_max is not None:
            if int(preferred_height_min) > int(preferred_height_max):
                raise serializers.ValidationError({'preferred_height_min': 'Minimum height must be less than or equal to maximum height'})
            if int(preferred_height_min) < 100 or int(preferred_height_max) > 250:
                raise serializers.ValidationError({'preferred_height_min': 'Height must be between 100 and 250 cm'})
            if int(preferred_height_min) <= 0 or int(preferred_height_max) <= 0:
                raise serializers.ValidationError({'preferred_height_min': 'Height must be positive'})
        preferred_weight_min = attrs.get('preferred_weight_min', getattr(self.instance, 'preferred_weight_min', None) if self.instance else None)
        preferred_weight_max = attrs.get('preferred_weight_max', getattr(self.instance, 'preferred_weight_max', None) if self.instance else None)
        if preferred_weight_min is not None and preferred_weight_max is not None:
            if int(preferred_weight_min) > int(preferred_weight_max):
                raise serializers.ValidationError({'preferred_weight_min': 'Minimum weight must be less than or equal to maximum weight'})
            if int(preferred_weight_min) < 30 or int(preferred_weight_max) > 300:
                raise serializers.ValidationError({'preferred_weight_min': 'Weight must be between 30 and 300 kg'})
            if int(preferred_weight_min) <= 0 or int(preferred_weight_max) <= 0:
                raise serializers.ValidationError({'preferred_weight_min': 'Weight must be positive'})
        # Vibes max 5
        if 'vibes' in attrs and len(attrs['vibes']) > 5:
            raise serializers.ValidationError({'vibes': 'You can select maximum 5 vibes'})
        if 'hobbies_m2m' in attrs and len(attrs['hobbies_m2m']) > 7:
            raise serializers.ValidationError({'hobbies_m2m': 'You can select maximum 7 hobbies'})
        if 'height_cm' in attrs and attrs['height_cm'] is not None:
            v = attrs['height_cm']
            if v < 100 or v > 250:
                raise serializers.ValidationError({'height_cm': 'Height must be between 100 and 250 cm'})
        if 'weight_kg' in attrs and attrs['weight_kg'] is not None:
            v = float(attrs['weight_kg'])
            if v < 30 or v > 300:
                raise serializers.ValidationError({'weight_kg': 'Weight must be between 30 and 300 kg'})
        return attrs

    def update(self, instance, validated_data):
        custom = validated_data.pop('custom_denomination', None)
        # Handle M2M separately to support partial updates correctly
        vibes = validated_data.pop('vibes', None)
        hobbies_m2m = validated_data.pop('hobbies_m2m', None)
        languages_m2m = validated_data.pop('languages_m2m', None)
        preferred_locations = validated_data.pop('preferred_locations', None)
        instance = super().update(instance, validated_data)
        if vibes is not None:
            instance.vibes.set(vibes)
        if hobbies_m2m is not None:
            instance.hobbies_m2m.set(hobbies_m2m)
        if languages_m2m is not None:
            instance.languages_m2m.set(languages_m2m)
        if preferred_locations is not None:
            instance.preferred_locations.set(preferred_locations)
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

    def get_vibes_detail(self, obj):
        try:
            return [{'id': v.id, 'name': v.name, 'slug': v.slug} for v in obj.vibes.filter(is_active=True)]
        except Exception:
            return []

    def get_hobbies_m2m_detail(self, obj):
        try:
            return [{'id': h.id, 'name': h.name, 'slug': h.slug} for h in obj.hobbies_m2m.filter(is_active=True)]
        except Exception:
            return []

    def get_languages_m2m_detail(self, obj):
        try:
            return [{'id': l.id, 'name': l.name, 'slug': l.slug} for l in obj.languages_m2m.filter(is_active=True)]
        except Exception:
            return []

    def get_preferred_locations_detail(self, obj):
        try:
            return [{'id': loc.id, 'name': loc.name, 'slug': loc.slug, 'category': loc.category} for loc in obj.preferred_locations.filter(is_active=True)]
        except Exception:
            return []

    def get_profile_completion(self, obj):
        try:
            from profiles.profile_completion import calculate_profile_completion
            return calculate_profile_completion(obj)
        except Exception:
            return {"percentage": 0, "is_complete": False, "missing_fields": []}

    def get_preferred_age(self, obj):
        if obj.preferred_age_min is not None and obj.preferred_age_max is not None:
            return {"min": obj.preferred_age_min, "max": obj.preferred_age_max}
        return None

    def get_preferred_height(self, obj):
        if obj.preferred_height_min is not None and obj.preferred_height_max is not None:
            return {"min": obj.preferred_height_min, "max": obj.preferred_height_max, "unit": "cm"}
        return None

    def get_preferred_weight(self, obj):
        if obj.preferred_weight_min is not None and obj.preferred_weight_max is not None:
            return {"min": obj.preferred_weight_min, "max": obj.preferred_weight_max, "unit": "kg"}
        return None


class DiscoverSerializer(serializers.ModelSerializer):
    primary_photo = serializers.SerializerMethodField()
    denomination_name = serializers.CharField(
        source='denomination.name', read_only=True, default=None
    )

    class Meta:
        model = User
        fields = (
            'id', 'public_id', 'first_name', 'last_name', 'date_of_birth', 'gender',
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
