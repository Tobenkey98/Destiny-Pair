from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
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
from .models import AdminProfile, AdminInvitation
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
        photo.save(update_fields=['approved'])

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
            Photo.objects.filter(approved=False)
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

        AuditService.log(
            actor=request.user,
            action="Viewed Moderation Queue",
            action_type="read",
            target_model="Photo",
            request=request,
        )

        return Response({
            'pending_photos': photo_data,
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
            .order_by('-created_at')[:200]
        )
        match_data = [{
            'id': m.id,
            'status': m.status,
            'created_at': m.created_at.isoformat(),
            'from_user': m.from_user_id,
            'from_user_name': m.from_user.get_full_name() or m.from_user.email,
            'to_user': m.to_user_id,
            'to_user_name': m.to_user.get_full_name() or m.to_user.email,
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
                 'message': 'Account created. A Super Admin must approve your access before you can sign in.'},
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
                {'error': 'Your administrator account is pending approval from the Super Admin.'},
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

            role_display = invitation.get_role_display()
            signup_url = f"{settings.FRONTEND_URL or 'http://127.0.0.1:5173'}/admin/signup?token={invitation.token}"

            html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f2eb;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#065f46,#047857);padding:40px 40px 32px;text-align:center;">
<img src="https://img.icons8.com/fluency/96/cross.png" alt="" width="56" height="56" style="display:block;margin:0 auto 16px;border-radius:16px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#fbbf24;letter-spacing:-0.3px;">DestinyPair</h1>
<p style="margin:4px 0 0;font-size:14px;color:rgba(255,255,255,0.7);">Admin Invitation</p>
</td></tr>
<tr><td style="padding:40px 40px 32px;">
<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">You're Invited!</h2>
<p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
You have been invited to join the <strong style="color:#065f46;">DestinyPair</strong> admin team as
<strong style="color:#065f46;">{role_display}</strong>.
</p>
<table cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:16px;padding:20px;margin-bottom:24px;width:100%;">
<tr><td>
<p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#065f46;">YOUR INVITATION TOKEN</p>
<p style="margin:0;font-family:'Courier New',monospace;font-size:13px;color:#475569;word-break:break-all;background:#ffffff;border:1px solid #d1d5db;border-radius:10px;padding:12px 16px;text-align:center;">{invitation.token}</p>
</td></tr>
</table>
<p style="margin:0 0 8px;font-size:14px;color:#475569;">Click the button below to create your account:</p>
<table cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:999px;background:linear-gradient(135deg,#065f46,#047857);padding:0;">
<a href="{signup_url}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">Accept Invitation</a>
</td></tr></table>
<p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">Or copy and paste this link into your browser:</p>
<p style="margin:4px 0 0;font-size:12px;color:#64748b;word-break:break-all;"><a href="{signup_url}" style="color:#065f46;">{signup_url}</a></p>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:12px;color:#94a3b8;">&copy; DestinyPair &mdash; Faith-led unions built on purpose.</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>"""

            send_mail(
                'You\'re Invited — DestinyPair Admin Access',
                f'You have been invited to join the DestinyPair admin team as {role_display}. Your invitation token is: {invitation.token}',
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

        logs = AuditLog.objects.select_related('actor').all().order_by('-created_at')
        total = logs.count()
        page = logs[offset:offset + limit]

        serializer = AuditLogSerializer(page, many=True)

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
    """Aggregated recent activity feed for admin notifications."""
    permission_classes = [IsAuthenticatedAdmin]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        seven_days_ago = timezone.now() - timedelta(days=7)
        is_super = request.user.admin_profile.role == 'super_admin'

        events = []

        # New user registrations (all admins)
        try:
            new_users = User.objects.exclude(admin_profile__isnull=False).filter(date_joined__gte=seven_days_ago).order_by('-date_joined').values('id', 'email', 'first_name', 'date_joined')[:5]
            for u in new_users:
                events.append({
                    'type': 'new_user',
                    'title': 'New User Registered',
                    'message': f"{u['first_name'] or u['email']} joined the platform",
                    'created_at': u['date_joined'].isoformat(),
                    'link': f"/admin/users/{u['id']}",
                })
        except Exception:
            pass

        # User logins (all admins)
        try:
            logged_users = User.objects.exclude(admin_profile__isnull=False).filter(last_login__gte=seven_days_ago).order_by('-last_login')[:5]
            for u in logged_users:
                events.append({
                    'type': 'user_login',
                    'title': 'User Login',
                    'message': f"{u.first_name or u.email} logged in",
                    'created_at': u.last_login.isoformat(),
                    'link': f"/admin/users/{u.id}",
                })
        except Exception:
            pass

        # New admins + admin logins (super admin only)
        if is_super:
            try:
                new_admins = AdminProfile.objects.filter(created_at__gte=seven_days_ago).select_related('user').order_by('-created_at')[:5]
                for a in new_admins:
                    events.append({
                        'type': 'new_admin',
                        'title': 'New Admin',
                        'message': f"{a.user.first_name or a.user.email} joined as {a.get_role_display()}",
                        'created_at': a.created_at.isoformat(),
                        'link': '/admin/admins',
                    })
            except Exception:
                pass

            try:
                logged_admins = User.objects.filter(admin_profile__isnull=False, last_login__gte=seven_days_ago).select_related('admin_profile').order_by('-last_login')[:5]
                for u in logged_admins:
                    events.append({
                        'type': 'admin_login',
                        'title': 'Admin Login',
                        'message': f"{u.first_name or u.email} ({u.admin_profile.get_role_display()}) logged in",
                        'created_at': u.last_login.isoformat(),
                        'link': '/admin/admins',
                    })
            except Exception:
                pass

        # Matches (all admins)
        try:
            from matching.models import Match
            recent_matches = Match.objects.filter(created_at__gte=seven_days_ago).select_related('from_user', 'to_user').order_by('-created_at')[:5]
            for m in recent_matches:
                events.append({
                    'type': 'match',
                    'title': 'New Match',
                    'message': f"{m.from_user.first_name or m.from_user.email} liked {m.to_user.first_name or m.to_user.email}",
                    'created_at': m.created_at.isoformat(),
                    'link': '/admin/matches',
                })
        except Exception:
            pass

        # Counselling sessions (all admins)
        try:
            from counselling.models import CounsellingSession
            new_sessions = CounsellingSession.objects.filter(created_at__gte=seven_days_ago).order_by('-created_at')[:5]
            for s in new_sessions:
                events.append({
                    'type': 'counselling',
                    'title': 'Counselling Session',
                    'message': f"{s.title} — {s.counsellor_name}",
                    'created_at': s.created_at.isoformat(),
                    'link': '/admin/counselling',
                })
        except Exception:
            pass

        # Pending photo approvals (all admins)
        try:
            from profiles.models import Photo
            pending = Photo.objects.filter(approved=False, created_at__gte=seven_days_ago).order_by('-created_at')[:5]
            for p in pending:
                events.append({
                    'type': 'photo',
                    'title': 'Photo Pending Approval',
                    'message': f"Photo #{p.id} by user {p.user_id} needs review",
                    'created_at': p.created_at.isoformat(),
                    'link': '/admin/moderation',
                })
        except Exception:
            pass

        # Chatbot escalations (all admins — link straight to the bot reports)
        try:
            from chatbot.models import BotTicket
            recent_tickets = BotTicket.objects.select_related('conversation', 'user').order_by('-created_at')[:5]
            for t in recent_tickets:
                name = (t.user.get_full_name() or t.user.email) if t.user else 'Guest'
                events.append({
                    'type': 'bot_ticket',
                    'title': 'Chatbot Escalation',
                    'message': f'{name} raised a support ticket: {t.get_category_display()}',
                    'created_at': t.created_at.isoformat(),
                    'link': '/admin/bot-reports',
                })
        except Exception:
            pass

        events.sort(key=lambda e: e['created_at'], reverse=True)

        return Response({'events': events})


class AdminBlockUnblockView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        try:
            profile = AdminProfile.objects.get(user_id=user_id)
        except AdminProfile.DoesNotExist:
            return Response({'error': 'Admin not found.'}, status=status.HTTP_404_NOT_FOUND)

        if profile.role == 'super_admin':
            return Response({'error': 'Cannot block the Super Admin.'}, status=status.HTTP_403_FORBIDDEN)

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
