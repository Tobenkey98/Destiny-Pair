import json
from audit_logs.models import AuditLog


class AuditService:

    @staticmethod
    def log(actor, action, action_type='other', target_model='',
            target_id='', target_repr='', changes=None,
            request=None):
        ip_address = None
        user_agent = ''
        device = ''
        endpoint = ''
        method = ''

        if request:
            ip_address = AuditService._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            device = AuditService._parse_device(user_agent)
            endpoint = request.path
            method = request.method

        if changes is None:
            changes = {}

        AuditLog.objects.create(
            actor=actor if actor.is_authenticated else None,
            action=action,
            action_type=action_type,
            target_model=target_model,
            target_id=str(target_id) if target_id else '',
            target_repr=target_repr,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
            device=device,
            endpoint=endpoint,
            method=method,
        )

    @staticmethod
    def get_user_audit_logs(user, limit=50):
        return AuditLog.objects.filter(actor=user).order_by('-created_at')[:limit]

    @staticmethod
    def get_model_audit_logs(model_name, object_id=None, limit=50):
        qs = AuditLog.objects.filter(target_model=model_name)
        if object_id:
            qs = qs.filter(target_id=str(object_id))
        return qs.order_by('-created_at')[:limit]

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    @staticmethod
    def _parse_device(user_agent):
        if not user_agent:
            return 'Unknown'
        ua = user_agent.lower()
        if 'mobile' in ua or 'iphone' in ua or 'android' in ua:
            return 'Mobile'
        if 'tablet' in ua or 'ipad' in ua:
            return 'Tablet'
        if 'bot' in ua or 'crawler' in ua or 'spider' in ua:
            return 'Bot'
        return 'Desktop'
