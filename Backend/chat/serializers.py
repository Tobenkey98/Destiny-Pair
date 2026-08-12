from rest_framework import serializers

from chat.models import Conversation, Message


class ConversationSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            'id', 'participants', 'last_message', 'other_user',
            'created_at', 'updated_at',
        )

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {
                'text': msg.message,
                'created_at': msg.created_at,
                'sender': msg.sender_id,
                'sender_name': msg.sender.first_name or msg.sender.email,
            }
        return None

    def get_other_user(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other = obj.participants.exclude(id=request.user.id).first()
            if other:
                return {'id': other.id, 'first_name': other.first_name or other.email}
        return None


class MessageSerializer(serializers.ModelSerializer):
    text = serializers.SerializerMethodField()
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_name = serializers.SerializerMethodField()
    sender = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Message
        fields = (
            'id', 'conversation', 'sender', 'sender_id', 'sender_name',
            'message', 'text', 'is_read', 'created_at',
        )

    def get_text(self, obj):
        return obj.message

    def get_sender_name(self, obj):
        if obj.sender_id:
            return obj.sender.first_name or obj.sender.email
        return None