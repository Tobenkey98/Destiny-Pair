from rest_framework import serializers
from django.contrib.auth import get_user_model

from chat.models import Conversation
from matching.models import Match

User = get_user_model()


class MatchSerializer(serializers.ModelSerializer):
    from_user_name = serializers.SerializerMethodField()
    to_user_name = serializers.SerializerMethodField()
    conversation_id = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = '__all__'
        read_only_fields = ('from_user',)

    def get_from_user_name(self, obj):
        return obj.from_user.first_name or obj.from_user.email

    def get_to_user_name(self, obj):
        return obj.to_user.first_name or obj.to_user.email

    def get_conversation_id(self, obj):
        conv = Conversation.objects.filter(participants=obj.from_user).filter(participants=obj.to_user).first()
        return conv.id if conv else None
