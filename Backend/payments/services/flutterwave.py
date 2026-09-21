"""Flutterwave v3 integration via the standard Payments API.

Authentication uses the static ``FLUTTERWAVE_SECRET_KEY`` as a Bearer token.

Hosted flow:
  1. ``initialize_transaction`` -> POST /v3/payments (tx_ref, amount, customer,
     customizations, redirect_url) -> returns ``data.link`` (hosted checkout URL).
  2. User pays on the hosted page, is redirected to ``redirect_url``, and/or a
     webhook fires. Activation only happens after a server-side re-verification
     of the transaction via the v3 verify endpoints.
"""

import hmac
import logging
import re

from django.conf import settings
import requests

from payments.models import Payment
from payments.services.activation import activate_paid_subscription

logger = logging.getLogger(__name__)

BASE_URL = 'https://api.flutterwave.com/v3'


def _sandbox():
    from admins.services.integration_service import get_bool_value, get_value
    raw = get_value('FLUTTERWAVE_SANDBOX', '')
    if raw == '':
        return getattr(settings, 'FLUTTERWAVE_SANDBOX', False)
    return get_bool_value('FLUTTERWAVE_SANDBOX', False)
EVENT_CHARGE_COMPLETED = 'charge.completed'


class FlutterwaveError(Exception):
    pass


class FlutterwaveVerificationError(FlutterwaveError):
    pass


def _secret_key():
    from admins.services.integration_service import get_value
    val = get_value('FLUTTERWAVE_SECRET_KEY', None)
    if val is None:
        val = getattr(settings, 'FLUTTERWAVE_SECRET_KEY', '')
    # Back-compat: some installs stored it under FLUTTERWAVE_SECRET.
    if not val:
        val = get_value('FLUTTERWAVE_SECRET', None)
        if val is None:
            val = getattr(settings, 'FLUTTERWAVE_SECRET', '')
    if not val:
        raise FlutterwaveError('FLUTTERWAVE_SECRET_KEY is not configured.')
    return val


def _hash():
    from admins.services.integration_service import get_value
    val = get_value('FLUTTERWAVE_SECRET_HASH', None)
    if val is None:
        val = getattr(settings, 'FLUTTERWAVE_SECRET_HASH', '')
    return val


def _headers():
    return {
        'Authorization': f'Bearer {_secret_key()}',
        'Content-Type': 'application/json',
    }


def _post(path, payload):
    try:
        resp = requests.post(f'{BASE_URL}{path}', json=payload, headers=_headers(), timeout=20)
    except requests.RequestException as exc:
        logger.error('Flutterwave POST %s failed: %s', path, exc)
        raise FlutterwaveError('Could not reach Flutterwave.') from exc
    return resp


def _get(path):
    try:
        resp = requests.get(f'{BASE_URL}{path}', headers=_headers(), timeout=20)
    except requests.RequestException as exc:
        logger.error('Flutterwave GET %s failed: %s', path, exc)
        raise FlutterwaveError('Could not reach Flutterwave.') from exc
    return resp


def _json_or_raise(resp, context):
    """Parse ``resp`` as JSON or raise a readable FlutterwaveError."""
    try:
        return resp.json()
    except ValueError:
        logger.error(
            'Flutterwave %s: non-JSON response (HTTP %s): %s',
            context, resp.status_code, resp.text[:500],
        )
        raise FlutterwaveError(
            f'Flutterwave {context} returned a non-JSON response (HTTP '
            f'{resp.status_code}): {resp.text[:200]}'
        ) from None


def _normalize_phone(phone):
    digits = re.sub(r'\D', '', phone or '')
    # Prefer preserving full number including country code for v3 phonenumber.
    # Fall back to a safe placeholder when no usable number exists.
    if len(digits) < 7:
        return '08012345678'
    if digits.startswith('0'):
        return digits
    if digits.startswith('234') and len(digits) >= 11:
        return '0' + digits[3:]
    # If no leading 0 or country code, treat as local and prefix 0.
    if 7 <= len(digits) <= 10:
        return '0' + digits.lstrip('0')
    return digits


