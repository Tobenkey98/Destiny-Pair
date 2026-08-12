from rest_framework import serializers

from subscriptions.models import SubscriptionPlan, UserSubscription, CallSession


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    price_display = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = (
            'id', 'name', 'slug', 'price', 'price_display', 'billing_cycle',
            'message_limit', 'message_reset_period',
            'active_conversation_limit', 'audio_minutes_limit', 'video_minutes_limit',
            'profile_view_limit_daily', 'like_limit_daily', 'save_limit_daily',
            'can_use_advanced_filters', 'can_see_likes', 'can_see_visitors',
            'can_send_voice_notes', 'can_use_read_receipts',
            'can_appear_featured', 'can_use_profile_boost',
            'discover_priority', 'free_counselling_sessions',
            'is_active', 'description',
        )

    def get_price_display(self, obj):
        return f'\u20a6{obj.price:,.0f}'


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)
    plan_slug = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = (
            'id', 'plan', 'plan_slug', 'start_date', 'end_date',
            'status', 'active', 'auto_renew', 'payment_reference',
            'created_at', 'updated_at',
        )

    def get_plan_slug(self, obj):
        return obj.plan.slug if obj.plan else None


class CallSessionSerializer(serializers.ModelSerializer):
    other_user_id = serializers.SerializerMethodField()
    other_user_name = serializers.SerializerMethodField()

    class Meta:
        model = CallSession
        fields = (
            'id', 'conversation', 'initiated_by', 'other_user_id',
            'other_user_name', 'call_type', 'started_at', 'ended_at',
            'duration_seconds', 'billed_minutes',
        )

    def get_other_user_id(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other = obj.conversation.participants.exclude(id=request.user.id).first()
            return other.id if other else None
        return None

    def get_other_user_name(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other = obj.conversation.participants.exclude(id=request.user.id).first()
            return (other.first_name or other.email) if other else None
        return None


class UsageSerializer(serializers.Serializer):
    plan_slug = serializers.CharField()
    plan_name = serializers.CharField()
    messages_remaining = serializers.IntegerField(allow_null=True)
    messages_used = serializers.IntegerField()
    active_conversations = serializers.IntegerField()
    active_conversation_limit = serializers.IntegerField(allow_null=True)
    audio_minutes_remaining = serializers.IntegerField(allow_null=True)
    audio_minutes_used = serializers.IntegerField()
    video_minutes_remaining = serializers.IntegerField(allow_null=True)
    video_minutes_used = serializers.IntegerField()
    profile_views_remaining = serializers.IntegerField(allow_null=True)
    profile_views_used = serializers.IntegerField()
    likes_remaining = serializers.IntegerField(allow_null=True)
    likes_used = serializers.IntegerField()
    saves_remaining = serializers.IntegerField(allow_null=True)
    saves_used = serializers.IntegerField()
    counselling_sessions_remaining = serializers.IntegerField()
    features = serializers.DictField()