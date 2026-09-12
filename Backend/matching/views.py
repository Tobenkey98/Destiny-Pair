from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from matching.models import Match
from matching.notifications import send_like_email, send_match_email, send_photo_reminder_email
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

        if to_user.id == request.user.id:
            return Response(
                {'error': 'You cannot like yourself.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = Match.objects.filter(from_user=request.user, to_user=to_user).first()
        if existing and existing.status == 'matched':
            out = MatchSerializer(existing, context={'request': request}).data
            conv = (
                Conversation.objects
                .filter(participants=request.user)
                .filter(participants=to_user)
                .order_by('-updated_at', '-id')
                .first()
            )
            if conv:
                out['conversation_id'] = conv.id
            return Response(out, status=status.HTTP_200_OK)

        if new_status == 'liked':
            # Strict rule: no photos, no likes. Every member must have at
            # least one profile photo and a cover photo first.
            from django.core.cache import cache
            from profiles.models import CoverPhoto, Photo
            has_photo = Photo.objects.filter(user=request.user).exists()
            has_cover = CoverPhoto.objects.filter(user=request.user).exists()
            if not (has_photo and has_cover):
                try:
                    reminder_key = f'photo_nudge:{request.user.id}'
                    if not cache.get(reminder_key):
                        send_photo_reminder_email(request.user)
                        cache.set(reminder_key, 1, 24 * 3600)
                except Exception:
                    pass
                return Response(
                    {
                        'error': 'Upload at least one profile photo and a cover photo before liking anyone.',
                        'reason': 'PHOTOS_REQUIRED',
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            from subscriptions.services import usage_service
            decision = usage_service.can_like_profile(request.user)
            if not decision['allowed']:
                return Response(
                    {
                        'error': decision['reason'],
                        'detail': 'You have reached your daily like limit.',
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            usage_service.record_like(request.user)

        match, _ = Match.objects.update_or_create(
            from_user=request.user,
            to_user=to_user,
            defaults={'status': new_status},
        )

        conv_id = None
        reverse = Match.objects.filter(
            from_user=match.to_user,
            to_user=match.from_user,
        ).first()

        if new_status == 'liked' and reverse and reverse.status == 'liked':

            conv = (
                Conversation.objects
                .filter(participants=match.from_user)
                .filter(participants=match.to_user)
                .order_by('-updated_at', '-id')
                .first()
            )
            if not conv:
                from subscriptions.services import usage_service
                decision = usage_service.can_start_conversation(request.user)
                if not decision['allowed']:
                    return Response(
                        {
                            'error': decision['reason'],
                            'detail': 'You have reached your active conversation limit.',
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
                conv = Conversation.objects.create()
                conv.participants.add(match.from_user, match.to_user)
                usage_service.sync_active_conversations(request.user)
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
                    message=f"Hi {receiver_name}! You and {sender_name} have matched. Start your conversation here.",
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

                # Email both sides the moment the match forms.
                send_match_email(match.from_user, match.to_user)
            else:
                # Unreachable: the branch above guarantees a liked reverse row.
                pass

        if new_status == 'liked' and not (reverse and reverse.status == 'liked'):
            # One-sided like = a like request. Notify them by activity feed
            # and email; no conversation opens until they accept.
            sender_name = request.user.first_name or request.user.email or 'Someone'
            Activity.objects.create(
                user=match.to_user,
                action='like',
                description=f"{sender_name} liked you.",
                related_user=request.user,
            )

            # Email the recipient for every single like.
            send_like_email(request.user, match.to_user)

        out = MatchSerializer(match, context={'request': request}).data
        if conv_id:
            out['conversation_id'] = conv_id
        return Response(out, status=status.HTTP_201_CREATED)


class MatchUpdateView(generics.UpdateAPIView):
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Match.objects.filter(to_user=self.request.user)

    def patch(self, request, *args, **kwargs):
        """Answer a like request: the recipient accepts or rejects it.

        Accepting marks both sides matched, opens the conversation (unlocking
        chat) and emails both users. Rejecting just records the rejection.
        """
        match = self.get_object()
        new_status = (request.data.get('status') or '').strip()
        if new_status not in ('matched', 'rejected'):
            return Response(
                {'error': 'You can only accept or reject a like request.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if match.status == 'matched':
            out = MatchSerializer(match, context={'request': request}).data
            conv = (
                Conversation.objects
                .filter(participants=request.user)
                .filter(participants=match.from_user)
                .order_by('-updated_at', '-id')
                .first()
            )
            if conv:
                out['conversation_id'] = conv.id
            return Response(out, status=status.HTTP_200_OK)
        if match.status not in ('liked', 'pending'):
            return Response(
                {'error': 'This request was already answered.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conv_id = None
        if new_status == 'matched':
            from subscriptions.services import usage_service
            decision = usage_service.can_start_conversation(request.user)
            if not decision['allowed']:
                return Response(
                    {
                        'error': decision['reason'],
                        'detail': 'You have reached your active conversation limit.',
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            match.status = 'matched'
            match.save(update_fields=['status'])
            Match.objects.update_or_create(
                from_user=request.user,
                to_user=match.from_user,
                defaults={'status': 'matched'},
            )
            conv = (
                Conversation.objects
                .filter(participants=request.user)
                .filter(participants=match.from_user)
                .order_by('-updated_at', '-id')
                .first()
            )
            if not conv:
                conv = Conversation.objects.create()
                conv.participants.add(request.user, match.from_user)
                usage_service.sync_active_conversations(request.user)
            conv_id = conv.id

            sender_name = request.user.first_name or request.user.email or 'Someone'
            receiver_name = match.from_user.first_name or match.from_user.email
            Message.objects.create(
                conversation=conv,
                sender=request.user,
                message=f"Hi {receiver_name}! You and {sender_name} have matched. Start your conversation here.",
            )
            conv.save(update_fields=['updated_at'])
            Activity.objects.create(
                user=request.user,
                action='match',
                description=f"You matched with {receiver_name}!",
                related_user=match.from_user,
            )
            Activity.objects.create(
                user=match.from_user,
                action='match',
                description=f"You matched with {sender_name}!",
                related_user=request.user,
            )
            send_match_email(request.user, match.from_user)
        else:
            match.status = 'rejected'
            match.save(update_fields=['status'])

        out = MatchSerializer(match, context={'request': request}).data
        if conv_id:
            out['conversation_id'] = conv_id
        return Response(out, status=status.HTTP_200_OK)
