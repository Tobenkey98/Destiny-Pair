import json
import logging

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from payments.services import flutterwave

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def flutterwave_webhook(request):
    """Flutterwave event endpoint.

    Security: the payload is NEVER trusted as-is. The ``verif-hash`` header is
    verified against the configured webhook secret, and the transaction is
    re-verified server-side with Flutterwave before any subscription is
    activated.
    """
    if not flutterwave.verify_webhook_signature(request):
        logger.warning('Flutterwave webhook rejected: bad signature from %s',
                       request.META.get('REMOTE_ADDR'))
        return HttpResponse('Invalid signature', status=400)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        logger.warning('Flutterwave webhook rejected: unparseable body')
        return HttpResponse('Bad request', status=400)

    try:
        outcome = flutterwave.handle_webhook(payload)
    except Exception:
        logger.exception('Flutterwave webhook handler crashed')
        return HttpResponse('Internal error', status=500)

    if outcome in ('unknown_reference', 'verification_failed',
                   'amount_mismatch', 'currency_mismatch'):
        return HttpResponse(outcome, status=400)
    return HttpResponse('OK', status=200)