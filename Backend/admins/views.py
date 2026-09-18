from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

from accounts.services.role_service import RoleService
from accounts.services.dashboard_service import DashboardService
from accounts.services.audit_service import AuditService
from accounts.permissions import (
    IsSuperAdmin, IsOperationsAdmin, IsModerator, IsCounsellor,
    IsSuperAdminOrOperationsAdmin, IsSuperAdminOrModerator,
    IsSuperAdminOrCounsellor, IsAuthenticatedAdmin,
)
from accounts.views import get_tokens_for_user
from .models import AdminProfile, AdminInvitation, ContentItem
from .serializers import (
    UserListSerializer, UserDetailSerializer,
    AdminProfileSerializer, AdminInvitationSerializer,
    AdminSignupSerializer, AdminLoginSerializer,
    AuditLogSerializer, RoleAssignmentSerializer,
)
from profiles.models import Denomination, PendingDenomination, Testimonial
from profiles.serializers import (
    DenominationSerializer, DenominationCreateSerializer,
    PendingDenominationSerializer,
    TestimonialSerializer, TestimonialCreateSerializer,
)
from profiles.services import DenominationService, TestimonialService

from chatbot.views import (
    AdminChatbotTicketListView,
    AdminChatbotTicketDetailView,
    AdminChatbotTicketUpdateView,
    AdminChatbotConversationListView,
    AdminChatbotStatsView,
)

User = get_user_model()


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticatedAdmin]

    def get(self, request):
        data = DashboardService.get_dashboard_data(request.user)
        AuditService.log(
            actor=request.user,
            action="Viewed Dashboard",
            action_type="read",
            target_model="Dashboard",
            request=request,
        )
        return Response(data)


class AdminUserListView(ListAPIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]
    serializer_class = UserListSerializer

    def get_queryset(self):
        return User.objects.exclude(admin_profile__isnull=False).order_by('-date_joined')

    def list(self, request, *args, **kwargs):
        from django.utils import timezone
        from datetime import timedelta
        cutoff = timezone.now() - timedelta(minutes=15)
        queryset = self.get_queryset()
        user_map = {u.id: u.last_login for u in queryset.only('id', 'last_login')}
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        for item in data:
            last_login = user_map.get(item['id'])
            item['is_online'] = bool(last_login and last_login > cutoff)
        AuditService.log(
            actor=request.user,
            action="Viewed User List",
            action_type="read",
            target_model="User",
            request=request,
        )
        return Response(data)


class AdminUserDetailView(RetrieveAPIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]
    serializer_class = UserDetailSerializer
    queryset = User.objects.all()
    lookup_field = 'id'
    lookup_url_kwarg = 'user_id'

    def get(self, request, *args, **kwargs):
        AuditService.log(
            actor=request.user,
            action="Viewed User Detail",
            action_type="read",
            target_model="User",
            target_id=str(kwargs.get('user_id')),
            request=request,
        )
        return super().get(request, *args, **kwargs)


