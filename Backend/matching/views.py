from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from matching.models import Match
from matching.serializers import MatchSerializer
from chat.models import Conversation, Message
from accounts.models import Activity


class MatchListCreateView(generics.ListCreateAPIView):
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Match.objects.filter(
            Q(from_user=self.request.user) | Q(to_user=self.request.user)
        ).order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        to_user = serializer.validated_data['to_user']
        new_status = serializer.validated_data.get('status', 'pending')

        match, _ = Match.objects.update_or_create(
            from_user=request.user,
            to_user=to_user,
            defaults={'status': new_status},
        )

        conv_id = None
        if new_status != 'rejected':
            reverse = Match.objects.filter(
                from_user=match.to_user,
                to_user=match.from_user,
                status='liked',
            ).first()

            conv = Conversation.objects.filter(participants=match.from_user).filter(
                participants=match.to_user
            ).first()
            if not conv:
                conv = Conversation.objects.create()
                conv.participants.add(match.from_user, match.to_user)
            conv_id = conv.id

            if reverse:
                match.status = 'matched'
                match.save(update_fields=['status'])
                reverse.status = 'matched'
                reverse.save(update_fields=['status'])

                sender_name = request.user.first_name or request.user.email or 'Someone'
                receiver_name = match.to_user.first_name or match.to_user.email
                Message.objects.create(
                    conversation=conv,
                    sender=request.user,
                    text=f"Hi {receiver_name}! You and {sender_name} have matched. Start your conversation here.",
                )
                conv.save(update_fields=['updated_at'])

                Activity.objects.create(
                    user=request.user,
                    action='match',
                    description=f"You matched with {receiver_name}!",
                    related_user=match.to_user,
                )
                Activity.objects.create(
                    user=match.to_user,
                    action='match',
                    description=f"You matched with {sender_name}!",
                    related_user=request.user,
                )
            else:
                sender_name = request.user.first_name or request.user.email or 'Someone'
                receiver_name = match.to_user.first_name or match.to_user.email
                Message.objects.create(
                    conversation=conv,
                    sender=request.user,
                    text=f"Hi {receiver_name}! {sender_name} is interested in getting to know you. Say hello!",
                )
                conv.save(update_fields=['updated_at'])

                Activity.objects.create(
                    user=match.to_user,
                    action='like',
                    description=f"{sender_name} liked you.",
                    related_user=request.user,
                )

        out = MatchSerializer(match, context={'request': request}).data
        if conv_id:
            out['conversation_id'] = conv_id
        return Response(out, status=status.HTTP_201_CREATED)


class MatchUpdateView(generics.UpdateAPIView):
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Match.objects.filter(to_user=self.request.user)
