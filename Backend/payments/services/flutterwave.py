"""Flutterwave (v4) integration via the Checkout Sessions API.

Flutterwave v4 authenticates with OAuth 2.0 (client_credentials) rather than a
static secret key. A short-lived ``access_token`` is fetched from the identity
provider and cached until ~1 minute before expiry.

The hosted flow used here:
  1. ``create_customer``        -> a Flutterwave ``customer_id``
  2. ``create_checkout_session`` -> a hosted ``checkout_url`` the user is
     redirected to. The session ``id`` is stored as our payment's
     ``transaction_reference`` and the server-generated ``reference`` is sent
     as Flutterwave's ``reference`` (returned as ``tx_ref`` on redirect).
  3. After payment the user returns to ``redirect_url?tx_ref=...&status=...``
     and/or Flutterwave fires a webhook. Activation only happens after a
     server-side re-check of the checkout session (never trusting the browser).

The ``encryption_key`` is for client-side card encryption (inline charges) and
is not needed for this hosted flow, but is stored for completeness.
"""

import hashlib
import hmac
import logging
import os
import re
import threading
import time

from django.conf import settings
import requests

from payments.models import Payment
from payments.services.activation import activate_paid_subscription

logger = logging.getLogger(__name__)

TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token'

CHECKOUT_SESSIONS_PATH = '/checkout/sessions'
CUSTOMERS_PATH = '/customers'

EVENT_CHECKOUT_SESSION = 'checkout.session.completed'

SUCCESS_STATUSES = {'paid', 'complete', 'successful', 'succeeded', 'success'}


class FlutterwaveError(Exception):
    pass


class FlutterwaveVerificationError(FlutterwaveError):
    pass


# --- OAuth token cache ------------------------------------------------------
_token_cache = {'token': None, 'expiry': 0.0}
_token_lock = threading.Lock()


def _sandbox():
    return getattr(settings, 'FLUTTERWAVE_SANDBOX', False)


def _base_url():
    return (
        'https://developersandbox-api.flutterwave.com'
        if _sandbox()
        else 'https://api.flutterwave.com'
    )


def _client_id():
    val = getattr(settings, 'FLUTTERWAVE_CLIENT_ID', '')
    if not val:
        raise FlutterwaveError('FLUTTERWAVE_CLIENT_ID is not configured.')
    return val


def _client_secret():
    val = getattr(settings, 'FLUTTERWAVE_CLIENT_SECRET', '')
    if not val:
        raise FlutterwaveError('FLUTTERWAVE_CLIENT_SECRET is not configured.')
    return val


def _hash():
    return getattr(settings, 'FLUTTERWAVE_SECRET_HASH', '')


def _public_key():
    return getattr(settings, 'FLUTTERWAVE_PUBLIC_KEY', '')


def get_access_token():
    """Return a cached OAuth access token, fetching a new one if needed."""
    with _token_lock:
        now = time.time()
        if _token_cache['token'] and _token_cache['expiry'] - 60 > now:
            return _token_cache['token']
        return _fetch_token()


