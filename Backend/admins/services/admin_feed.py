"""Build the admin activity feed and materialize it into persisted, per-admin
notifications so read state (and the unread badge) actually works."""

from django.utils import timezone
from datetime import timedelta

EVENT_TYPES = {'new_user', 'user_login', 'new_admin', 'admin_login', 'match',
               'counselling', 'photo', 'bot_ticket'}


def _build_events(is_super):
    """Return the last-7-days activity as event dicts with a stable event_key."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    seven_days_ago = timezone.now() - timedelta(days=7)
    events = []

    try:
        new_users = (
            User.objects.exclude(admin_profile__isnull=False)
            .filter(date_joined__gte=seven_days_ago)
            .order_by('-date_joined')
            .values('id', 'email', 'first_name', 'date_joined')[:5]
        )
        for u in new_users:
            events.append({
                'event_key': f'new_user:{u["id"]}',
                'type': 'new_user',
                'title': 'New User Registered',
                'message': f"{u['first_name'] or u['email']} joined the platform",
                'created_at': u['date_joined'] if hasattr(u['date_joined'], 'isoformat') else u['date_joined'],
                'link': f"/admin/users/{u['id']}",
            })
    except Exception:
        pass

    try:
        logged_users = (
            User.objects.exclude(admin_profile__isnull=False)
            .filter(last_login__gte=seven_days_ago)
            .order_by('-last_login')[:5]
        )
        for u in logged_users:
            events.append({
                'event_key': f'user_login:{u.id}:{u.last_login.timestamp() if u.last_login else 0}',
                'type': 'user_login',
                'title': 'User Login',
                'message': f"{u.first_name or u.email} logged in",
                'created_at': u.last_login,
                'link': f"/admin/users/{u.id}",
            })
    except Exception:
        pass

    if is_super:
        try:
            from admins.models import AdminProfile
            new_admins = AdminProfile.objects.filter(created_at__gte=seven_days_ago).select_related('user').order_by('-created_at')[:5]
            for a in new_admins:
                events.append({
                    'event_key': f'new_admin:{a.id}',
                    'type': 'new_admin',
                    'title': 'New Admin',
                    'message': f"{a.user.first_name or a.user.email} joined as {a.get_role_display()}",
                    'created_at': a.created_at,
                    'link': '/admin/admins',
                })
        except Exception:
            pass

        try:
            logged_admins = User.objects.filter(admin_profile__isnull=False, last_login__gte=seven_days_ago).select_related('admin_profile').order_by('-last_login')[:5]
            for u in logged_admins:
                events.append({
                    'event_key': f'admin_login:{u.id}:{u.last_login.timestamp() if u.last_login else 0}',
                    'type': 'admin_login',
                    'title': 'Admin Login',
                    'message': f"{u.first_name or u.email} ({u.admin_profile.get_role_display()}) logged in",
                    'created_at': u.last_login,
                    'link': '/admin/admins',
                })
        except Exception:
            pass

    try:
        from matching.models import Match
        recent_matches = Match.objects.filter(created_at__gte=seven_days_ago).select_related('from_user', 'to_user').order_by('-created_at')[:5]
        for m in recent_matches:
            events.append({
                'event_key': f'match:{m.id}',
                'type': 'match',
                'title': 'New Match',
                'message': f"{m.from_user.first_name or m.from_user.email} liked {m.to_user.first_name or m.to_user.email}",
                'created_at': m.created_at,
                'link': '/admin/matches',
            })
    except Exception:
        pass

    try:
        from counselling.models import CounsellingSession
        new_sessions = CounsellingSession.objects.filter(created_at__gte=seven_days_ago).order_by('-created_at')[:5]
        for s in new_sessions:
            events.append({
                'event_key': f'counselling:{s.id}',
                'type': 'counselling',
                'title': 'Counselling Session',
                'message': f"{s.title} — {s.counsellor_name}",
                'created_at': s.created_at,
                'link': '/admin/counselling',
            })
    except Exception:
        pass

    try:
        from profiles.models import Photo
        pending = Photo.objects.filter(review_status='pending', created_at__gte=seven_days_ago).order_by('-created_at')[:5]
        for p in pending:
            events.append({
                'event_key': f'photo:{p.id}',
                'type': 'photo',
                'title': 'Photo Pending Approval',
                'message': f"Photo #{p.id} by user {p.user_id} needs review",
                'created_at': p.created_at,
                'link': '/admin/moderation',
            })
    except Exception:
        pass

    try:
        from chatbot.models import BotTicket
        recent_tickets = BotTicket.objects.select_related('conversation', 'user').order_by('-created_at')[:5]
        for t in recent_tickets:
            name = (t.user.get_full_name() or t.user.email) if t.user else 'Guest'
            events.append({
                'event_key': f'bot_ticket:{t.id}',
                'type': 'bot_ticket',
                'title': 'Chatbot Escalation',
                'message': f'{name} raised a support ticket: {t.get_category_display()}',
                'created_at': t.created_at,
                'link': '/admin/bot-reports',
            })
    except Exception:
        pass

    events.sort(key=lambda e: e['created_at'], reverse=True)
    return events


def materialize_feed(admin_user, is_super, limit=40):
    """Sync computed events into AdminNotification rows (idempotent) and return
    the persisted, ordered list + unread count."""
    from admins.models import AdminNotification

    events = _build_events(is_super)

    for ev in events:
        if not ev.get('event_key'):
            continue
        created_at = ev.get('created_at')
        AdminNotification.objects.get_or_create(
            recipient=admin_user,
            event_key=ev['event_key'],
            defaults={
                'type': ev.get('type', 'system'),
                'title': ev.get('title', ''),
                'message': ev.get('message', ''),
                'link': ev.get('link', ''),
                'created_at': created_at if created_at else timezone.now(),
            },
        )

    items = list(AdminNotification.objects.filter(recipient=admin_user).order_by('-created_at')[:limit])

    def _clean(n):
        return {
            'id': n.id,
            'type': n.type,
            'title': n.title,
            'message': n.message,
            'link': n.link,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat(),
        }

    unread = AdminNotification.objects.filter(recipient=admin_user, is_read=False).count()
    return [_clean(n) for n in items], unread