def initialize_transaction(user, plan, payment_reference, redirect_url=None):
    """Create a Flutterwave v3 payment and return the hosted URL."""
    raw_name = user.get_full_name() or user.username or user.email or 'Customer'
    # v3 expects a simple string name; sanitize lightly.
    customer_name = re.sub(r"[^A-Za-z0-9\s,.'\-]", '', str(raw_name)).strip()[:100] or 'Customer'
    phonenumber = _normalize_phone(getattr(user, 'phone_number', '') or '')

    payload = {
        'tx_ref': payment_reference,
        'amount': float(plan.price),
        'currency': 'NGN',
        'redirect_url': redirect_url or getattr(settings, 'FLUTTERWAVE_CALLBACK_URL', '') or getattr(settings, 'FRONTEND_URL', ''),
        'payment_options': 'banktransfer,ussd',
        'customer': {
            'email': user.email,
            'phonenumber': phonenumber,
            'name': customer_name,
        },
        'customizations': {
            'title': f'{plan.name} - DestinyPair',
            'description': f'Payment for {plan.name}',
        },
    }

    resp = _post('/payments', payload)
    data = _json_or_raise(resp, 'checkout session create')
    body = data.get('data') or {}

    if data.get('status') != 'success' or not body:
        logger.error('Flutterwave checkout session failed: %s %s', resp.status_code, resp.text[:300])
        raise FlutterwaveError(
            f'Flutterwave checkout session create failed: {resp.status_code} {resp.text[:200]}'
        )

    # Grab the URL using 'link' (Flutterwave's standard) or fallback to 'checkout_url'
    checkout_url = body.get('link') or body.get('checkout_url')

    if not checkout_url:
        logger.error('Flutterwave checkout session returned no link: %s', resp.text[:300])
        raise FlutterwaveError(
            'Flutterwave created a checkout session but returned no hosted link. '
            'Please verify your API payload.'
        )

    amount = body.get('amount')
    return {
        'checkout_url': checkout_url,
        'checkout_id': body.get('id', ''),
        'amount': float(amount) if isinstance(amount, (int, float)) else float(amount or plan.price) if amount is not None else float(plan.price),
        'currency': body.get('currency', 'NGN'),
        'reference': body.get('tx_ref') or body.get('reference') or payment_reference,
    }


def _parse_transaction(body, ref):
    """Normalize a v3 transaction object and enforce success."""
    status = (body.get('status') or '').lower()
    if status != 'successful':
        if status in ('failed', 'cancelled', 'abandoned'):
            raise FlutterwaveVerificationError(f"Transaction {ref} is {status}.")
        raise FlutterwaveVerificationError(f"Transaction {ref} is not successful yet ({status or 'unknown'}).")

    try:
        amount = float(body.get('amount') or body.get('charged_amount') or 0)
    except (TypeError, ValueError):
        amount = 0.0
    currency = body.get('currency') or ''

    return {
        'status': 'successful',
        'amount': amount,
        'currency': currency,
        'id': body.get('id'),
        'flw_ref': body.get('flw_ref') or body.get('id'),
        'tx_ref': body.get('tx_ref') or ref,
    }


def verify_transaction(transaction_id):
    """Verify a v3 transaction by its id (GET /v3/transactions/{id}/verify)."""
    resp = _get(f'/transactions/{transaction_id}/verify')
    data = _json_or_raise(resp, 'transaction verify')
    body = data.get('data') or {}
    if not body:
        raise FlutterwaveVerificationError(f"Transaction {transaction_id} not found.")
    # v3 nests transaction under data; some responses wrap again. Handle both.
    if isinstance(body, dict) and 'data' in body and isinstance(body['data'], dict) and 'status' in body['data']:
        body = body['data']
    return _parse_transaction(body, str(transaction_id))


