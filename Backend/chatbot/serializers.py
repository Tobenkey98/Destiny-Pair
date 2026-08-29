from rest_framework import serializers

from .models import BotConversation, BotFeedback, BotMessage, BotTicket


class SendMessageSerializer(serializers.Serializer):
    session_id = serializers.CharField(max_length=64, allow_blank=False)
    message = serializers.CharField(max_length=2000, allow_blank=False, trim_whitespace=True)


class EscalateSerializer(serializers.Serializer):
    session_id = serializers.CharField(max_length=64, allow_blank=False)
    category = serializers.ChoiceField(
        choices=['not_answered', 'complaint', 'bug', 'billing', 'account', 'report_user', 'other'],
        default='other',
    )
    description = serializers.CharField(max_length=2000, allow_blank=True, required=False)


class FeedbackSerializer(serializers.Serializer):
    session_id = serializers.CharField(max_length=64, allow_blank=False)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
    comment = serializers.CharField(max_length=1000, allow_blank=True, required=False)


class BotMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BotMessage
        fields = ('id', 'role', 'content', 'latency_ms', 'created_at')


class BotConversationSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    has_ticket = serializers.SerializerMethodField()

    class Meta:
        model = BotConversation
        fields = (
            'id', 'session_id', 'user_name', 'status', 'title',
            'created_at', 'updated_at', 'message_count',
            'has_ticket', 'escalated_at', 'resolved_at',
        )

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.email
        return 'Guest'

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_has_ticket(self, obj):
        return obj.tickets.exists()


class BotTicketSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    conversation_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = BotTicket
        fields = (
            'id', 'conversation_id', 'user_name', 'category', 'summary',
            'status', 'created_at', 'updated_at', 'resolved_at',
            'resolution_note', 'message_count',
        )

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.email
        return 'Guest'

    def get_message_count(self, obj):
        return obj.conversation.messages.count() if obj.conversation else 0


class BotTicketDetailSerializer(BotTicketSerializer):
    transcript = BotMessageSerializer(source='conversation.messages', many=True, read_only=True)

    class Meta(BotTicketSerializer.Meta):
        fields = BotTicketSerializer.Meta.fields + ('transcript',)


class BotTicketUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['new', 'in_review', 'resolved'], required=False)
    resolution_note = serializers.CharField(max_length=2000, allow_blank=True, required=False)


class BotFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = BotFeedback
        fields = ('id', 'conversation_id', 'rating', 'comment', 'created_at')
        read_only_fields = ('id', 'conversation_id', 'created_at')