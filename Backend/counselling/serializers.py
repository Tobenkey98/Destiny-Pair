from rest_framework import serializers

from counselling.models import CounsellingSession


class CounsellingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CounsellingSession
        fields = '__all__'
        read_only_fields = ('user',)
