"""Monnify integration.

Security notes
--------------
* Activation/renewal happens ONLY inside ``handle_webhook`` after the event
  signature has been verified and the transaction re-verified with Monnify —
  never trust the frontend's "payment success".
* ``initialize_transaction`` returns the Monnify checkout URL; the client
  must not be able to pick the plan by editing a field, so the plan price is
  read from the DB and the payment reference is server-generated.
* The webhook signature is an HMAC-SHA512 of the raw request body using the
  Monnify client secret key, compared with a constant-time compare.
"""

import base64
import hashlib
import hmac
import logging
import time

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
import requests

from payments.models import Payment
from payments.services.paystack import activate_paid_subscription

logger = logging.getLogger(__name__)

MONNIFY_BASE_URL = 'https://api.monnify.com'
MONNIFY_SANDBOX_URL = 'https://sandbox.monnify.com'

EVENT_SUCCESSFUL_TRANSACTION = 'SUCCESSFUL_TRANSACTION'

ACCESS_TOKEN_CACHE_KEY = 'monnify_access_token'

# In-memory fallback so checkout still works even when Redis is unavailable.
# TTL is re-checked on every read.
_memory_token = {'token': None, 'expires_at': None}


class MonnifyError(Exception):
    pass


class MonnifyVerificationError(MonnifyError):
    pass


def _base_url():
    url = getattr(settings, 'MONNIFY_BASE_URL', '')
    if url and url not in (MONNIFY_BASE_URL, MONNIFY_SANDBOX_URL):
        return url
    if getattr(settings, 'MONNIFY_SANDBOX', False):
        return url or MONNIFY_SANDBOX_URL
    return url or MONNIFY_BASE_URL


def _api_key():
    key = getattr(settings, 'MONNIFY_API_KEY', '')
    if not key:
        raise MonnifyError('MONNIFY_API_KEY is not configured.')
    return key


def _secret_key():
    key = getattr(settings, 'MONNIFY_SECRET_KEY', '')
    if not key:
        raise MonnifyError('MONNIFY_SECRET_KEY is not configured.')
    return key


def _basic_auth_header():
    credentials = base64.b64encode(
        f'{_api_key()}:{_secret_key()}'.encode('utf-8')
    ).decode('ascii')
    return {'Authorization': f'Basic {credentials}'}


def _cached_token():
    """Best-effort token lookup: Redis first (fast-fail), then in-memory."""
    try:
        token = cache.get(ACCESS_TOKEN_CACHE_KEY)
        if token:
            return token
    except Exception:
        pass
    if _memory_token['token'] and _memory_token['expires_at'] and time.time() < _memory_token['expires_at']:
        return _memory_token['token']
    return None


