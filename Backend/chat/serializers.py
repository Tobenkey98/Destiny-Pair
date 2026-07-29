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
                'text': msg.text,
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
    class Meta:
        model = Message
        fields = '__all__'
