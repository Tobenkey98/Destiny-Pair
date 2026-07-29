from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_verification_email_task(self, user_id, code):
    from django.contrib.auth import get_user_model
    from django.conf import settings

    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    subject = "Your verification code – DestinyPair"
    html_message = render_to_string('accounts/verify_email.html', {
        'user': user,
        'code': code,
    })
    plain_message = strip_tags(html_message)

    try:
        send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message)
    except Exception as exc:
        raise self.retry(exc=exc)
