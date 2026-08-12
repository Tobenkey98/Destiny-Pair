import json
import logging

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from payments.services import monnify, paystack

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def paystack_webhook(request):
    """Paystack event endpoint.

    Security: the payload is NEVER trusted as-is. The signature header is
    verified against the raw body, and the transaction is re-verified
    server-side with Paystack before any subscription is activated.
    """
    if not paystack.verify_webhook_signature(request):
        logger.warning('Paystack webhook rejected: bad signature from %s', request.META.get('REMOTE_ADDR'))
        return HttpResponse('Invalid signature', status=400)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        logger.warning('Paystack webhook rejected: unparseable body')
        return HttpResponse('Bad request', status=400)

    try:
        outcome = paystack.handle_webhook(None, payload)
    except Exception:
        logger.exception('Paystack webhook handler crashed')
        return HttpResponse('Internal error', status=500)

    if outcome in ('unknown_reference', 'verification_failed', 'amount_mismatch'):
        return HttpResponse(outcome, status=400)
    return HttpResponse('OK', status=200)


@csrf_exempt
@require_POST
def monnify_webhook(request):
    """Monnify event endpoint.

    Security: the payload is NEVER trusted as-is. The ``monnify-signature``
    header is verified against the raw body (HMAC-SHA512 with the client
    secret key), and the transaction is re-verified server-side with Monnify
    before any subscription is activated.
    """
    if not monnify.verify_webhook_signature(request):
        logger.warning('Monnify webhook rejected: bad signature from %s',
                       request.META.get('REMOTE_ADDR'))
        return HttpResponse('Invalid signature', status=400)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        logger.warning('Monnify webhook rejected: unparseable body')
        return HttpResponse('Bad request', status=400)

    try:
        outcome = monnify.handle_webhook(payload)
    except Exception:
        logger.exception('Monnify webhook handler crashed')
        return HttpResponse('Internal error', status=500)

    if outcome in ('unknown_reference', 'verification_failed',
                   'amount_mismatch', 'currency_mismatch'):
        return HttpResponse(outcome, status=400)
    return HttpResponse('OK', status=200)