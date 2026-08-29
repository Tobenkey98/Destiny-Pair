from django.conf import settings
from django.db.models import Avg
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsSuperAdminOrOperationsAdmin
from . import services
from .models import BotConversation, BotFeedback, BotMessage, BotTicket
from .serializers import (
    BotConversationSerializer,
    BotFeedbackSerializer,
    BotTicketDetailSerializer,
    BotTicketSerializer,
    BotTicketUpdateSerializer,
    EscalateSerializer,
    FeedbackSerializer,
    SendMessageSerializer,
)


def _get_conversation(session_id):
    return BotConversation.objects.filter(session_id=session_id).order_by('-updated_at').first()


def _resolve_session(request, session_id):
    """Bind authenticated users to their own account-owned conversation.

    Guest sessions are grouped by their random ``session_id``. A signed-in
    user can never follow or hijack another guest session — their chat is
    always scoped to (and stored under) their own account.
    """
    user = request.user
    if user.is_authenticated:
        conv = BotConversation.objects.filter(user=user).order_by('-updated_at').first()
        return conv, f"u{user.id}"
    return _get_conversation(session_id), session_id


def _attach_user(conversation, user):
    if not user or not user.is_authenticated:
        return False
    if conversation.user_id is not None and conversation.user_id != user.id:
        return False
    conversation.user = user
    conversation.save(update_fields=['user', 'updated_at'])
    return True


def _record_message(conversation, role, content, latency_ms=None):
    return BotMessage.objects.create(
        conversation=conversation, role=role, content=content, latency_ms=latency_ms,
    )


def _trim_history(conversation, max_msgs=None):
    """Keep the conversation small enough for the context window."""
    max_msgs = max_msgs or settings.CHATBOT_MAX_HISTORY
    ids = list(
        conversation.messages.filter(role__in=['user', 'assistant'])
        .order_by('-created_at').values_list('id', flat=True)[:max_msgs]
    )
    return list(
        conversation.messages.filter(pk__in=ids)
        .order_by('created_at').values_list('role', 'content')
    )


def _make_reply(conversation, user_message):
    """Extract the bot answer, storing fallback + auto-escalation on failure."""
    history = _trim_history(conversation)
    started = timezone.now()
    try:
        if not services.is_configured():
            raise RuntimeError('AI provider not configured')
        answer = services.chat_completion(services.build_messages(history))
    except Exception:
        answer = services.fallback_reply()
        services.auto_escalate(
            conversation,
            category='not_answered',
            summary=user_message[:2000],
        )
    latency_ms = int((timezone.now() - started).total_seconds() * 1000)
    _record_message(conversation, 'assistant', answer, latency_ms=latency_ms)
    return answer, conversation.status == 'escalated'


