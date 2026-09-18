"""Live platform analytics for the admin Analytics page (super admin)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone

User = get_user_model()


class AnalyticsService:

    @staticmethod
    def collect():
        now = timezone.now()
        day = now - timedelta(days=1)
        days_30 = now - timedelta(days=30)
        months_6 = now - timedelta(days=180)

        data = {
            'as_of': now.isoformat(),
        }

        # --- Users ---------------------------------------------------------
        data['users'] = {
            'total': User.objects.exclude(admin_profile__isnull=False).count(),
            'active': User.objects.exclude(admin_profile__isnull=False).filter(is_active=True, is_banned=False).count(),
            'verified': User.objects.exclude(admin_profile__isnull=False).filter(is_verified=True).count(),
            'banned': User.objects.exclude(admin_profile__isnull=False).filter(is_banned=True).count(),
            'profile_completed': User.objects.exclude(admin_profile__isnull=False).filter(is_profile_completed=True).count(),
            'online_now': User.objects.exclude(admin_profile__isnull=False).filter(last_login__gte=now - timedelta(minutes=15)).count(),
            'new_24h': User.objects.exclude(admin_profile__isnull=False).filter(date_joined__gte=day).count(),
            'new_30d': User.objects.exclude(admin_profile__isnull=False).filter(date_joined__gte=days_30).count(),
        }

        # --- Gender breakdown (declared) -----------------------------------
        gender_rows = (
            User.objects.exclude(admin_profile__isnull=False)
            .filter(is_active=True, is_banned=False)
            .values('gender').annotate(count=Count('id')).values_list('gender', 'count')
        )
        gender_breakdown = {'male': 0, 'female': 0, 'unspecified': 0}
        for gender_text, count in gender_rows:
            key = (gender_text or '').strip().lower()
            if key in gender_breakdown:
                gender_breakdown[key] = count
            else:
                gender_breakdown['unspecified'] += count
        data['gender_breakdown'] = gender_breakdown

        # --- Signup trends ---------------------------------------------------
        def _series(days, granularity='day'):
            trunc = TruncDate('date_joined') if granularity == 'day' else TruncMonth('date_joined')
            rows = (
                User.objects.exclude(admin_profile__isnull=False)
                .filter(date_joined__gte=now - timedelta(days=days))
                .annotate(bucket=trunc)
                .values('bucket').annotate(count=Count('id')).order_by('bucket')
            )
            lookup = {str(r['bucket']): r['count'] for r in rows}
            if granularity == 'day':
                series = [(now.date() - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
            else:
                months = []
                d = (now.replace(day=1) - timedelta(days=1))
                for _ in range(days):
                    months.append(d.strftime('%Y-%m'))
                    d = (d.replace(day=1) - timedelta(days=1))
                series = list(reversed(months))
            return [{'date': s, 'count': lookup.get(s, 0)} for s in series]

        data['signups_last_30_days'] = _series(30, 'day')
        data['signups_last_12_months'] = _series(12, 'month')

        # --- Matching & messaging -------------------------------------------
        try:
            from matching.models import Match
            from chat.models import Conversation, Message
            data['matches'] = {
                'total': Match.objects.count(),
                'last_30d': Match.objects.filter(created_at__gte=days_30).count(),
                'by_status': dict(
                    Match.objects.values('status').annotate(c=Count('id')).values_list('status', 'c')
                ),
            }
            data['messages'] = {
                'total': Message.objects.count(),
                'last_30d': Message.objects.filter(created_at__gte=days_30).count(),
                'conversations': Conversation.objects.count(),
            }
            try:
                from chat.models import ModerationLog
                data['chat_moderation'] = {
                    'total': ModerationLog.objects.count(),
                    'last_30d': ModerationLog.objects.filter(created_at__gte=days_30).count(),
                    'by_category': dict(
                        ModerationLog.objects.values('category').annotate(c=Count('id')).values_list('category', 'c')
                    ),
                }
            except Exception:
                data['chat_moderation'] = {'total': 0, 'last_30d': 0, 'by_category': {}}
        except Exception:
            data['matches'] = {'total': 0, 'last_30d': 0, 'by_status': {}}
            data['messages'] = {'total': 0, 'last_30d': 0, 'conversations': 0}
            data['chat_moderation'] = {'total': 0, 'last_30d': 0, 'by_category': {}}

        # --- Revenue / payments ---------------------------------------------
        try:
            from payments.models import Payment
            completed = Payment.objects.filter(status='completed')
            revenue_by_month = []
            d = (now.replace(day=1) - timedelta(days=1))
            for _ in range(6):
                month_label = d.strftime('%Y-%m')
                month_start = d.replace(day=1)
                month_end = d.replace(day=28) + timedelta(days=4)
                month_end = month_end.replace(day=1) - timedelta(days=1)
                total = completed.filter(created_at__gte=month_start, created_at__lt=month_end + timedelta(days=1)) \
                    .aggregate(t=Sum('amount'))['t'] or 0
                revenue_by_month.append({'month': month_label, 'amount': float(total)})
                d = (d.replace(day=1) - timedelta(days=1))
            revenue_by_month.reverse()

            data['revenue'] = {
                'total_all': float(completed.aggregate(t=Sum('amount'))['t'] or 0),
                'last_30d': float(completed.filter(created_at__gte=days_30).aggregate(t=Sum('amount'))['t'] or 0),
                'by_month': revenue_by_month,
                'by_status': dict(
                    Payment.objects.values('status').annotate(c=Count('id')).values_list('status', 'c')
                ),
                'total_payments': Payment.objects.count(),
                'successful_payments': completed.count(),
            }
        except Exception:
            data['revenue'] = {
                'total_all': 0, 'last_30d': 0, 'by_month': [],
                'by_status': {}, 'total_payments': 0, 'successful_payments': 0,
            }

        # --- Subscriptions ---------------------------------------------------
        try:
            from subscriptions.models import UserSubscription, SubscriptionPlan
            data['subscriptions'] = {
                'active': UserSubscription.objects.filter(active=True).count(),
                'total': UserSubscription.objects.count(),
                'by_plan': dict(
                    UserSubscription.objects.values('plan__name').annotate(c=Count('id')).values_list('plan__name', 'c')
                ),
                'plans': list(SubscriptionPlan.objects.values('name', 'price', 'is_active').order_by('price')),
            }
        except Exception:
            data['subscriptions'] = {'active': 0, 'total': 0, 'by_plan': {}, 'plans': []}

        # --- Photos ----------------------------------------------------------
        try:
            from profiles.models import Photo
            data['photos'] = {
                'total': Photo.objects.count(),
                'pending': Photo.objects.filter(review_status='pending').count(),
                'approved': Photo.objects.filter(review_status='approved').count(),
                'rejected': Photo.objects.filter(review_status='rejected').count(),
                'last_30d': Photo.objects.filter(created_at__gte=days_30).count(),
            }
        except Exception:
            data['photos'] = {'total': 0, 'pending': 0, 'approved': 0, 'rejected': 0, 'last_30d': 0}

        # --- Counselling ------------------------------------------------------
        try:
            from counselling.models import CounsellingSession
            data['counselling'] = {
                'total': CounsellingSession.objects.count(),
                'by_status': dict(
                    CounsellingSession.objects.values('status').annotate(c=Count('id')).values_list('status', 'c')
                ),
            }
        except Exception:
            data['counselling'] = {'total': 0, 'by_status': {}}

        # --- Reports ------------------------------------------------------------
        try:
            from notifications.models import Report
            data['reports'] = {
                'total': Report.objects.count(),
                'last_30d': Report.objects.filter(created_at__gte=days_30).count(),
                'by_reason': dict(
                    Report.objects.values('reason').annotate(c=Count('id')).values_list('reason', 'c')
                ),
            }
        except Exception:
            data['reports'] = {'total': 0, 'last_30d': 0, 'by_reason': {}}

        # --- Devices / browsers / locations ------------------------------------
        def _top(field, limit=8):
            return list(
                User.objects.exclude(admin_profile__isnull=False)
                .filter(is_active=True, **{f'{field}__isnull': False})
                .exclude(**{f'{field}': ''})
                .values(field).annotate(count=Count('id'))
                .order_by('-count')[:limit]
                .values_list(field, 'count')
            )

        data['devices'] = _top('last_device')
        data['browsers'] = _top('last_browser')
        data['top_cities'] = _top('city_state', 10)

        # --- Admin activity --------------------------------------------------------
        try:
            from audit_logs.models import AuditLog
            data['admin_activity'] = {
                'last_30d': AuditLog.objects.filter(created_at__gte=days_30).count(),
                'by_type': dict(
                    AuditLog.objects.filter(created_at__gte=days_30).values('action_type').annotate(c=Count('id')).values_list('action_type', 'c')
                ),
            }
        except Exception:
            data['admin_activity'] = {'last_30d': 0, 'by_type': {}}

        return data