def verify_transaction_by_reference(tx_ref):
    """Verify a v3 transaction by tx_ref (GET /v3/transactions?tx_ref=...)."""
    resp = _get(f'/transactions?tx_ref={tx_ref}')
    data = _json_or_raise(resp, 'transaction lookup by tx_ref')
    # v3 may return a list under data or a single object.
    raw = data.get('data')
    items = []
    if isinstance(raw, list):
        items = raw
    elif isinstance(raw, dict):
        # Could be paginated: data.data
        if isinstance(raw.get('data'), list):
            items = raw['data']
        elif 'tx_ref' in raw or 'id' in raw:
            items = [raw]
        else:
            items = list(raw.values()) if raw else []

    body = None
    for item in items:
        if not isinstance(item, dict):
            continue
        # Prefer exact tx_ref match
        if item.get('tx_ref') == tx_ref or item.get('reference') == tx_ref:
            body = item
            break
        if body is None:
            body = item

    if body is None:
        raise FlutterwaveVerificationError(f"No transaction found for reference {tx_ref}.")
    return _parse_transaction(body, tx_ref)


def verify_webhook_signature(request):
    """Verify the webhook secret hash (verif-hash header)."""
    expected = _hash()
    if not expected:
        logger.warning('Flutterwave webhook: FLUTTERWAVE_SECRET_HASH not set; signature NOT verified.')
        return False
    header_hash = (
        request.headers.get('verif-hash')
        or request.headers.get('x-flutterwave-signature')
        or ''
    )
    return hmac.compare_digest(header_hash.lower(), expected.lower())


def handle_webhook(payload_data):
    """Process a Flutterwave webhook event (charge.completed)."""
    event = payload_data.get('event')
    data = payload_data.get('data') or {}
    if event and event != EVENT_CHARGE_COMPLETED:
        logger.info('Flutterwave webhook event: %s', event)

    reference = (
        data.get('tx_ref')
        or data.get('reference')
        or (data.get('data') or {}).get('tx_ref')
        or (data.get('data') or {}).get('reference')
        or payload_data.get('tx_ref')
        or payload_data.get('reference')
        or ''
    )
    if not reference:
        return 'ignored'

    payment = (
        Payment.objects.filter(reference=reference)
        .select_related('user', 'plan', 'subscription')
        .first()
    )
    if payment is None:
        logger.warning('Flutterwave webhook for unknown reference %s', reference)
        return 'unknown_reference'

    if payment.status == 'completed':
        return 'already_processed'

    flw_tx_id = (
        data.get('id')
        or payload_data.get('id')
        or data.get('flw_ref')
        or payload_data.get('flw_ref')
        or (data.get('data') or {}).get('id')
    )
    if not flw_tx_id:
        logger.error('Flutterwave webhook: no transaction id for %s', reference)
        return 'verification_failed'

    try:
        verified = verify_transaction(flw_tx_id)
    except (FlutterwaveError, FlutterwaveVerificationError) as exc:
        logger.error('Flutterwave webhook re-verification failed for %s: %s', reference, exc)
        return 'verification_failed'

    expected = int(round(float(payment.plan.price))) if payment.plan else None
    amount = int(round(float(verified.get('amount', 0))))
    if expected is not None and amount and amount != expected:
        logger.error('Flutterwave amount mismatch for %s: expected %s got %s', reference, expected, amount)
        return 'amount_mismatch'

    currency = verified.get('currency') or ''
    if currency and currency != 'NGN':
        logger.error('Flutterwave currency mismatch for %s: %s', reference, currency)
        return 'currency_mismatch'

    payment.transaction_reference = verified.get('flw_ref') or payment.transaction_reference
    payment.transaction_id = verified.get('id') or payment.transaction_id
    payment.metadata = (payment.metadata or {}) | {'flutterwave': data}
    payment.save(update_fields=['transaction_reference', 'transaction_id', 'metadata'])
    activate_paid_subscription(payment)
    return 'activated'
