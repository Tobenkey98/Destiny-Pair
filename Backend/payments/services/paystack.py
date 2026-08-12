"""Paystack integration.

Security notes
--------------
* Activation/renewal happens ONLY inside ``handle_webhook`` after the event
  signature has been verified — never trust the frontend's "payment success".
* ``initialize_transaction`` returns a checkout URL; the client must not be
  able to pick the plan by editing a field, so plan price is read from the DB.
"""

import hashlib
import hmac
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
import requests

from payments.models import Payment

logger = logging.getLogger(__name__)

PAYSTACK_BASE_URL = 'https://api.paystack.co'

EVENT_CHARGE_SUCCESS = 'charge.success'


class PaystackError(Exception):
    pass


class PaystackVerificationError(PaystackError):
    pass


def _secret_key():
    key = getattr(settings, 'PAYSTACK_SECRET_KEY', '')
    if not key:
        raise PaystackError('PAYSTACK_SECRET_KEY is not configured.')
    return key


def _headers():
    return {
        'Authorization': f'Bearer {_secret_key()}',
        'Content-Type': 'application/json',
    }


def initialize_transaction(user, plan, payment_reference, metadata=None, callback_url=None):
    """Create a Paystack checkout for the given plan.

    ``payment_reference`` must be a server-generated unique reference
    (``payments.api.create_payment_reference``). ``metadata`` is a dict that
    will be echoed back on the webhook — it always carries the payment id.
    """
    amount = int(plan.price * 100)  # Paystack uses kobo

    payload = {
        'email': user.email,
        'amount': amount,
        'reference': payment_reference,
        'currency': 'NGN',
        'callback_url': callback_url or getattr(
            settings, 'PAYSTACK_CALLBACK_URL',
            'http://localhost:5173/pricing',  # overridden in production settings
        ),
    }
    if metadata:
        payload['metadata'] = metadata

    try:
        resp = requests.post(
            f'{PAYSTACK_BASE_URL}/transaction/initialize',
            json=payload,
            headers=_headers(),
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.error('Paystack initialize failed: %s', exc)
        raise PaystackError('Could not reach Paystack.') from exc

    data = resp.json() if resp.content else {}
    if resp.status_code != 200 or not data.get('status'):
        message = data.get('message', f'Paystack error {resp.status_code}')
        logger.error('Paystack initialize rejected: %s', message)
        raise PaystackError(message)

    return data['data']  # {authorization_url, access_code, reference}


def verify_transaction(payment_reference):
    """Confirm a transaction with Paystack by reference. Returns the JSON body."""
    try:
        resp = requests.get(
            f'{PAYSTACK_BASE_URL}/transaction/verify/{payment_reference}',
            headers=_headers(),
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.error('Paystack verify failed: %s', exc)
        raise PaystackError('Could not reach Paystack.') from exc

    data = resp.json() if resp.content else {}
    if resp.status_code != 200 or not data.get('status'):
        raise PaystackError(data.get('message', 'Verification failed.'))
    if data['data']['status'] != 'success':
        raise PaystackVerificationError(
            f"Transaction {payment_reference} is not successful "
            f"({data['data'].get('status')})."
        )
    return data['data']


def verify_webhook_signature(request):
    """Verify the ``x-paystack-signature`` header against the raw body.

    Must be called with the RAW request body (before any parsing). Returns
    True when the signature matches, False otherwise.
    """
    signature = request.headers.get('X-Paystack-Signature', '')
    if not signature:
        return False
    secret = _secret_key().encode('utf-8')
    raw = getattr(request, 'raw_body', b'') or request.body
    computed = hmac.new(secret, raw, hashlib.sha512).hexdigest()
    return hmac.compare_digest(computed, signature)


def handle_webhook(event, payload_data):
    """Process a verified webhook event.

    ``payload_data`` is the parsed JSON body (dict with ``event`` and
    ``data``). Returns a status string for the caller to log.
    """
    event = payload_data.get('event')
    if event != EVENT_CHARGE_SUCCESS:
        logger.info('Paystack webhook ignored event: %s', event)
        return 'ignored'

    data = payload_data.get('data') or {}
    reference = data.get('reference')
    if not reference:
        return 'ignored'

    payment = (
        Payment.objects.filter(reference=reference)
        .select_related('user', 'plan', 'subscription')
        .first()
    )
    if payment is None:
        logger.warning('Paystack webhook for unknown reference %s', reference)
        return 'unknown_reference'

    if payment.status == 'completed':
        return 'already_processed'

    # Re-verify with Paystack server-side; never trust the event alone.
    try:
        verified = verify_transaction(reference)
    except (PaystackError, PaystackVerificationError) as exc:
        logger.error('Webhook re-verification failed for %s: %s', reference, exc)
        return 'verification_failed'

    amount_kobo = int(verified.get('amount', 0))
    if amount_kobo != int(payment.plan.price * 100):
        logger.error('Amount mismatch for %s: expected %s got %s',
                     reference, payment.plan.price, amount_kobo)
        return 'amount_mismatch'

    payment.transaction_id = verified.get('id')
    payment.metadata = data.get('metadata') or payment.metadata or {}
    activate_paid_subscription(payment)
    return 'activated'


def activate_paid_subscription(payment):
    """Activate (or renew) the user's subscription for the paid plan.

    Marks the payment completed, creates/renews the UserSubscription and
    resets the user's usage counters. Safe to call from the webhook handler
    and from the verify-payment endpoint.
    """
    from subscriptions.services import expiry_service, quota_service

    if payment.status != 'completed':
        payment.status = 'completed'
        payment.save(update_fields=['status'])

    plan = payment.plan
    user = payment.user
    now = timezone.now()

    subscription = payment.subscription
    if subscription is None:
        subscription = user.subscriptions.filter(
            plan=plan, status='active',
        ).order_by('-start_date').first()

    if subscription is None:
        from subscriptions.models import UserSubscription
        subscription = UserSubscription(
            user=user,
            plan=plan,
            start_date=now,
            end_date=now + timedelta(days=plan.duration_days),
            status='active',
            auto_renew=True,
        )
        subscription.save()
    else:
        expiry_service.renew_subscription(subscription, payment.reference)

    if payment.subscription_id != subscription.id:
        payment.subscription = subscription
        payment.save(update_fields=['subscription'])

    quota_service.reset_usage_for_user(user, plan=plan)
    logger.info('Subscription activated: user=%s plan=%s ref=%s',
                user.id, plan.slug, payment.reference)
    return subscription