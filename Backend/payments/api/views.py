import json
import logging
from decimal import Decimal, InvalidOperation

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.legal import REQUIRED_FOR_SUBSCRIPTION, has_current_consent
from payments.models import Payment
from payments.services import flutterwave
from subscriptions.api.views import create_payment_reference
from subscriptions.models import SubscriptionPlan
from subscriptions.services import plan_service

logger = logging.getLogger(__name__)

CARD_FIELDS = (
    'encrypted_card_number',
    'encrypted_expiry_month',
    'encrypted_expiry_year',
    'encrypted_cvv',
)


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


class ChargeCardView(APIView):
    """Native (non-hosted) card charge: POST /api/payments/charge/.

    The browser payload contains exactly two encrypted-card fields:
    ``encrypted_data`` (the per-field AES-256-GCM ciphertexts produced by
    ``encryptCard`` in the frontend) and ``nonce`` (the shared 12-char nonce).

    The amount is always resolved server-side: when ``plan_slug`` is sent it is
    read from the DB (a client can never pay a manipulated price) and the usual
    subscription consent is enforced; otherwise a raw ``amount`` is required
    for ad-hoc charges.

    The raw Flutterwave v4 JSON body (including ``data.next_action`` redirect /
    PIN requests and the final charge status) is returned with HTTP 200 so the
    browser can finish the flow directly.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        encrypted_data = request.data.get('encrypted_data') or {}
        nonce = (request.data.get('nonce') or '').strip()
        if (
            not all(field in encrypted_data for field in CARD_FIELDS)
            or not all(
                isinstance(encrypted_data.get(field), str) and encrypted_data.get(field)
                for field in CARD_FIELDS
            )
        ):
            return Response(
                {'error': 'INVALID_ENCRYPTED_DATA'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(nonce) != 12:
            return Response(
                {'error': 'INVALID_NONCE'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = None
        plan_slug = (request.data.get('plan_slug') or '').strip()
        if plan_slug:
            plan = SubscriptionPlan.objects.filter(slug=plan_slug, is_active=True).first()
            if plan is None:
                return Response({'error': 'INVALID_PLAN'}, status=status.HTTP_400_BAD_REQUEST)
            if plan.slug == plan_service.FREE_SLUG:
                return Response({'error': 'FREE_PLAN_NOT_PAYABLE'}, status=status.HTTP_400_BAD_REQUEST)
            missing = [
                doc for doc in REQUIRED_FOR_SUBSCRIPTION
                if not has_current_consent(request.user, doc)
            ]
            if missing:
                return Response(
                    {'error': 'CONSENT_REQUIRED', 'documents': missing},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            amount = plan.price
        else:
            try:
                amount = Decimal(str(request.data.get('amount', '')))
            except (InvalidOperation, TypeError, ValueError):
                amount = Decimal('0')
            if amount <= 0:
                return Response(
                    {'error': 'AMOUNT_REQUIRED'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        currency = (request.data.get('currency') or 'NGN').upper()
        tx_ref = create_payment_reference()
        payment = Payment.objects.create(
            user=request.user,
            plan=plan,
            amount=amount,
            currency=currency,
            status='pending',
            gateway='flutterwave',
            payment_method='card',
            reference=tx_ref,
            metadata={
                'flow': 'direct_card',
                'plan_slug': plan.slug if plan else None,
            },
        )

        try:
            body = flutterwave.charge_card(
                request.user, encrypted_data, nonce, amount, tx_ref, currency=currency,
            )
        except flutterwave.FlutterwaveError as exc:
            payment.status = 'failed'
            payment.save(update_fields=['status'])
            return Response(
                {'error': 'GATEWAY_UNAVAILABLE', 'detail': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        charge_id = (body.get('data') or {}).get('id')
        if charge_id:
            payment.transaction_id = charge_id
            payment.save(update_fields=['transaction_id'])
        return Response(body, status=status.HTTP_200_OK)