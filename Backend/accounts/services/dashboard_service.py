from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class DashboardService:

    @staticmethod
    def get_dashboard_data(user):
        if not hasattr(user, 'admin_profile'):
            return {'error': 'Not an administrator.'}

        role = user.admin_profile.role
        dispatcher = {
            'super_admin': DashboardService._super_admin_dashboard,
            'operations_admin': DashboardService._operations_dashboard,
            'moderator': DashboardService._moderator_dashboard,
            'counsellor': DashboardService._counsellor_dashboard,
        }

        handler = dispatcher.get(role)
        if handler is None:
            return {'error': f'Unknown role: {role}'}

        return handler()

    @staticmethod
    def _recent_users(limit=10):
        return list(
            User.objects.exclude(admin_profile__isnull=False).filter(is_active=True)
            .order_by('-date_joined')
            .values('id', 'email', 'first_name', 'last_name', 'gender', 'date_joined')[:limit]
        )

    @staticmethod
    def _signups_last_7_days():
        today = timezone.now().date()
        dates = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
        rows = (
            User.objects
            .filter(date_joined__date__gte=dates[0])
            .values('date_joined__date')
            .annotate(count=Count('id'))
            .order_by('date_joined__date')
        )
        lookup = {str(r['date_joined__date']): r['count'] for r in rows}
        return [{'date': str(d), 'count': lookup.get(str(d), 0)} for d in dates]

    @staticmethod
    def _super_admin_dashboard():
        today = timezone.now()
        thirty_days_ago = today - timedelta(days=30)

        total_users = User.objects.exclude(admin_profile__isnull=False).count()
        active_users = User.objects.exclude(admin_profile__isnull=False).filter(is_active=True, is_banned=False).count()
        verified_users = User.objects.exclude(admin_profile__isnull=False).filter(is_verified=True).count()
        banned_users = User.objects.exclude(admin_profile__isnull=False).filter(is_banned=True).count()
        new_users_30d = User.objects.exclude(admin_profile__isnull=False).filter(date_joined__gte=thirty_days_ago).count()
        profile_completed = User.objects.exclude(admin_profile__isnull=False).filter(is_profile_completed=True).count()

        online_cutoff = today - timedelta(minutes=15)
        users_online = User.objects.exclude(admin_profile__isnull=False).filter(last_login__gte=online_cutoff).count()
        admins_online = User.objects.filter(admin_profile__isnull=False, last_login__gte=online_cutoff).count()
        admin_count = User.objects.filter(admin_profile__isnull=False).count()

        gender_breakdown = dict(
            User.objects.exclude(admin_profile__isnull=False).filter(is_active=True, is_banned=False)
            .values('gender')
            .annotate(count=Count('id'))
            .values_list('gender', 'count')
        )

        total_matches = 0
        active_subscriptions = 0
        total_revenue_30d = 0
        total_revenue_all = 0
        pending_photos = 0
        total_counselling = 0
        recent_matches = []

        try:
            from matching.models import Match
            total_matches = Match.objects.count()
            recent_matches = list(
                Match.objects.select_related('from_user', 'to_user')
                .order_by('-created_at')
                .values(
                    'id', 'status', 'created_at',
                    from_user_email='from_user__email',
                    from_user_name='from_user__first_name',
                    to_user_email='to_user__email',
                    to_user_name='to_user__first_name',
                )[:10]
            )
        except Exception:
            pass

        try:
            from subscriptions.models import UserSubscription
            active_subscriptions = UserSubscription.objects.filter(active=True).count()
        except Exception:
            pass

        try:
            from payments.models import Payment
            total_revenue_30d = (
                Payment.objects.filter(
                    status='completed', created_at__gte=thirty_days_ago
                ).aggregate(t=Sum('amount'))['t'] or 0
            )
            total_revenue_all = (
                Payment.objects.filter(status='completed')
                .aggregate(t=Sum('amount'))['t'] or 0
            )
        except Exception:
            pass

        try:
            from counselling.models import CounsellingSession
            total_counselling = CounsellingSession.objects.count()
        except Exception:
            pass

        try:
            from profiles.models import Photo
            pending_photos = Photo.objects.filter(approved=False).count()
        except Exception:
            pass

        return {
            'role': 'super_admin',
            'title': 'Super Admin Dashboard',
            'analytics': {
                'total_users': total_users,
                'active_users': active_users,
                'verified_users': verified_users,
                'banned_users': banned_users,
                'new_users_30d': new_users_30d,
                'profile_completed': profile_completed,
                'total_matches': total_matches,
                'active_subscriptions': active_subscriptions,
                'total_revenue_30d': float(total_revenue_30d),
                'total_revenue_all': float(total_revenue_all),
                'pending_photo_approvals': pending_photos,
                'total_counselling_sessions': total_counselling,
                'gender_breakdown': gender_breakdown,
            },
            'users_online': users_online,
            'admins_online': admins_online,
            'admin_count': admin_count,
            'recent_users': DashboardService._recent_users(),
            'recent_matches': recent_matches,
            'signups_last_7_days': DashboardService._signups_last_7_days(),
            'modules': [
                'dashboard', 'users', 'subscriptions', 'payments',
                'moderation', 'reports', 'counselling', 'settings',
                'audit', 'roles', 'notifications', 'messages',
                'analytics', 'content', 'admins',
            ],
        }

    @staticmethod
    def _operations_dashboard():
        total_users = User.objects.exclude(admin_profile__isnull=False).count()
        active_subscriptions = 0
        recent_payments_count = 0
        recent_payments_total = 0

        try:
            from subscriptions.models import UserSubscription
            active_subscriptions = UserSubscription.objects.filter(active=True).count()
        except Exception:
            pass

        try:
            from payments.models import Payment
            recent_payments_count = Payment.objects.filter(status='completed').count()
            recent_payments_total = (
                Payment.objects.filter(status='completed')
                .aggregate(t=Sum('amount'))['t'] or 0
            )
        except Exception:
            pass

        return {
            'role': 'operations_admin',
            'title': 'Operations Dashboard',
            'analytics': {
                'total_users': total_users,
                'active_subscriptions': active_subscriptions,
                'recent_payments': recent_payments_count,
                'total_revenue_all': float(recent_payments_total),
            },
            'recent_users': DashboardService._recent_users(5),
            'modules': [
                'dashboard', 'users', 'subscriptions', 'payments',
                'matches', 'notifications', 'support',
            ],
        }

    @staticmethod
    def _moderator_dashboard():
        pending_approvals = 0
        total_reports = 0
        blocked_users = User.objects.filter(is_banned=True).count()
        verified_users = User.objects.filter(is_verified=True).count()

        try:
            from profiles.models import Photo
            pending_approvals = Photo.objects.filter(approved=False).count()
        except Exception:
            pass

        return {
            'role': 'moderator',
            'title': 'Moderation Dashboard',
            'analytics': {
                'pending_photo_approvals': pending_approvals,
                'total_reports': total_reports,
                'blocked_users': blocked_users,
                'verified_users': verified_users,
            },
            'recent_users': DashboardService._recent_users(5),
            'modules': [
                'dashboard', 'moderation', 'reports', 'users',
            ],
        }

    @staticmethod
    def _counsellor_dashboard():
        total_sessions = 0
        completed_sessions = 0
        pending_requests = 0
        upcoming_sessions = 0
        cancelled_sessions = 0

        try:
            from counselling.models import CounsellingSession
            total_sessions = CounsellingSession.objects.count()
            completed_sessions = CounsellingSession.objects.filter(
                status='completed'
            ).count()
            pending_requests = CounsellingSession.objects.filter(
                status='pending'
            ).count()
            upcoming_sessions = CounsellingSession.objects.filter(
                status='scheduled'
            ).count()
            cancelled_sessions = CounsellingSession.objects.filter(
                status='cancelled'
            ).count()
        except Exception:
            pass

        return {
            'role': 'counsellor',
            'title': 'Counsellor Dashboard',
            'analytics': {
                'total_sessions': total_sessions,
                'completed_sessions': completed_sessions,
                'pending_requests': pending_requests,
                'upcoming_sessions': upcoming_sessions,
                'cancelled_sessions': cancelled_sessions,
            },
            'modules': [
                'dashboard', 'counselling',
            ],
        }
