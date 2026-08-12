from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Q

from chat.models import Conversation, Message
from chat.serializers import ConversationSerializer, MessageSerializer
from accounts.models import Activity


class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).order_by('-updated_at')

    def perform_create(self, serializer):
        conv = serializer.save()
        conv.participants.add(self.request.user)


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conv_id = self.request.query_params.get('conversation')
        if conv_id:
            return Message.objects.filter(
                conversation_id=conv_id,
                conversation__participants=self.request.user,
            )
        return Message.objects.none()

    def perform_create(self, serializer):
        from subscriptions.services import usage_service

        decision = usage_service.can_send_message(self.request.user)
        if not decision['allowed']:
            raise PermissionError(decision['reason'])
        msg = serializer.save(sender=self.request.user)
        msg.conversation.save(update_fields=['updated_at'])
        usage_service.record_message_sent(self.request.user)
        Activity.objects.create(
            user=self.request.user,
            action='message',
            description='Sent a message',
            related_user=msg.conversation.participants.exclude(id=self.request.user.id).first(),
        )

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except PermissionError as exc:
            return Response(
                {'error': str(exc), 'detail': 'Your message limit is exhausted for this period.'},
                status=status.HTTP_403_FORBIDDEN,
            )


class AudioUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('audio')
        if not file:
            return Response({'error': 'No audio provided'}, status=status.HTTP_400_BAD_REQUEST)

        max_size = 25 * 1024 * 1024
        if file.size > max_size:
            return Response({'error': 'Audio too large (max 25MB)'}, status=status.HTTP_400_BAD_REQUEST)

        allowed = ['audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav']
        if file.content_type not in allowed:
            return Response({'error': 'Invalid audio format'}, status=status.HTTP_400_BAD_REQUEST)

        conv_id = request.data.get('conversation_id')
        if not conv_id:
            return Response({'error': 'conversation_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not Conversation.objects.filter(id=conv_id, participants=request.user).exists():
            return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

        from subscriptions.services import usage_service
        decision = usage_service.can_send_voice_notes(request.user)
        if not decision['allowed']:
            return Response(decision, status=status.HTTP_403_FORBIDDEN)

        msg = Message.objects.create(
            conversation_id=conv_id,
            sender=request.user,
            message='[Voice Note]',
            audio=file,
        )
        usage_service.record_message_sent(request.user)
        serializer = MessageSerializer(msg, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