def get_access_token(force_refresh=False):
    """Return a Monnify bearer token, caching it (Redis best-effort with an
    in-memory fallback) to avoid hammering Monnify on every request."""
    if not force_refresh:
        token = _cached_token()
        if token:
            return token

    try:
        resp = requests.post(
            f'{_base_url()}/api/v1/auth/login',
            headers=_basic_auth_header(),
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.error('Monnify auth failed: %s', exc)
        raise MonnifyError('Could not reach Monnify.') from exc

    data = resp.json() if resp.content else {}
    if resp.status_code != 200 or not data.get('requestSuccessful'):
        message = data.get('responseMessage', f'Monnify error {resp.status_code}')
        logger.error('Monnify auth rejected: %s', message)
        raise MonnifyError(message)

    body = data.get('responseBody') or {}
    token = body.get('accessToken')
    if not token:
        raise MonnifyError('Monnify auth returned no access token.')

    expires_in = int(body.get('expiresIn', 3600))
    ttl = max(expires_in - 60, 60)
    _memory_token['token'] = token
    _memory_token['expires_at'] = time.time() + expires_in
    try:
        cache.set(ACCESS_TOKEN_CACHE_KEY, token, timeout=ttl)
    except Exception:
        pass
    return token


def _bearer_headers():
    return {
        'Authorization': f'Bearer {get_access_token()}',
        'Content-Type': 'application/json',
    }


def initialize_transaction(user, plan, payment_reference, redirect_url=None, metadata=None):
    """Create a Monnify checkout for the given plan.

    ``payment_reference`` must be a server-generated unique reference
    (``payments.api.create_payment_reference``). Returns the data dict from
    Monnify which includes ``checkoutUrl`` and ``transactionReference``.

    Note: Monnify amounts are NGN (decimal), not the smallest unit.
    """
    contract_code = getattr(settings, 'MONNIFY_CONTRACT_CODE', '')
    if not contract_code:
        raise MonnifyError('MONNIFY_CONTRACT_CODE is not configured.')

    payload = {
        'amount': float(plan.price),
        'customerName': user.get_full_name() or user.username,
        'customerEmail': user.email,
        'paymentReference': payment_reference,
        'paymentDescription': f'{plan.name} subscription plan',
        'contractCode': contract_code,
        'currencyCode': 'NGN',
        'paymentMethods': ['CARD', 'ACCOUNT_TRANSFER', 'USSD'],
        'redirectUrl': redirect_url or getattr(
            settings, 'MONNIFY_REDIRECT_URL',
            'http://localhost:5173/checkout/complete',
        ),
    }
    if metadata:
        payload['metaData'] = metadata

    try:
        resp = requests.post(
            f'{_base_url()}/api/v1/merchant/transactions/init-transaction',
            json=payload,
            headers=_bearer_headers(),
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.error('Monnify initialize failed: %s', exc)
        raise MonnifyError('Could not reach Monnify.') from exc

    data = resp.json() if resp.content else {}
    if resp.status_code != 200 or not data.get('requestSuccessful'):
        message = data.get('responseMessage', f'Monnify error {resp.status_code}')
        logger.error('Monnify initialize rejected: %s', message)
        raise MonnifyError(message)

    return data.get('responseBody') or {}


def verify_transaction(payment_reference):
    """Confirm a transaction with Monnify by payment reference.

    Returns the matching transaction dict (with ``paymentStatus``,
    ``amountPaid``, ``transactionCurrency``) or raises MonnifyError when the
    transaction is not found / not successful.
    """
    try:
        resp = requests.get(
            f'{_base_url()}/api/v2/merchant/transactions/query',
            params={'paymentReference': payment_reference},
            headers={
                **_bearer_headers(),
                'Transaction-X-Client-API-Key': _api_key(),
            },
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.error('Monnify verify failed: %s', exc)
        raise MonnifyError('Could not reach Monnify.') from exc

    data = resp.json() if resp.content else {}
    if resp.status_code != 200 or not data.get('requestSuccessful'):
        raise MonnifyError(
            data.get('responseMessage', 'Verification failed.')
        )

    body = data.get('responseBody') or {}
    transactions = body.get('transactions') if isinstance(body, dict) else body
    if isinstance(transactions, list):
        if not transactions:
            raise MonnifyVerificationError(
                f'No transaction found for reference {payment_reference}.'
            )
        transaction = transactions[0]
    elif isinstance(body, dict) and body.get('paymentStatus'):
        transaction = body
    else:
        raise MonnifyVerificationError(
            f'No transaction found for reference {payment_reference}.'
        )

    if transaction.get('paymentStatus') != 'PAID':
        raise MonnifyVerificationError(
            f"Transaction {payment_reference} is not paid "
            f"({transaction.get('paymentStatus')})."
        )
    return transaction


def verify_webhook_signature(request):
    """Verify the ``monnify-signature`` header against the raw body.

    Must be called with the RAW request body (before any parsing). Returns
    True when the signature matches, False otherwise.

    Note: Monnify only sends the signature header on PRODUCTION webhooks. In
    sandbox mode a missing header is tolerated (the server-side re-verification
    inside ``handle_webhook`` remains the binding security control); in
    production a missing header fails closed.
    """
    signature = request.headers.get('Monnify-Signature', '')
    if not signature:
        if getattr(settings, 'MONNIFY_SANDBOX', False):
            return True
        return False
    try:
        secret = _secret_key().encode('utf-8')
    except MonnifyError:
        # Fails closed: without a configured secret nothing can be trusted.
        return False
    raw = getattr(request, 'raw_body', b'') or request.body
    computed = hmac.new(secret, raw, hashlib.sha512).hexdigest()
    return hmac.compare_digest(computed, signature)


def _webhook_parts(payload_data):
    """Normalize both webhook payload shapes.

    Modern: ``{"eventType": "...", "eventData": {...}}``
    Legacy (older sandbox payloads): fields at the top level.
    """
    event = payload_data.get('eventType') or payload_data.get('event')
    data = payload_data.get('eventData') or {}
    if event is None and payload_data.get('paymentStatus') == 'PAID':
        event = EVENT_SUCCESSFUL_TRANSACTION
        data = payload_data
    return event, data


def handle_webhook(payload_data):
    """Process a verified Monnify webhook event.

    ``payload_data`` is the parsed JSON body. Returns a status string for
    the caller to log.
    """
    event, data = _webhook_parts(payload_data)
    if event != EVENT_SUCCESSFUL_TRANSACTION:
        logger.info('Monnify webhook ignored event: %s', event)
        return 'ignored'

    reference = data.get('paymentReference') or ''
    transaction_reference = data.get('transactionReference') or ''
    if not reference:
        return 'ignored'

    payment = (
        Payment.objects.filter(reference=reference)
        .select_related('user', 'plan', 'subscription')
        .first()
    )
    if payment is None:
        logger.warning('Monnify webhook for unknown reference %s', reference)
        return 'unknown_reference'

    if payment.status == 'completed':
        return 'already_processed'

    # Re-verify with Monnify server-side; never trust the event alone.
    try:
        verified = verify_transaction(reference)
    except (MonnifyError, MonnifyVerificationError) as exc:
        logger.error('Monnify webhook re-verification failed for %s: %s',
                     reference, exc)
        return 'verification_failed'

    expected = float(payment.plan.price)
    amount = _as_amount(verified.get('amountPaid'))
    if amount is None or abs(amount - expected) > 0.01:
        logger.error('Monnify amount mismatch for %s: expected %s got %s',
                     reference, payment.plan.price, amount)
        return 'amount_mismatch'

    currency = verified.get('transactionCurrency') or verified.get('currency')
    if currency and currency != 'NGN':
        logger.error('Monnify currency mismatch for %s: %s',
                     reference, currency)
        return 'currency_mismatch'

    payment.transaction_reference = (
        transaction_reference
        or verified.get('transactionReference')
        or payment.transaction_reference
    )
    payment.transaction_id = verified.get('transactionReference') or payment.transaction_id
    payment.metadata = data.get('product') or payment.metadata or {}
    payment.save(update_fields=['transaction_reference', 'transaction_id', 'metadata'])
    activate_paid_subscription(payment)
    return 'activated'


def _as_amount(value):
    """Monnify sends amounts as numbers or strings (e.g. ``"5500.00"``)."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