class ChatbotSendView(APIView):
    """POST /api/chatbot/"""

    permission_classes = []

    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session_id = serializer.validated_data['session_id'].strip()
        message = serializer.validated_data['message']

        ip = services.client_ip(request)
        if services.rate_limit_exceeded(ip, session_id):
            return Response(
                {'error': "You've sent a lot of messages at once. Please wait a moment and try again."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        conversation, session_id = _resolve_session(request, session_id)
        if conversation is None:
            conversation = BotConversation.objects.create(
                session_id=session_id,
                title=message[:150],
                ip_address=ip,
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:2000],
            )
        if not _attach_user(conversation, request.user):
            return Response(
                {'error': 'This conversation belongs to another account.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not conversation.title:
            conversation.title = message[:150]
            conversation.save(update_fields=['title', 'updated_at'])
        _record_message(conversation, 'user', message)

        reply, escalated = _make_reply(conversation, message)

        return Response({
            'reply': reply,
            'session_id': session_id,
            'conversation_id': conversation.id,
            'escalated': escalated,
        })


class ChatbotEscalateView(APIView):
    """POST /api/chatbot/escalate/ — raise a ticket for human support."""

    permission_classes = []

    def post(self, request):
        serializer = EscalateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session_id = serializer.validated_data['session_id']
        category = serializer.validated_data['category']
        description = serializer.validated_data.get('description') or ''

        conversation, session_id = _resolve_session(request, session_id)
        if conversation is None:
            conversation = BotConversation.objects.create(
                session_id=session_id,
                title='Escalation without previous chat',
                ip_address=services.client_ip(request),
            )
        if not _attach_user(conversation, request.user):
            return Response(
                {'error': 'This conversation belongs to another account.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Preserve the user's latest statement as the summary.
        last_user = (
            conversation.messages.filter(role='user')
            .order_by('-created_at').first()
        )
        summary = description or (last_user.content if last_user else '') or 'User requested human support'
        ticket = services.auto_escalate(conversation, category=category, summary=summary)

        return Response({
            'ticket_id': ticket.id,
            'status': ticket.status,
            'message': 'Thanks — your report has been sent to our support team. '
                       'We will get back to you, usually within 1 business day.',
        })


class ChatbotFeedbackView(APIView):
    """POST /api/chatbot/feedback/ — thumbs up/down that improves the bot."""

    permission_classes = []

    def post(self, request):
        serializer = FeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session_id = serializer.validated_data['session_id']
        conversation, session_id = _resolve_session(request, session_id)
        if conversation is None:
            return Response({'message': 'Feedback recorded.'})

        if not _attach_user(conversation, request.user):
            return Response(
                {'error': 'This conversation belongs to another account.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        BotFeedback.objects.create(
            conversation=conversation,
            user=request.user if request.user.is_authenticated else None,
            rating=serializer.validated_data.get('rating'),
            comment=serializer.validated_data.get('comment') or '',
        )
        return Response({'message': 'Thanks for your feedback.'})


class ChatbotConfigView(APIView):
    """GET /api/chatbot/config/ — lets the widget know if live AI is reachable."""

    permission_classes = []

    def get(self, request):
        from django.conf import settings
        return Response({
            'enabled': services.is_configured(),
            'model': settings.CHATBOT_MODEL,
        })


# ---------------------------------------------------------------------------
# Admin endpoints (mounted under /api/admin/chatbot/)
# ---------------------------------------------------------------------------

class AdminChatbotTicketListView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def get(self, request):
        status_filter = request.query_params.get('status')
        qs = BotTicket.objects.select_related('conversation', 'user').all()
        if status_filter:
            qs = qs.filter(status=status_filter)
        tickets = [
            BotTicketSerializer(t).data
            for t in qs[:200]
        ]
        return Response(tickets)


class AdminChatbotTicketDetailView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def get(self, request, ticket_id):
        ticket = BotTicket.objects.filter(pk=ticket_id, conversation__isnull=False).select_related('conversation', 'user').first()
        if not ticket:
            return Response({'error': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(BotTicketDetailSerializer(ticket).data)


class AdminChatbotTicketUpdateView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def patch(self, request, ticket_id):
        ticket = BotTicket.objects.filter(pk=ticket_id).first()
        if not ticket:
            return Response({'error': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = BotTicketUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')
        note = serializer.validated_data.get('resolution_note')
        if note is not None:
            ticket.resolution_note = note
        if new_status == 'resolved':
            ticket.status = 'resolved'
            ticket.resolved_at = timezone.now()
        elif new_status:
            ticket.status = new_status
            if new_status != 'resolved':
                ticket.resolved_at = None
        ticket.save(update_fields=['status', 'resolution_note', 'resolved_at', 'updated_at'])

        conversation = ticket.conversation
        if conversation:
            if new_status == 'resolved' and conversation.status != 'resolved':
                conversation.status = 'resolved'
                conversation.resolved_at = timezone.now()
            elif conversation.status == 'escalated' and new_status and new_status != 'resolved':
                conversation.status = 'active'
                conversation.escalated_at = None
            conversation.save(update_fields=['status', 'escalated_at', 'resolved_at', 'updated_at'])

        return Response(BotTicketSerializer(ticket).data)


class AdminChatbotConversationListView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def get(self, request):
        qs = BotConversation.objects.select_related('user').all()[:200]
        return Response(BotConversationSerializer(qs, many=True).data)


class AdminChatbotStatsView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def get(self, request):
        total = BotConversation.objects.count()
        open_tickets = BotTicket.objects.filter(status__in=['new', 'in_review']).count()
        resolved = BotTicket.objects.filter(status='resolved').count()
        avg_rating = BotFeedback.objects.exclude(rating__isnull=True).aggregate(
            avg=Avg('rating')
        )['avg']
        return Response({
            'conversations': total,
            'open_tickets': open_tickets,
            'resolved_tickets': resolved,
            'average_rating': round(avg_rating or 0, 2),
            'feedback_count': BotFeedback.objects.count(),
        })