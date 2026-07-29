from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class CandidateSerializer(serializers.ModelSerializer):
    primary_photo = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'age',
            'faith', 'denomination',
            'city_state', 'state_of_residence',
            'genotype', 'blood_group',
            'marital_status', 'ethnic_group',
            'highest_qualification', 'profession',
            'interests', 'hobbies', 'short_bio',
            'about_self', 'seeking_description',
            'place_of_worship', 'state_of_origin',
            'primary_photo',
        ]

    def get_primary_photo(self, obj):
        photo = obj.photos.filter(is_primary=True).first()
        if photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(photo.image.url)
            return photo.image.url
        return None

    def get_age(self, obj):
        if obj.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - obj.date_of_birth.year - (
                (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
            )
        return None


class MatchScoreSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    compatibility_score = serializers.IntegerField()
    religion_score = serializers.IntegerField()
    denomination_score = serializers.IntegerField()
    age_score = serializers.IntegerField()
    location_score = serializers.IntegerField()
    genotype_score = serializers.IntegerField()
    genotype_status = serializers.CharField()
    marital_status_score = serializers.IntegerField()
    education_score = serializers.IntegerField()
    occupation_score = serializers.IntegerField()
    lifestyle_score = serializers.IntegerField()
    blood_group_status = serializers.CharField()
    recommendation_level = serializers.CharField()


class RecommendationSerializer(serializers.Serializer):
    user = CandidateSerializer()
    compatibility_score = serializers.IntegerField()
    recommendation_level = serializers.CharField()
    boost = serializers.IntegerField(default=0)