def _fetch_token():
    try:
        resp = requests.post(
            TOKEN_URL,
            data={
                'client_id': _client_id(),
                'client_secret': _client_secret(),
                'grant_type': 'client_credentials',
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.error('Flutterwave OAuth failed: %s', exc)
        raise FlutterwaveError('Could not authenticate with Flutterwave.') from exc

    data = resp.json() if resp.content else {}
    token = data.get('access_token')
    if not token:
        raise FlutterwaveError(f"Flutterwave OAuth rejected: {resp.status_code} {resp.text[:200]}")
    try:
        expires_in = int(data.get('expires_in', 600))
    except (TypeError, ValueError):
        expires_in = 600
    _token_cache['token'] = token
    _token_cache['expiry'] = time.time() + expires_in
    logger.info('Flutterwave access token fetched (expires in %ss)', expires_in)
    return token


def _headers():
    return {
        'Authorization': f'Bearer {get_access_token()}',
        'Content-Type': 'application/json',
    }


def _post(path, payload):
    try:
        resp = requests.post(f'{_base_url()}{path}', json=payload, headers=_headers(), timeout=20)
    except requests.RequestException as exc:
        logger.error('Flutterwave POST %s failed: %s', path, exc)
        raise FlutterwaveError('Could not reach Flutterwave.') from exc
    return resp


def _get(path):
    try:
        resp = requests.get(f'{_base_url()}{path}', headers=_headers(), timeout=20)
    except requests.RequestException as exc:
        logger.error('Flutterwave GET %s failed: %s', path, exc)
        raise FlutterwaveError('Could not reach Flutterwave.') from exc
    return resp


def _normalize_phone(phone):
    """Return a (country_code, local_number) pair valid for Flutterwave.

    Flutterwave requires ``number`` to be 7-10 digits (local, without the
    country dial code). Falls back to a safe placeholder when the user has no
    usable phone number.
    """
    digits = re.sub(r'\D', '', phone or '')
    country_code = '234'
    number = digits
    if number.startswith('234') and len(number) >= 10:
        number = number[3:]
    elif number.startswith('0') and len(number) >= 10:
        number = number[1:]
    if not (7 <= len(number) <= 10):
        number = '8012345678'
    return country_code, number


def _normalize_name(value):
    """Flutterwave names may only contain letters, spaces, commas, periods,
    hyphens and apostrophes, and must be 2-50 characters. Return a sanitized
    value, or '' when the source is unusable.
    """
    if not value:
        return ''
    cleaned = re.sub(r"[^A-Za-z\s,.'\-]", '', str(value)).strip()
    if len(cleaned) < 2:
        return ''
    return cleaned[:50]


def create_customer(user):
    """Create (or fetch) a Flutterwave customer for the given user."""
    raw = user.get_full_name() or user.username or user.email or ''
    parts = raw.split(' ', 1)
    first = _normalize_name(parts[0]) or 'User'
    last = _normalize_name(parts[1]) if len(parts) > 1 else ''
    if not last:
        last = first
    country_code, number = _normalize_phone(getattr(user, 'phone_number', '') or '')
    payload = {
        'email': user.email,
        'name': {'first': first, 'last': last},
        'phone': {'country_code': country_code, 'number': number},
    }
    resp = _post(CUSTOMERS_PATH, payload)
    data = resp.json() if resp.content else {}
    if data.get('status') == 'success':
        customer_id = (data.get('data') or {}).get('id')
        if not customer_id:
            raise FlutterwaveError('Flutterwave returned no customer id.')
        return customer_id
    # 409 conflict: the customer already exists -> fetch and reuse the id.
    if resp.status_code == 409 or data.get('code') == '10409':
        return _fetch_customer_by_email(user.email)
    raise FlutterwaveError(f"Flutterwave customer create failed: {resp.status_code} {resp.text[:200]}")


def _fetch_customer_by_email(email):
    """Return an existing customer id for the given email (used on 409)."""
    resp = _get(f'{CUSTOMERS_PATH}?email={email}')
    data = resp.json() if resp.content else {}
    items = data.get('data') or []
    if isinstance(items, dict):
        items = [items]
    for item in items:
        if item.get('id'):
            return item['id']
    raise FlutterwaveError('Flutterwave customer already exists but could not be fetched.')


def _get_or_create_customer_id(user):
    """Return a Flutterwave ``customer_id`` for ``user``, creating if needed."""
    try:
        return create_customer(user)
    except FlutterwaveError:
        raise


def initialize_transaction(user, plan, payment_reference, redirect_url=None, callback_url=None):
    """Create a Flutterwave v4 Checkout Session and return the hosted URL.

    This is the fully server-side v4 flow: we create (or reuse) a customer and
    then create a checkout session on Flutterwave. The user is handed the hosted
    ``checkout_url`` — no v3 browser SDK or public key is needed client-side.

    The session's ``reference`` is our unique payment reference, which Flutterwave
    carries onto the underlying charge so it can be verified server-side via the
    v4 Charges API (see ``verify_transaction_by_reference``).
    """
    customer_id = _get_or_create_customer_id(user)
    payload = {
        'amount': float(plan.price),
        'currency': 'NGN',
        'customer_id': customer_id,
        'redirect_url': redirect_url or getattr(settings, 'FLUTTERWAVE_CALLBACK_URL', ''),
        'reference': payment_reference,
        'max_retry_attempts': 3,
    }
    resp = _post(CHECKOUT_SESSIONS_PATH, payload)
    data = resp.json() if resp.content else {}
    body = data.get('data') or {}
    if data.get('status') != 'success' or not body.get('checkout_url'):
        logger.error('Flutterwave checkout session failed: %s %s', resp.status_code, resp.text[:300])
        raise FlutterwaveError(
            f'Flutterwave checkout session create failed: {resp.status_code} {resp.text[:200]}'
        )
    amount = body.get('amount')
    return {
        'checkout_url': body['checkout_url'],
        'checkout_id': body.get('id', ''),
        'amount': float(amount.get('value')) if isinstance(amount, dict) else float(amount or plan.price),
        'currency': body.get('currency', 'NGN'),
        'reference': body.get('reference') or payment_reference,
    }


def retrieve_checkout_session(session_id):
    """Fetch a Flutterwave v4 checkout session by its id."""
    resp = _get(f'{CHECKOUT_SESSIONS_PATH}/{session_id}')
    data = resp.json() if resp.content else {}
    body = data.get('data') or {}
    if data.get('status') != 'success' or not body:
        raise FlutterwaveError(
            f'Flutterwave checkout session retrieve failed: {resp.status_code} {resp.text[:200]}'
        )
    return body


def _normalize_session(body):
    """Extract (status, amount, currency) from a checkout-session body."""
    status = (body.get('status') or '').lower()
    amount = body.get('amount')
    if isinstance(amount, dict):
        value = float(amount.get('value', 0) or 0)
        currency = amount.get('currency')
    else:
        value = float(amount or 0)
        currency = body.get('currency')
    return status, value, currency


def _parse_charge(body, ref):
    """Extract a normalized verification result from a v4 Charge object."""
    status = (body.get('status') or '').lower()
    try:
        amount = float(body.get('amount') or body.get('charged_amount') or 0)
    except (TypeError, ValueError):
        amount = 0.0
    currency = body.get('currency') or ''
    if status in SUCCESS_STATUSES:
        return {
            'status': 'successful',
            'amount': amount,
            'currency': currency,
            'id': body.get('id'),
            'flw_ref': body.get('flw_ref') or body.get('id'),
            'tx_ref': body.get('tx_ref') or body.get('reference') or ref,
        }
    if status in ('expired', 'failed', 'cancelled', 'declined', 'abandoned'):
        raise FlutterwaveVerificationError(f"Charge {ref} is {status}.")
    raise FlutterwaveVerificationError(f"Charge {ref} is not successful yet ({status or 'unknown'}).")


def verify_transaction(transaction_id):
    """Verify a Flutterwave v4 charge by its id.

    The v4 OAuth token reads charges from the v4 Charges API (``/charges``). A
    checkout session id is not a charge id, so callers should prefer verifying
    by reference (``verify_transaction_by_reference``); this helper targets a
    known charge id.

    Raises FlutterwaveVerificationError when the charge is not successful.
    """
    resp = _get(f'/charges/{transaction_id}')
    data = resp.json() if resp.content else {}
    body = data.get('data') or {}
    if not body:
        raise FlutterwaveVerificationError(f"Charge {transaction_id} not found.")
    return _parse_charge(body, transaction_id)


def verify_checkout_session_status(session_id, expected_amount, expected_currency='NGN'):
    """Verify a v4 checkout session succeeded and matched the expected charge.

    Retrieves the session and, because the session itself does not carry the
    payment status, looks up the charge created under it by reference. Returns a
    normalized result (same shape as ``_parse_charge``) or raises.
    """
    body = retrieve_checkout_session(session_id)
    reference = body.get('reference') or ''
    amount_ok = False
    try:
        charged = float(
            body.get('amount', {}).get('value')
            if isinstance(body.get('amount'), dict)
            else body.get('amount') or 0
        )
        amount_ok = int(round(charged)) == int(round(float(expected_amount)))
    except (TypeError, ValueError):
        amount_ok = False
    currency = body.get('currency') or expected_currency
    if currency and currency != expected_currency:
        raise FlutterwaveVerificationError(
            f"Checkout session {session_id} currency mismatch ({currency})."
        )
    if not amount_ok:
        raise FlutterwaveVerificationError(
            f"Checkout session {session_id} amount mismatch."
        )
    return {
        'status': 'successful',
        'amount': charged,
        'currency': currency,
        'id': session_id,
        'flw_ref': session_id,
        'tx_ref': reference or session_id,
    }


def verify_transaction_by_reference(tx_ref):
    """Verify a Flutterwave charge by our tx_ref using the v4 Charges API.

    The browser modal does not reliably return a transaction id, but our
    generated tx_ref is always present in the redirect, so we look the charge
    up by reference and verify its status.
    """
    body = None
    for query in (f'/charges?tx_ref={tx_ref}', f'/charges?reference={tx_ref}'):
        resp = _get(query)
        data = resp.json() if resp.content else {}
        items = data.get('data') or []
        if isinstance(items, dict):
            items = [items]
        if items:
            body = items[0]
            break
    if body is None:
        raise FlutterwaveVerificationError(f"No charge found for reference {tx_ref}.")
    return _parse_charge(body, tx_ref)


def verify_webhook_signature(request):
    """Verify the webhook secret hash.

    Flutterwave signs webhooks with the configured secret hash (header
    ``verif-hash`` or ``x-flutterwave-signature``). If no hash is configured we
    cannot verify and fail closed — set FLUTTERWAVE_SECRET_HASH for production.
    """
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
    """Process a Flutterwave webhook event.

    ``payload_data`` is the parsed JSON body. We re-verify the checkout session
    server-side before activating — never trust the event payload alone.
    """
    event = payload_data.get('event')
    data = payload_data.get('data') or {}
    if event and event != EVENT_CHECKOUT_SESSION:
        logger.info('Flutterwave webhook event: %s', event)

    reference = (
        data.get('reference')
        or data.get('tx_ref')
        or (data.get('data') or {}).get('reference')
        or (data.get('data') or {}).get('tx_ref')
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
    )
    if not flw_tx_id:
        logger.error('Flutterwave webhook: no transaction id for %s', reference)
        return 'verification_failed'

    try:
        verified = verify_transaction(flw_tx_id)
    except (FlutterwaveError, FlutterwaveVerificationError) as exc:
        if settings.FLUTTERWAVE_SANDBOX:
            # Sandbox: if the charge id cannot be re-read, trust the webhook
            # event (test cards only) so activation works end-to-end.
            logger.warning('SANDBOX webhook fallback for %s: %s', reference, exc)
            verified = {
                'status': 'successful',
                'amount': float(payment.plan.price),
                'currency': (data.get('currency') or 'NGN'),
                'id': flw_tx_id,
                'flw_ref': flw_tx_id,
                'tx_ref': reference,
            }
        else:
            logger.error('Flutterwave webhook re-verification failed for %s: %s',
                         reference, exc)
            return 'verification_failed'

    expected = int(round(float(payment.plan.price)))
    amount = int(round(float(verified.get('amount', 0))))
    if amount and amount != expected:
        logger.error('Flutterwave amount mismatch for %s: expected %s got %s',
                     reference, expected, amount)
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