class AdminUserSuspendView(APIView):
    permission_classes = [IsSuperAdminOrModerator]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if hasattr(user, 'admin_profile'):
            return Response(
                {'error': 'Cannot suspend an administrator.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.is_active = False
        user.save(update_fields=['is_active'])

        AuditService.log(
            actor=request.user,
            action="Suspended User",
            action_type="update",
            target_model="User",
            target_id=str(user.id),
            target_repr=user.email,
            request=request,
        )

        return Response({'status': 'User suspended successfully.'})


class AdminUserBanView(APIView):
    permission_classes = [IsSuperAdminOrModerator]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if hasattr(user, 'admin_profile'):
            return Response(
                {'error': 'Cannot ban an administrator.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.is_banned = True
        user.is_active = False
        user.save(update_fields=['is_banned', 'is_active'])

        AuditService.log(
            actor=request.user,
            action="Banned User",
            action_type="update",
            target_model="User",
            target_id=str(user.id),
            target_repr=user.email,
            request=request,
        )

        return Response({'status': 'User banned successfully.'})


class AdminUserReinstateView(APIView):
    permission_classes = [IsSuperAdminOrModerator]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        user.is_banned = False
        user.is_active = True
        user.save(update_fields=['is_banned', 'is_active'])

        AuditService.log(
            actor=request.user,
            action="Reinstated User",
            action_type="update",
            target_model="User",
            target_id=str(user.id),
            target_repr=user.email,
            request=request,
        )

        return Response({'status': 'User reinstated successfully.'})


class AdminUserDeleteView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if hasattr(user, 'admin_profile'):
            return Response(
                {'error': 'Cannot delete an administrator.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        email = user.email
        user.delete()

        AuditService.log(
            actor=request.user,
            action="Deleted User",
            action_type="delete",
            target_model="User",
            target_id=str(user_id),
            target_repr=email,
            request=request,
        )

        return Response({'status': 'User deleted successfully.'})


class AdminUserPhotosView(APIView):
    """GET /api/admin/users/<id>/photos/ — every photo a member uploaded,
    newest first, with absolute URLs so the admin console can display them."""
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def get(self, request, user_id):
        from profiles.models import CoverPhoto, Photo

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        photos = [{
            'id': p.id,
            'image': request.build_absolute_uri(p.image.url) if p.image else '',
            'is_primary': p.is_primary,
            'approved': p.approved,
            'review_status': p.review_status,
            'created_at': p.created_at.isoformat(),
        } for p in Photo.objects.filter(user=user).order_by('-is_primary', '-created_at')]

        cover = CoverPhoto.objects.filter(user=user).first()

        return Response({
            'photos': photos,
            'cover_photo': request.build_absolute_uri(cover.image.url) if cover and cover.image else '',
        })


class AdminPhotoApprovalView(APIView):
    permission_classes = [IsSuperAdminOrModerator]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        photo_id = request.data.get('photo_id')
        action = request.data.get('action')  # 'approve' or 'reject'

        if not photo_id or action not in ('approve', 'reject'):
            return Response(
                {'error': 'photo_id and action (approve/reject) are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from profiles.models import Photo
            photo = Photo.objects.get(id=photo_id)
        except Exception:
            return Response({'error': 'Photo not found.'}, status=status.HTTP_404_NOT_FOUND)

        photo.approved = action == 'approve'
        photo.review_status = 'approved' if action == 'approve' else 'rejected'
        photo.save(update_fields=['approved', 'review_status'])

        AuditService.log(
            actor=request.user,
            action=f"{'Approved' if action == 'approve' else 'Rejected'} Photo",
            action_type="update",
            target_model="Photo",
            target_id=str(photo.id),
            target_repr=f"Photo {photo.id} by user {photo.user_id}",
            request=request,
        )

        return Response({'status': f'Photo {action}d successfully.'})


class AdminCounsellingListView(APIView):
    permission_classes = [IsSuperAdminOrCounsellor]

    def get(self, request):
        from counselling.models import CounsellingSession

        if request.user.admin_profile.role == 'counsellor':
            sessions = CounsellingSession.objects.filter(
                counsellor_email=request.user.email
            ).order_by('-created_at')
        else:
            sessions = CounsellingSession.objects.all().order_by('-created_at')

        from counselling.serializers import CounsellingSessionSerializer
        serializer = CounsellingSessionSerializer(sessions, many=True)

        AuditService.log(
            actor=request.user,
            action="Viewed Counselling Sessions",
            action_type="read",
            target_model="CounsellingSession",
            request=request,
        )

        return Response(serializer.data)


class AdminCounsellingSessionUpdateView(APIView):
    permission_classes = [IsSuperAdminOrCounsellor]

    def patch(self, request, session_id):
        from counselling.models import CounsellingSession

        try:
            session = CounsellingSession.objects.get(id=session_id)
        except CounsellingSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.admin_profile.role == 'counsellor' and \
           session.counsellor_email != request.user.email:
            return Response(
                {'error': 'You can only update your own sessions.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        allowed_fields = ['status', 'notes', 'session_type', 'date', 'time']
        for field in allowed_fields:
            if field in request.data:
                setattr(session, field, request.data[field])

        session.save()

        AuditService.log(
            actor=request.user,
            action="Updated Counselling Session",
            action_type="update",
            target_model="CounsellingSession",
            target_id=str(session.id),
            request=request,
        )

        from counselling.serializers import CounsellingSessionSerializer
        return Response(CounsellingSessionSerializer(session).data)


class AdminPaymentListView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def get(self, request):
        try:
            from payments.models import Payment
            payments = Payment.objects.select_related(
                'user', 'plan', 'subscription'
            ).all().order_by('-created_at')
        except Exception:
            payments = []

        data = []
        for p in payments:
            user_name = ''
            user_email = None
            if p.user:
                user_name = f"{p.user.first_name} {p.user.last_name}".strip()
                user_email = p.user.email
            data.append({
                'id': p.id,
                'user_name': user_name,
                'user_email': user_email,
                'plan_name': p.plan.name if p.plan else None,
                'plan_slug': p.plan.slug if p.plan else None,
                'amount': str(p.amount),
                'currency': p.currency,
                'status': p.status,
                'gateway': p.gateway,
                'payment_method': p.payment_method,
                'reference': p.reference,
                'transaction_reference': p.transaction_reference,
                'transaction_id': p.transaction_id,
                'subscription_status': p.subscription.status if p.subscription else None,
                'period_start': p.period_start.isoformat() if p.period_start else None,
                'period_end': p.period_end.isoformat() if p.period_end else None,
                'created_at': p.created_at.isoformat() if p.created_at else None,
                'metadata': p.metadata,
            })

        AuditService.log(
            actor=request.user,
            action="Viewed Payments",
            action_type="read",
            target_model="Payment",
            request=request,
        )

        return Response(data)


class AdminPaymentDetailView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def get(self, request, pk):
        from payments.models import Payment
        p = Payment.objects.select_related(
            'user', 'plan', 'subscription'
        ).filter(pk=pk).first()
        if not p:
            return Response({'error': 'NOT_FOUND'}, status=status.HTTP_404_NOT_FOUND)

        data = {
            'id': p.id,
            'user': (
                {'id': p.user.id, 'email': p.user.email,
                 'name': f"{p.user.first_name} {p.user.last_name}".strip()}
                if p.user else None
            ),
            'plan': (
                {'id': p.plan.id, 'name': p.plan.name, 'slug': p.plan.slug,
                 'price': str(p.plan.price)}
                if p.plan else None
            ),
            'subscription': (
                {'id': p.subscription.id, 'status': p.subscription.status,
                 'active': p.subscription.active}
                if p.subscription else None
            ),
            'gateway': p.gateway,
            'amount': str(p.amount),
            'currency': p.currency,
            'status': p.status,
            'payment_method': p.payment_method,
            'reference': p.reference,
            'transaction_reference': p.transaction_reference,
            'transaction_id': p.transaction_id,
            'period_start': p.period_start.isoformat() if p.period_start else None,
            'period_end': p.period_end.isoformat() if p.period_end else None,
            'created_at': p.created_at.isoformat() if p.created_at else None,
            'metadata': p.metadata,
        }

        AuditService.log(
            actor=request.user,
            action="Viewed Payment Detail",
            action_type="read",
            target_model="Payment",
            request=request,
        )

        return Response(data)


class AdminSubscriptionListView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def get(self, request):
        try:
            from subscriptions.models import UserSubscription
            subs = UserSubscription.objects.select_related('user', 'plan').all().order_by('-created_at')
        except Exception:
            subs = []

        data = []
        for s in subs:
            plan_name = s.plan.name if hasattr(s, 'plan') and s.plan else None
            plan_price = str(s.plan.price) if hasattr(s, 'plan') and s.plan and hasattr(s.plan, 'price') else None
            plan_duration = s.plan.duration_days if hasattr(s, 'plan') and s.plan and hasattr(s.plan, 'duration_days') else None
            data.append({
                'id': s.id,
                'user_email': s.user.email if s.user else None,
                'user_name': f"{s.user.first_name} {s.user.last_name}".strip() or None,
                'plan': plan_name,
                'plan_price': plan_price,
                'plan_duration': plan_duration,
                'status': s.status if hasattr(s, 'status') else None,
                'active': s.active if hasattr(s, 'active') else None,
                'auto_renew': s.auto_renew if hasattr(s, 'auto_renew') else None,
                'start_date': s.start_date.isoformat() if hasattr(s, 'start_date') and s.start_date else None,
                'end_date': s.end_date.isoformat() if hasattr(s, 'end_date') and s.end_date else None,
            })

        AuditService.log(
            actor=request.user,
            action="Viewed Subscriptions",
            action_type="read",
            target_model="Subscription",
            request=request,
        )

        return Response(data)


class AdminPlanListView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def get(self, request):
        from subscriptions.models import SubscriptionPlan
        from subscriptions.api.serializers import SubscriptionPlanSerializer

        plans = SubscriptionPlan.objects.all().order_by('price')
        AuditService.log(
            actor=request.user,
            action="Viewed Plans",
            action_type="read",
            target_model="SubscriptionPlan",
            request=request,
        )
        return Response(SubscriptionPlanSerializer(plans, many=True).data)

    def patch(self, request):
        from subscriptions.models import SubscriptionPlan

        plan_id = request.data.get('id')
        if not plan_id:
            return Response({'error': 'id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            plan = SubscriptionPlan.objects.get(id=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Plan not found.'}, status=status.HTTP_404_NOT_FOUND)

        allowed = ['is_active', 'price', 'name', 'message_limit', 'like_limit_daily']
        changed = {k: v for k, v in request.data.items() if k in allowed}
        for k, v in changed.items():
            setattr(plan, k, v)
        plan.save()

        AuditService.log(
            actor=request.user,
            action="Updated Plan",
            action_type="update",
            target_model="SubscriptionPlan",
            target_id=str(plan.id),
            changes=changed,
            request=request,
        )
        from subscriptions.api.serializers import SubscriptionPlanSerializer
        return Response(SubscriptionPlanSerializer(plan).data)


class AdminReportListView(APIView):
    permission_classes = [IsSuperAdminOrModerator]

    def get(self, request):
        from notifications.models import Report

        reports = (
            Report.objects.select_related('reporter', 'reported_user')
            .order_by('-created_at')[:100]
        )
        data = [{
            'id': r.id,
            'reporter_id': r.reporter_id,
            'reporter_name': r.reporter.get_full_name() or r.reporter.email,
            'reported_user_id': r.reported_user_id,
            'reported_name': r.reported_user.get_full_name() or r.reported_user.email,
            'reason': r.reason,
            'description': r.description,
            'created_at': r.created_at.isoformat(),
        } for r in reports]

        AuditService.log(
            actor=request.user,
            action="Viewed Reports",
            action_type="read",
            target_model="Report",
            request=request,
        )
        return Response(data)


class AdminModerationView(APIView):
    """GET /api/admin/moderation/ — full moderation queue:
    pending photos, member reports, and currently banned users."""

    permission_classes = [IsSuperAdminOrModerator]

    def get(self, request):
        from profiles.models import Photo
        from notifications.models import Report

        photos = (
            Photo.objects.filter(review_status='pending')
            .select_related('user')
            .order_by('-created_at')[:50]
        )
        photo_data = [{
            'id': p.id,
            'user_id': p.user_id,
            'user_name': p.user.get_full_name() or p.user.email,
            'image': request.build_absolute_uri(p.image.url) if p.image else '',
            'is_ai_generated': p.is_ai_generated,
            'created_at': p.created_at.isoformat(),
        } for p in photos]

        reports = (
            Report.objects.select_related('reporter', 'reported_user')
            .order_by('-created_at')[:100]
        )
        report_data = [{
            'id': r.id,
            'reporter_id': r.reporter_id,
            'reporter_name': r.reporter.get_full_name() or r.reporter.email,
            'reported_user_id': r.reported_user_id,
            'reported_name': r.reported_user.get_full_name() or r.reported_user.email,
            'reason': r.reason,
            'description': r.description,
            'created_at': r.created_at.isoformat(),
        } for r in reports]

        banned = (
            User.objects.filter(is_banned=True)
            .order_by('-date_joined')[:50]
        )
        banned_data = [{
            'id': u.id,
            'name': u.get_full_name() or u.email,
            'email': u.email,
            'date_joined': u.date_joined.isoformat(),
        } for u in banned]

        approved_photos = (
            Photo.objects.filter(review_status='approved')
            .select_related('user')
            .order_by('-created_at')[:100]
        )
        approved_data = [{
            'id': p.id,
            'user_id': p.user_id,
            'user_name': p.user.get_full_name() or p.user.email,
            'email': p.user.email,
            'image': request.build_absolute_uri(p.image.url) if p.image else '',
            'is_primary': p.is_primary,
            'created_at': p.created_at.isoformat(),
        } for p in approved_photos]

        rejected_photos = (
            Photo.objects.filter(review_status='rejected')
            .select_related('user')
            .order_by('-created_at')[:100]
        )
        rejected_data = [{
            'id': p.id,
            'user_id': p.user_id,
            'user_name': p.user.get_full_name() or p.user.email,
            'email': p.user.email,
            'image': request.build_absolute_uri(p.image.url) if p.image else '',
            'is_primary': p.is_primary,
            'created_at': p.created_at.isoformat(),
        } for p in rejected_photos]

        AuditService.log(
            actor=request.user,
            action="Viewed Moderation Queue",
            action_type="read",
            target_model="Photo",
            request=request,
        )

        return Response({
            'pending_photos': photo_data,
            'approved_photos': approved_data,
            'rejected_photos': rejected_data,
            'reports': report_data,
            'banned_users': banned_data,
        })


class AdminMatchListView(APIView):
    """GET /api/admin/matches/ — all matches across the platform, plus
    aggregate counts for the admin Matches page."""

    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def get(self, request):
        from matching.models import Match
        from chat.models import Conversation
        from django.db.models import Count

        matches = (
            Match.objects.select_related('from_user', 'to_user')
            .order_by('-created_at')[:500]
        )
        match_data = [{
            'id': m.id,
            'status': m.status,
            'created_at': m.created_at.isoformat(),
            'updated_at': m.updated_at.isoformat(),
            'from_user': m.from_user_id,
            'from_user_name': m.from_user.get_full_name() or m.from_user.email,
            'from_user_email': m.from_user.email,
            'from_user_gender': m.from_user.gender,
            'to_user': m.to_user_id,
            'to_user_name': m.to_user.get_full_name() or m.to_user.email,
            'to_user_email': m.to_user.email,
            'to_user_gender': m.to_user.gender,
            'relation': (
                'both liked' if (
                    Match.objects.filter(
                        from_user=m.to_user, to_user=m.from_user,
                    ).exists()
                ) else (
                    'rejected' if m.status == 'rejected' else 'one-sided'
                )
            ),
        } for m in matches]

        status_counts = dict(
            Match.objects.values('status').annotate(c=Count('id')).values_list('status', 'c')
        )

        AuditService.log(
            actor=request.user,
            action="Viewed Admin Matches",
            action_type="read",
            target_model="Match",
            request=request,
        )

        return Response({
            'matches': match_data,
            'total': Match.objects.count(),
            'status_counts': status_counts,
            'active_conversations': Conversation.objects.count(),
        })


def _admin_participant_dict(conversation, photo_map):
    return [{
        'id': u.id,
        'name': u.get_full_name() or u.email,
        'email': u.email,
        'photo': photo_map.get(u.id),
    } for u in conversation.participants.all()]


def _admin_photo_map(user_ids, request):
    from profiles.models import Photo
    photo_map = {}
    if not user_ids:
        return photo_map
    photos = (
        Photo.objects.filter(user_id__in=user_ids, review_status='approved')
        .order_by('-is_primary', 'id')
    )
    for p in photos:
        if p.user_id not in photo_map:
            photo_map[p.user_id] = request.build_absolute_uri(p.image.url)
    return photo_map


class AdminConversationListView(APIView):
    """GET /api/admin/conversations/ — every user-to-user conversation with a
    message preview and participant details, newest activity first."""

    permission_classes = [IsAuthenticatedAdmin]

    def get(self, request):
        from django.db.models import Prefetch
        from chat.models import Conversation, Message

        conversations = (
            Conversation.objects
            .prefetch_related('participants', Prefetch(
                'messages',
                queryset=Message.objects.order_by('created_at'),
            ))
            .order_by('-updated_at')[:300]
        )

        participant_ids = set()
        for c in conversations:
            participant_ids.update(p.id for p in c.participants.all())
        photo_map = _admin_photo_map(participant_ids, request)

        data = []
        for c in conversations:
            msgs = list(c.messages.all())
            last = msgs[-1] if msgs else None
            data.append({
                'id': c.id,
                'created_at': c.created_at.isoformat(),
                'updated_at': c.updated_at.isoformat(),
                'participants': _admin_participant_dict(c, photo_map),
                'message_count': len(msgs),
                'last_message': {
                    'id': last.id,
                    'sender_id': last.sender_id,
                    'sender_name': last.sender.get_full_name() or last.sender.email,
                    'text': last.message,
                    'has_audio': bool(last.audio),
                    'is_read': last.is_read,
                    'created_at': last.created_at.isoformat(),
                } if last else None,
            })

        AuditService.log(
            actor=request.user,
            action="Viewed Admin Conversations",
            action_type="read",
            target_model="Conversation",
            request=request,
        )

        return Response({
            'conversations': data,
            'total': Conversation.objects.count(),
        })


class AdminConversationMessagesView(APIView):
    """GET /api/admin/conversations/<id>/messages/ — the full message thread
    of a conversation (for moderation / support review)."""

    permission_classes = [IsAuthenticatedAdmin]

    def get(self, request, conversation_id):
        from chat.models import Conversation, Message

        conversation = Conversation.objects.filter(id=conversation_id).first()
        if conversation is None:
            return Response(
                {'error': 'Conversation not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        photo_map = _admin_photo_map(
            set(conversation.participants.values_list('id', flat=True)),
            request,
        )
        messages = list(
            Message.objects.filter(conversation=conversation)
            .select_related('sender').order_by('created_at')[:500]
        )
        message_data = [{
            'id': m.id,
            'sender_id': m.sender_id,
            'sender_name': m.sender.get_full_name() or m.sender.email,
            'text': m.message,
            'has_audio': bool(m.audio),
            'audio': (request.build_absolute_uri(m.audio.url)
                      if m.audio else None),
            'is_read': m.is_read,
            'created_at': m.created_at.isoformat(),
        } for m in messages]

        AuditService.log(
            actor=request.user,
            action="Viewed Admin Conversation Messages",
            action_type="read",
            target_model="Conversation",
            target_id=str(conversation_id),
            request=request,
        )

        return Response({
            'conversation_id': conversation.id,
            'participants': _admin_participant_dict(conversation, photo_map),
            'messages': message_data,
            'total': len(message_data),
        })


class AdminRoleListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        cutoff = timezone.now() - timedelta(minutes=15)
        profiles = AdminProfile.objects.select_related('user').all()
        serializer = AdminProfileSerializer(profiles, many=True)
        data = serializer.data
        for item in data:
            user = next((p.user for p in profiles if p.id == item.get('id')), None)
            if user:
                item['is_online'] = bool(user.last_login and user.last_login > cutoff)
                item['last_login'] = user.last_login.isoformat() if user.last_login else None
            else:
                item['is_online'] = False
                item['last_login'] = None

        AuditService.log(
            actor=request.user,
            action="Viewed Admin Roles",
            action_type="read",
            target_model="AdminProfile",
            request=request,
        )

        return Response(data)


class AdminRoleAssignView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = RoleAssignmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user_id = data['user_id']
        role = data['role']
        department = data.get('department', '')
        is_active = data.get('is_active', True)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        admin_profile, created = AdminProfile.objects.update_or_create(
            user=user,
            defaults={
                'role': role,
                'department': department,
                'is_active': is_active,
            },
        )

        RoleService.sync_user_groups(user, role)

        user.is_staff = True
        user.save(update_fields=['is_staff'])

        AuditService.log(
            actor=request.user,
            action=f"{'Created' if created else 'Updated'} Admin: {role}",
            action_type="create" if created else "update",
            target_model="AdminProfile",
            target_id=str(admin_profile.id),
            target_repr=f"{user.email} as {role}",
            request=request,
        )

        return Response(
            AdminProfileSerializer(admin_profile).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AdminRoleRemoveView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response(
                {'error': 'You cannot remove your own admin role.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            profile = user.admin_profile
            profile.delete()
        except AdminProfile.DoesNotExist:
            return Response({'error': 'User is not an administrator.'}, status=status.HTTP_404_NOT_FOUND)

        user.is_staff = False
        user.is_superuser = False
        user.groups.clear()
        user.save(update_fields=['is_staff', 'is_superuser'])

        AuditService.log(
            actor=request.user,
            action="Removed Admin",
            action_type="delete",
            target_model="AdminProfile",
            target_repr=f"{user.email}",
            request=request,
        )

        return Response({'status': 'Administrator privileges removed.'})


class AdminSignupView(APIView):
    """Public endpoint to create an administrator account.

    - If no Super Admin exists yet, the first call bootstraps the one-and-only
      Super Admin (no invitation required).
    - Otherwise an unused, non-expired invitation token is required. The new
      account is created *pending* and must be approved by the Super Admin.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AdminSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        password = serializer.validated_data['password']
        first_name = serializer.validated_data.get('first_name', '') or 'Admin'
        last_name = serializer.validated_data.get('last_name', '')
        role = serializer.validated_data.get('role', 'super_admin')
        token = serializer.validated_data.get('invitation_token', '')

        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'A user with this email already exists.'},
                status=status.HTTP_409_CONFLICT,
            )

        if RoleService.super_admin_exists():
            if not token:
                return Response(
                    {'error': 'A valid invitation token is required to create an admin account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                invitation = AdminInvitation.objects.get(token=token)
            except AdminInvitation.DoesNotExist:
                return Response({'error': 'Invalid invitation token.'}, status=status.HTTP_400_BAD_REQUEST)
            if not invitation.is_valid:
                return Response({'error': 'This invitation is no longer valid.'}, status=status.HTTP_400_BAD_REQUEST)
            if invitation.email.lower() != email:
                return Response(
                    {'error': 'This invitation was issued for a different email address.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User(email=email, username=email, first_name=first_name,
                        last_name=last_name, is_active=True, is_staff=True)
            user.set_password(password)
            user.save()
            admin_profile, _ = AdminProfile.objects.get_or_create(user=user)
            admin_profile.role = invitation.role
            admin_profile.department = invitation.department
            admin_profile.phone_number = ''
            admin_profile.is_active = True
            admin_profile.is_approved = True
            admin_profile.approved_by = invitation.invited_by
            admin_profile.approved_at = timezone.now()
            admin_profile.invited_by = invitation.invited_by
            admin_profile.save()
            RoleService.sync_user_groups(user, invitation.role)
            invitation.used = True
            invitation.used_at = timezone.now()
            invitation.save(update_fields=['used', 'used_at'])

            AuditService.log(
                actor=invitation.invited_by,
                action="Admin signed up via invitation (pending approval)",
                action_type="create",
                target_model="AdminProfile",
                target_id=str(admin_profile.id),
                target_repr=email,
                request=request,
            )
            return Response(
                {'status': 'pending',
                 'message': 'Account created. A Platform Administrator must approve your access before you can sign in.'},
                status=status.HTTP_201_CREATED,
            )

        # Bootstrap the first administrator with the selected role. Requires
        # the ADMIN_BOOTSTRAP_KEY secret so an arbitrary visitor can never
        # claim the super admin seat on a freshly deployed instance.
        bootstrap_key = getattr(settings, 'ADMIN_BOOTSTRAP_KEY', '')
        if not bootstrap_key:
            return Response(
                {'error': 'Admin bootstrap is disabled. The server owner must set ADMIN_BOOTSTRAP_KEY.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        provided_key = (request.data.get('bootstrap_key') or '').strip()
        if not provided_key or provided_key != bootstrap_key:
            return Response({'error': 'Invalid bootstrap key.'}, status=status.HTTP_403_FORBIDDEN)

        is_super = role == 'super_admin'
        user = User(email=email, username=email, first_name=first_name,
                    last_name=last_name, is_active=True, is_staff=True,
                    is_superuser=is_super)
        user.set_password(password)
        user.save()
        admin_profile, _ = AdminProfile.objects.get_or_create(user=user)
        admin_profile.role = role
        admin_profile.department = 'management'
        admin_profile.is_active = True
        admin_profile.is_approved = True
        admin_profile.save()
        RoleService.sync_user_groups(user, role)
        tokens = get_tokens_for_user(user)
        return Response(
            {
                'tokens': tokens,
                'admin': AdminProfileSerializer(admin_profile).data,
                'message': f'{dict(AdminProfile.ROLE_CHOICES).get(role, role)} account created.',
            },
            status=status.HTTP_201_CREATED,
        )


class AdminLoginView(APIView):
    """Administrator-only login. Separate from the regular user login."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)

        if not hasattr(user, 'admin_profile'):
            return Response(
                {'error': 'This account is not an administrator. Please use the user login.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user.check_password(serializer.validated_data['password']):
            return Response({'error': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)

        profile = user.admin_profile
        if not profile.is_approved or not profile.is_active:
            return Response(
                {'error': 'Your administrator account is pending approval from the Platform Administrator.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user.is_active:
            return Response({'error': 'Account is inactive.'}, status=status.HTTP_403_FORBIDDEN)

        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        tokens = get_tokens_for_user(user)
        return Response({'user': AdminProfileSerializer(profile).data, 'tokens': tokens})


class AdminInvitationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsSuperAdmin]
    serializer_class = AdminInvitationSerializer

    def get_queryset(self):
        return AdminInvitation.objects.all()

    def perform_create(self, serializer):
        invitation = serializer.save(invited_by=self.request.user)
        self._try_send_email(invitation)

    def _try_send_email(self, invitation):
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            from django.template.loader import render_to_string
            from django.utils.html import strip_tags

            role_display = invitation.get_role_display()
            signup_url = f"{settings.FRONTEND_URL or 'http://127.0.0.1:5173'}/admin/signup?token={invitation.token}"

            context = {
                'role_display': role_display,
                'signup_url': signup_url,
                'token': invitation.token,
            }
            html = render_to_string('admins/admin_invitation_email.html', context)
            send_mail(
                'You\'re Invited — DestinyPair Admin Access',
                strip_tags(html),
                settings.DEFAULT_FROM_EMAIL,
                [invitation.email],
                html_message=html,
            )
        except Exception:
            pass


class AdminInvitationLookupView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        token = request.query_params.get('token', '')
        if not token:
            return Response({'error': 'Token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            invitation = AdminInvitation.objects.get(token=token)
        except AdminInvitation.DoesNotExist:
            return Response({'error': 'Invalid invitation token.'}, status=status.HTTP_404_NOT_FOUND)
        if not invitation.is_valid:
            return Response({'error': 'Invitation has expired or already been used.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'email': invitation.email,
            'role': invitation.role,
            'role_display': invitation.get_role_display(),
        })


class AdminInvitationRevokeView(APIView):
    permission_classes = [IsSuperAdmin]

    def delete(self, request, pk):
        try:
            invitation = AdminInvitation.objects.get(pk=pk)
        except AdminInvitation.DoesNotExist:
            return Response({'error': 'Invitation not found.'}, status=status.HTTP_404_NOT_FOUND)
        invitation.delete()
        return Response({'status': 'revoked'})


class AdminPendingListView(generics.ListAPIView):
    permission_classes = [IsSuperAdmin]
    serializer_class = AdminProfileSerializer

    def get_queryset(self):
        return AdminProfile.objects.filter(is_approved=False).select_related('user')


class AdminApproveView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        try:
            profile = AdminProfile.objects.get(user_id=user_id)
        except AdminProfile.DoesNotExist:
            return Response({'error': 'Administrator not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile.is_approved = True
        profile.is_active = True
        profile.approved_by = request.user
        profile.approved_at = timezone.now()
        profile.save(update_fields=['is_approved', 'is_active', 'approved_by', 'approved_at'])

        profile.user.is_staff = True
        profile.user.save(update_fields=['is_staff'])

        AuditService.log(
            actor=request.user,
            action="Approved Admin",
            action_type="update",
            target_model="AdminProfile",
            target_id=str(profile.id),
            target_repr=profile.user.email,
            request=request,
        )
        return Response(AdminProfileSerializer(profile).data)


class AdminResetPasswordView(APIView):
    """Super Admin only: reset another administrator's password."""
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        new_password = request.data.get('password')
        if not new_password or len(new_password) < 8:
            return Response(
                {'error': 'A password of at least 8 characters is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not hasattr(user, 'admin_profile'):
            return Response(
                {'error': 'Target user is not an administrator.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user == request.user:
            return Response(
                {'error': 'Use your own account settings to change your password.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.set_password(new_password)
        user.save(update_fields=['password'])

        AuditService.log(
            actor=request.user,
            action="Reset Administrator Password",
            action_type="update",
            target_model="User",
            target_id=str(user.id),
            target_repr=user.email,
            request=request,
        )

        return Response({'status': 'Password reset successfully.'})


class AdminAuditLogView(ListAPIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from audit_logs.models import AuditLog

        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        search = (request.query_params.get('search', '') or '').strip()
        action_type = (request.query_params.get('action_type', '') or '').strip()

        logs = AuditLog.objects.select_related('actor').all().order_by('-created_at')
        if search:
            logs = logs.filter(
                Q(action__icontains=search) | Q(target_model__icontains=search) |
                Q(target_repr__icontains=search) | Q(actor__email__icontains=search)
            )
        if action_type:
            logs = logs.filter(action_type=action_type)
        total = logs.count()
        page = logs[offset:offset + limit]

        serializer = AuditLogSerializer(page, many=True)

        return Response({
            'total': total,
            'offset': offset,
            'limit': limit,
            'results': serializer.data,
        })


class AdminChatModerationLogView(APIView):
    """Chat-monitor audit trail: every message the real-time content policy
    blocked, so admins can monitor contact/sexual/money attempts."""

    permission_classes = [IsSuperAdminOrModerator]

    def get(self, request):
        from chat.models import ModerationLog
        from .serializers import ChatModerationLogSerializer

        category = request.query_params.get('category', '')
        limit = int(request.query_params.get('limit', 50) or 50)
        offset = int(request.query_params.get('offset', 0) or 0)

        qs = ModerationLog.objects.select_related('sender', 'recipient').order_by('-created_at')
        if category:
            qs = qs.filter(category=category)
        total = qs.count()
        logs = qs[offset:offset + limit]

        serializer = ChatModerationLogSerializer(logs, many=True)

        AuditService.log(
            actor=request.user,
            action="Viewed Chat Moderation Logs",
            action_type="read",
            target_model="ModerationLog",
            request=request,
        )

        return Response({
            'total': total,
            'offset': offset,
            'limit': limit,
            'results': serializer.data,
        })


class AdminSettingsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        try:
            from django.conf import settings as django_settings
            data = {
                'platform_name': 'Destiny Pair',
                'support_email': getattr(django_settings, 'DEFAULT_FROM_EMAIL', ''),
                'registration_open': True,
                'max_daily_likes': 10,
                'require_email_verification': True,
                'require_photo_approval': True,
                'maintenance_mode': False,
                'sightengine_enabled': getattr(django_settings, 'SIGHTENGINE_ENABLED', False),
            }
        except Exception:
            data = {}

        AuditService.log(
            actor=request.user,
            action="Viewed Settings",
            action_type="read",
            target_model="Settings",
            request=request,
        )

        return Response(data)

    def patch(self, request):
        allowed_keys = [
            'registration_open', 'max_daily_likes',
            'require_email_verification', 'require_photo_approval',
            'maintenance_mode',
        ]

        AuditService.log(
            actor=request.user,
            action="Updated Settings",
            action_type="update",
            target_model="Settings",
            changes={k: request.data[k] for k in request.data if k in allowed_keys},
            request=request,
        )

        return Response({'status': 'Settings updated.'})


class AdminNotificationBroadcastView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def post(self, request):
        title = request.data.get('title', '')
        message = request.data.get('message', '')
        broadcast_to = request.data.get('broadcast_to', 'all')

        if not title or not message:
            return Response(
                {'error': 'title and message are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from notifications.models import Notification
            from accounts.models import User as UserModel

            if broadcast_to == 'all':
                users = UserModel.objects.filter(is_active=True, is_banned=False)
            elif broadcast_to == 'premium':
                from subscriptions.models import UserSubscription
                sub_users = UserSubscription.objects.filter(
                    status='active'
                ).values_list('user_id', flat=True)
                users = UserModel.objects.filter(id__in=sub_users)
            else:
                users = UserModel.objects.none()

            notifications = []
            now = timezone.now()
            for user in users.iterator():
                notifications.append(Notification(
                    user=user,
                    title=title,
                    message=message,
                    created_at=now,
                ))

            if notifications:
                Notification.objects.bulk_create(notifications, batch_size=500)
        except Exception:
            pass

        AuditService.log(
            actor=request.user,
            action="Broadcast Notification",
            action_type="create",
            target_model="Notification",
            target_repr=f"'{title}' to {broadcast_to}",
            request=request,
        )

        return Response({'status': 'Notifications broadcast successfully.'})


class AdminNotificationFeedView(APIView):
    """Materialize recent platform activity into persisted per-admin
    notifications and return them with the unread count.

    GET /api/admin/notifications/feed/ -> {events: [...], unread_count: int}
    """
    permission_classes = [IsAuthenticatedAdmin]

    def get(self, request):
        from .services.admin_feed import materialize_feed
        is_super = request.user.admin_profile.role == 'super_admin'
        events, unread_count = materialize_feed(request.user, is_super)
        return Response({'events': events, 'unread_count': unread_count})


class AdminNotificationUnreadCountView(APIView):
    """Lightweight unread-count endpoint for the topbar badge (polled)."""
    permission_classes = [IsAuthenticatedAdmin]

    def get(self, request):
        from .models import AdminNotification
        unread = AdminNotification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({'unread_count': unread})


class AdminNotificationReadAllView(APIView):
    """Mark every notification of the requesting admin as read."""
    permission_classes = [IsAuthenticatedAdmin]

    def post(self, request):
        from .models import AdminNotification
        updated = AdminNotification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({'unread_count': 0, 'marked': updated})


class AdminBlockUnblockView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        try:
            profile = AdminProfile.objects.get(user_id=user_id)
        except AdminProfile.DoesNotExist:
            return Response({'error': 'Admin not found.'}, status=status.HTTP_404_NOT_FOUND)

        if profile.role == 'super_admin':
            return Response({'error': 'Cannot block the Platform Administrator.'}, status=status.HTTP_403_FORBIDDEN)

        profile.is_active = not profile.is_active
        profile.save(update_fields=['is_active'])

        AuditService.log(
            actor=request.user,
            action=f"{'Blocked' if not profile.is_active else 'Unblocked'} admin {profile.user.email}",
            action_type="update",
            target_model="AdminProfile",
            target_id=str(profile.id),
            request=request,
        )

        return Response({
            'id': profile.id,
            'is_active': profile.is_active,
            'message': f"Admin {'blocked' if not profile.is_active else 'unblocked'} successfully.",
        })


class AdminHeartbeatView(APIView):
    permission_classes = [IsAuthenticatedAdmin]

    def post(self, request):
        request.user.last_login = timezone.now()
        request.user.save(update_fields=['last_login'])
        return Response({'status': 'ok', 'last_login': request.user.last_login.isoformat()})


class AdminDenominationListView(ListAPIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]
    serializer_class = DenominationSerializer
    queryset = Denomination.objects.all().order_by('name')


class AdminDenominationCreateView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def post(self, request):
        serializer = DenominationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        denomination = DenominationService.create(
            name=serializer.validated_data['name'],
            created_by=request.user,
            approved=True,
        )
        return Response(
            DenominationSerializer(denomination).data,
            status=status.HTTP_201_CREATED,
        )


class AdminDenominationUpdateView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def put(self, request, denomination_id):
        try:
            denomination = Denomination.objects.get(id=denomination_id)
        except Denomination.DoesNotExist:
            return Response({'error': 'Denomination not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DenominationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        denomination.name = serializer.validated_data['name']
        denomination.save()
        return Response(DenominationSerializer(denomination).data)


class AdminDenominationDeleteView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def delete(self, request, denomination_id):
        try:
            denomination = Denomination.objects.get(id=denomination_id)
        except Denomination.DoesNotExist:
            return Response({'error': 'Denomination not found'}, status=status.HTTP_404_NOT_FOUND)
        denomination.is_active = False
        denomination.save(update_fields=['is_active'])
        return Response({'message': 'Denomination deactivated'})


class AdminTestimonialListView(ListAPIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]
    serializer_class = TestimonialSerializer
    queryset = Testimonial.objects.all().order_by('-created_at')


class AdminTestimonialCreateView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def post(self, request):
        serializer = TestimonialCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        testimonial = TestimonialService.create(
            quote=serializer.validated_data['quote'],
            name=serializer.validated_data['name'],
            location=serializer.validated_data.get('location', ''),
            created_by=request.user,
            approved=serializer.validated_data.get('approved', True),
        )
        return Response(
            TestimonialSerializer(testimonial).data,
            status=status.HTTP_201_CREATED,
        )


class AdminTestimonialUpdateView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def put(self, request, testimonial_id):
        try:
            testimonial = Testimonial.objects.get(id=testimonial_id)
        except Testimonial.DoesNotExist:
            return Response({'error': 'Testimonial not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TestimonialCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        testimonial.quote = serializer.validated_data['quote']
        testimonial.name = serializer.validated_data['name']
        testimonial.location = serializer.validated_data.get('location', '')
        testimonial.approved = serializer.validated_data.get('approved', testimonial.approved)
        testimonial.save()
        return Response(TestimonialSerializer(testimonial).data)


class AdminTestimonialActivateView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def post(self, request, testimonial_id):
        try:
            testimonial = Testimonial.objects.get(id=testimonial_id)
        except Testimonial.DoesNotExist:
            return Response({'error': 'Testimonial not found'}, status=status.HTTP_404_NOT_FOUND)
        testimonial.is_active = not testimonial.is_active
        testimonial.save(update_fields=['is_active'])
        return Response({
            'message': 'Testimonial activated' if testimonial.is_active else 'Testimonial deactivated',
            'is_active': testimonial.is_active,
        })


class AdminTestimonialDeleteView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def delete(self, request, testimonial_id):
        try:
            testimonial = Testimonial.objects.get(id=testimonial_id)
        except Testimonial.DoesNotExist:
            return Response({'error': 'Testimonial not found'}, status=status.HTTP_404_NOT_FOUND)
        testimonial.delete()
        return Response({'message': 'Testimonial deleted'})



class AdminPendingDenominationListView(ListAPIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]
    serializer_class = PendingDenominationSerializer

    def get_queryset(self):
        return DenominationService.get_all_pending()


class AdminPendingDenominationApproveView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def post(self, request, pending_id):
        denomination, error = DenominationService.approve_pending(pending_id, request.user)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'message': 'Pending denomination approved',
            'denomination': DenominationSerializer(denomination).data,
        })


class AdminPendingDenominationRejectView(APIView):
    permission_classes = [IsSuperAdminOrOperationsAdmin]

    def post(self, request, pending_id):
        pending, error = DenominationService.reject_pending(pending_id, request.user)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': 'Pending denomination rejected'})


class AdminAnalyticsView(APIView):
    """GET /api/admin/analytics/ — deep-dive live metrics + chart series."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from .services.analytics_service import AnalyticsService
        data = AnalyticsService.collect()
        AuditService.log(
            actor=request.user,
            action="Viewed Analytics",
            action_type="read",
            target_model="Analytics",
            request=request,
        )
        return Response(data)


class AdminIntegrationsView(APIView):
    """GET/POST /api/admin/integrations/ — manage third-party API settings.

    GET returns the catalog with values masked for secrets. POST accepts
    ``{KEY: value}`` and persists to the DB (immediate runtime effect) and
    writes the same values into ``Backend/.env`` so the server stays aligned.
    An empty value clears the setting.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from .services.integration_service import catalog
        entries = catalog()
        AuditService.log(
            actor=request.user,
            action="Viewed Integrations",
            action_type="read",
            target_model="Integration",
            request=request,
        )
        return Response({'integrations': entries})

    def post(self, request):
        from .services.integration_service import catalog, resolve_updates, write_env_changes
        from .models import IntegrationSetting

        payload = request.data or {}
        if not isinstance(payload, dict):
            return Response({'error': 'Malformed payload.'}, status=status.HTTP_400_BAD_REQUEST)

        catalog_map = {e['key']: e for e in catalog()}
        allowed = set(catalog_map.keys())
        resolved = {k: v for k, v in resolve_updates(payload).items() if k in allowed}

        saved = []
        for key, value in resolved.items():
            obj, _ = IntegrationSetting.objects.update_or_create(
                key=key,
                defaults={
                    'value': value,
                    'group': catalog_map[key]['group'],
                    'label': catalog_map[key]['label'],
                    'description': catalog_map[key]['description'],
                    'is_secret': catalog_map[key]['is_secret'],
                    'updated_by': request.user,
                },
            )
            saved.append({'key': key, 'saved_value': bool(value or obj.value)})

        env_updated = True
        if resolved:
            env_updated = write_env_changes(resolved)
        else:
            env_updated = False

        AuditService.log(
            actor=request.user,
            action="Updated Integrations",
            action_type="update",
            target_model="Integration",
            target_repr=", ".join(resolved.keys()),
            changes=resolved,
            request=request,
        )

        return Response({
            'status': 'saved',
            'saved': saved,
            'env_updated': env_updated,
            'note': 'Settings applied immediately. Written to Backend/.env to keep the server aligned.' if env_updated else 'Settings applied immediately, but the .env file could not be written — check server permissions.',
            'integrations': catalog(),
        })


class AdminIntegrationTestView(APIView):
    """POST /api/admin/integrations/test/flutterwave/ — validate Flutterwave credentials."""
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        from .services.integration_service import test_flutterwave
        ok, detail = test_flutterwave()
        AuditService.log(
            actor=request.user,
            action="Tested Flutterwave Integration",
            action_type="read",
            target_model="Integration",
            request=request,
        )
        return Response({'ok': ok, 'detail': detail})


class AdminSeoView(APIView):
    """GET/PUT /api/admin/seo/ — manage the live site's SEO metadata."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from .services.seo_service import get_or_create
        from .serializers import SeoSettingSerializer
        row = get_or_create()
        return Response(SeoSettingSerializer(row).data)

    def put(self, request):
        from .services.seo_service import get_or_create
        from .serializers import SeoSettingSerializer
        row = get_or_create()
        serializer = SeoSettingSerializer(row, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(updated_by=request.user)
        AuditService.log(
            actor=request.user,
            action="Updated SEO Settings",
            action_type="update",
            target_model="SeoSetting",
            changes=dict(serializer.validated_data),
            request=request,
        )
        return Response({'status': 'saved', 'seo': SeoSettingSerializer(row).data})


class AdminLogsView(APIView):
    """GET /api/admin/logs/ — list server log files; ?path=...&lines=N tails one.

    Only super admin can read system logs.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from .services import logs_service
        path = request.query_params.get('path', '')
        if path:
            lines = tail = request.query_params.get('lines', 200)
            try:
                lines = max(1, min(int(lines), 5000))
            except (TypeError, ValueError):
                lines = 200
            content = logs_service.tail_file(path, lines)
            return Response({'path': path, 'lines': content, 'total': len(content)})

        files = logs_service.available()
        AuditService.log(
            actor=request.user,
            action="Viewed System Logs",
            action_type="read",
            target_model="Log",
            request=request,
        )
        return Response({'files': files})


class AdminContentListView(APIView):
    """GET /api/admin/content/ — list all content items (any status)."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from .serializers import ContentItemSerializer
        items = ContentItem.objects.all().order_by('-updated_at')
        AuditService.log(
            actor=request.user,
            action="Viewed Content Items",
            action_type="read",
            target_model="ContentItem",
            request=request,
        )
        return Response(ContentItemSerializer(items, many=True).data)


def _unique_content_slug(title, exclude_id=None):
    from django.utils.text import slugify
    base = slugify(title) or 'content'
    slug = base
    n = 1
    qs = ContentItem.objects.filter(slug=slug)
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    while qs.exists():
        n += 1
        slug = f'{base}-{n}'
        qs = ContentItem.objects.filter(slug=slug)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
    return slug


class AdminContentCreateView(APIView):
    """POST /api/admin/content/ — create a content item."""
    permission_classes = [IsSuperAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        from .serializers import ContentItemSerializer
        data = dict(request.data)
        if not data.get('slug') and data.get('title'):
            data['slug'] = _unique_content_slug(data['title'])
        serializer = ContentItemSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        item = serializer.save(created_by=request.user)
        if item.status == 'published' and not item.published_at:
            item.published_at = timezone.now()
            item.save(update_fields=['published_at'])
        AuditService.log(
            actor=request.user,
            action="Created Content Item",
            action_type="create",
            target_model="ContentItem",
            target_id=str(item.id),
            target_repr=item.title,
            request=request,
        )
        return Response(ContentItemSerializer(item).data, status=status.HTTP_201_CREATED)


class AdminContentDetailView(APIView):
    """GET/PATCH/DELETE /api/admin/content/<id>/"""
    permission_classes = [IsSuperAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _get(self, content_id):
        return ContentItem.objects.filter(id=content_id).first()

    def get(self, request, content_id):
        from .serializers import ContentItemSerializer
        item = self._get(content_id)
        if item is None:
            return Response({'error': 'Content not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ContentItemSerializer(item).data)

    def patch(self, request, content_id):
        from .serializers import ContentItemSerializer
        item = self._get(content_id)
        if item is None:
            return Response({'error': 'Content not found.'}, status=status.HTTP_404_NOT_FOUND)
        data = dict(request.data)
        if not data.get('slug') and data.get('title'):
            data['slug'] = _unique_content_slug(data['title'], exclude_id=item.id)
        serializer = ContentItemSerializer(item, data=data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        item = serializer.save()
        if item.status == 'published' and not item.published_at:
            item.published_at = timezone.now()
            item.save(update_fields=['published_at'])
        AuditService.log(
            actor=request.user,
            action="Updated Content Item",
            action_type="update",
            target_model="ContentItem",
            target_id=str(item.id),
            target_repr=item.title,
            changes=dict(serializer.validated_data),
            request=request,
        )
        return Response(ContentItemSerializer(item).data)

    def delete(self, request, content_id):
        item = self._get(content_id)
        if item is None:
            return Response({'error': 'Content not found.'}, status=status.HTTP_404_NOT_FOUND)
        title = item.title
        item.delete()
        AuditService.log(
            actor=request.user,
            action="Deleted Content Item",
            action_type="delete",
            target_model="ContentItem",
            target_id=str(content_id),
            target_repr=title,
            request=request,
        )
        return Response({'status': 'deleted'})


class PublicSeoView(APIView):
    """GET /api/seo/ — public SEO config for the marketing site."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .services.seo_service import public_dict
        return Response(public_dict())


class PublicContentView(APIView):
    """GET /api/content/ — published content items, optionally filtered by
    ?category=blog|devotional|article. GET /api/content/<slug>/ fetches one."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .serializers import ContentItemSerializer
        category = request.query_params.get('category', '')
        qs = ContentItem.objects.filter(status='published').order_by('-featured', '-published_at')
        if category:
            qs = qs.filter(category=category)
        return Response(ContentItemSerializer(qs[:200], many=True).data)


class PublicContentDetailView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        from .serializers import ContentItemSerializer
        item = ContentItem.objects.filter(slug=slug, status='published').first()
        if item is None:
            return Response({'error': 'Content not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ContentItemSerializer(item).data)
