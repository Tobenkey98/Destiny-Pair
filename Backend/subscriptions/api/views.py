import logging
import uuid

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from rest_framework import generics, permissions, status

logger = logging.getLogger(__name__)
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.models import Payment
from payments.services import flutterwave
from payments.services.activation import activate_paid_subscription
from subscriptions.api.serializers import (
    CallSessionSerializer,
    SubscriptionPlanSerializer,
    UsageSerializer,
    UserSubscriptionSerializer,
)
from subscriptions.models import CallSession, SubscriptionPlan, UserSubscription
from subscriptions.services import plan_service, quota_service, usage_service
from accounts.legal import (
    REQUIRED_FOR_SUBSCRIPTION,
    has_current_consent,
)


def create_payment_reference():
    return 'DP-' + uuid.uuid4().hex.upper()[:20]


GATEWAYS = ('flutterwave',)


def _gateway_service(gateway):
    return flutterwave


def _gateway_errors(gateway):
    return flutterwave.FlutterwaveError


def _checkout_callback(gateway, plan_slug, reference=None):
    # Flutterwave appends ?tx_ref=...&status=...&transaction_id=... to the
    # redirect URL, so we must keep it free of our own query string and rely
    # on the returned `tx_ref` (which equals our payment reference).
    return f"{settings.FRONTEND_URL}/checkout/{plan_slug}"


def _initialize_checkout(gateway, user, plan, reference, payment_id):
    """Initialize a checkout on Flutterwave and normalize the result."""
    result = flutterwave.initialize_transaction(
        user, plan, reference,
        redirect_url=_checkout_callback(gateway, plan.slug, reference),
        callback_url=f"{settings.FRONTEND_URL}/api/payments/flutterwave-webhook/",
    )
    return {
        'tx_ref': result.get('tx_ref', ''),
        'amount': result.get('amount', ''),
        'currency': result.get('currency', 'NGN'),
        'public_key': result.get('public_key', ''),
        'customer_email': result.get('customer_email', ''),
        'customer_name': result.get('customer_name', ''),
        'customer_phone': result.get('customer_phone', ''),
        'redirect_url': result.get('redirect_url', ''),
        'payment_options': result.get('payment_options', ''),
        'access_code': '',
        'transaction_reference': result.get('transaction_reference', ''),
    }


# ---------------------------------------------------------------------------
# Public / user-facing
# ---------------------------------------------------------------------------

class PlanListView(generics.ListAPIView):
    """Public: every active plan, cheapest first."""
    permission_classes = [permissions.AllowAny]
    serializer_class = SubscriptionPlanSerializer
    queryset = SubscriptionPlan.objects.filter(is_active=True).order_by('price')


class CurrentSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sub = plan_service.get_active_subscription(request.user)
        if sub is None:
            return Response({'plan': None, 'subscription': None})
        return Response({
            'plan': SubscriptionPlanSerializer(sub.plan).data,
            'subscription': UserSubscriptionSerializer(sub).data,
        })


class UsageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        plan = plan_service.get_effective_plan(user)
        data = {
            'plan_slug': plan.slug,
            'plan_name': plan.name,
            'messages_remaining': quota_service.messages_remaining(user),
            'messages_used': quota_service.message_used_count(user),
            'active_conversations': quota_service.active_conversations(user),
            'active_conversation_limit': plan.active_conversation_limit,
            'audio_minutes_remaining': quota_service.minutes_remaining(user, 'audio'),
            'audio_minutes_used': quota_service.minutes_used(user, 'audio'),
            'video_minutes_remaining': quota_service.minutes_remaining(user, 'video'),
            'video_minutes_used': quota_service.minutes_used(user, 'video'),
            'profile_views_remaining': quota_service.daily_views_remaining(user),
            'profile_views_used': quota_service.daily_views_used(user),
            'likes_remaining': quota_service.daily_likes_remaining(user),
            'likes_used': quota_service.daily_likes_used(user),
            'saves_remaining': quota_service.daily_saves_remaining(user),
            'saves_used': quota_service.daily_saves_used(user),
            'counselling_sessions_remaining': quota_service.counselling_sessions_remaining(user),
            'features': {
                name: getattr(plan, name, False)
                for name in plan_service.FEATURE_FIELDS
            },
        }
        return Response(UsageSerializer(data).data)


class SubscribeView(APIView):
    """Create a pending Payment and initialize a gateway checkout.

    The client may only choose ``plan_slug`` (an existing, active plan) and
    ``gateway`` (only ``flutterwave`` is supported). The amount is always read from
    the DB and the payment reference is server-generated, so a client can
    never pay a manipulated price. Activation only happens server-side via
    the webhook or ``verify-payment`` after a fresh gateway verification.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        plan_slug = request.data.get('plan_slug', '').strip()
        gateway = (request.data.get('gateway') or 'flutterwave').strip().lower()
        if gateway not in GATEWAYS:
            return Response({'error': 'INVALID_GATEWAY'}, status=status.HTTP_400_BAD_REQUEST)

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

        existing = Payment.objects.filter(
            user=request.user,
            plan=plan,
            gateway=gateway,
            status='pending',
        ).order_by('-created_at').first()

        if existing and existing.reference:
            reference = existing.reference
            try:
                result = _initialize_checkout(
                    gateway, request.user, plan, reference, existing.id,
                )
                return Response({
                    'gateway': gateway,
                    'reference': reference,
                    'payment_id': existing.id,
                    **result,
                })
            except (flutterwave.FlutterwaveError,):
                pass  # fall through and create a fresh checkout

        reference = create_payment_reference()
        payment = Payment.objects.create(
            user=request.user,
            plan=plan,
            amount=plan.price,
            currency='NGN',
            status='pending',
            gateway=gateway,
            payment_method=gateway,
            reference=reference,
            metadata={'plan_slug': plan.slug},
        )

        try:
            result = _initialize_checkout(
                gateway, request.user, plan, reference, payment.id,
            )
        except (flutterwave.FlutterwaveError,) as exc:
            payment.status = 'failed'
            payment.save(update_fields=['status'])
            return Response(
                {'error': 'GATEWAY_UNAVAILABLE', 'gateway': gateway, 'detail': str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if gateway == 'flutterwave' and result['transaction_reference']:
            payment.transaction_reference = result['transaction_reference']
            payment.save(update_fields=['transaction_reference'])

        return Response({
            'gateway': gateway,
            'reference': reference,
            'payment_id': payment.id,
            **result,
        }, status=status.HTTP_201_CREATED)


class VerifyPaymentView(APIView):
    """Verify a checkout with the payment gateway and activate the
    subscription.

    Only the payment owner (request.user) can verify their own payment, and
    the gateway re-verifies the transaction server-side. ``reference`` is
    accepted for Paystack, ``transaction_reference`` for Monnify; the
    gateway stored on the payment is what actually drives verification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = request.data.get('reference', '').strip()
        transaction_id = request.data.get('transaction_id', '').strip()

        if not reference:
            return Response(
                {'error': 'reference is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = Payment.objects.filter(
            user=request.user, reference=reference,
        ).select_related('user', 'plan', 'subscription').first()
        if payment is None:
            return Response({'error': 'PAYMENT_NOT_FOUND'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == 'completed':
            return Response({'status': 'already_activated'})

        gateway = payment.gateway
        flw_status = (request.data.get('flw_status') or '').lower()
        logger.info('VerifyPayment reference=%s transaction_id=%s flw_status=%s', reference, transaction_id, flw_status)
        verified = None
        amount_ok = False
        try:
            if transaction_id:
                try:
                    verified = flutterwave.verify_transaction(transaction_id)
                except flutterwave.FlutterwaveError:
                    # The modal's transaction id may not map to a v4 charge id;
                    # fall back to verifying by our generated reference.
                    verified = flutterwave.verify_transaction_by_reference(reference)
            else:
                verified = flutterwave.verify_transaction_by_reference(reference)
            amount_ok = (
                int(round(float(verified.get('amount', 0))))
                == int(payment.plan.price)
            )
        except (flutterwave.FlutterwaveVerificationError, flutterwave.FlutterwaveError) as exc:
            logger.error('Flutterwave verify error for %s (tx_id=%s): %s',
                         reference, transaction_id, exc)

        # The v4 OAuth token cannot read v3 modal payments, so when no v3 secret
        # key is configured we cannot verify server-side. In sandbox we trust the
        # provider's redirect when there is a real Flutterwave transaction id
        # (only present for an actual charge) or a success-like status, so local
        # testing works; production must set FLUTTERWAVE_SECRET_KEY (or use the
        # webhook) so this fallback is never taken.
        success_like = flw_status in {
            'successful', 'success', 'complete', 'completed', 'paid',
        }
        if (
            (verified is None or not amount_ok)
            and settings.FLUTTERWAVE_SANDBOX
            and (success_like or transaction_id)
        ):
            logger.warning(
                'SANDBOX dev fallback: trusting Flutterwave redirect for %s (flw_status=%s, tx_id=%s)',
                reference, flw_status, transaction_id,
            )
            verified = {
                'status': 'successful',
                'amount': float(payment.plan.price),
                'currency': getattr(payment.plan, 'currency', '') or 'NGN',
                'id': transaction_id or '',
                'flw_ref': transaction_id or '',
                'tx_ref': reference,
            }
            amount_ok = True

        if verified is None or not amount_ok:
            if not settings.FLUTTERWAVE_SANDBOX:
                return Response(
                    {'error': 'GATEWAY_UNAVAILABLE', 'gateway': gateway,
                     'detail': 'Payment could not be verified with Flutterwave.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response(
                {'error': 'PAYMENT_NOT_SUCCESSFUL', 'detail': 'Payment could not be confirmed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment.transaction_reference = verified.get('flw_ref') or payment.transaction_reference
        payment.transaction_id = verified.get('id') or payment.transaction_id
        payment.status = 'completed'
        payment.metadata = (payment.metadata or {}) | {'verified': bool(transaction_id)}
        payment.save()

        subscription = activate_paid_subscription(payment)
        return Response({
            'status': 'activated',
            'subscription': UserSubscriptionSerializer(subscription).data,
        })


class FeatureCheckView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, feature_name):
        if feature_name not in plan_service.FEATURE_FIELDS:
            return Response({'error': 'UNKNOWN_FEATURE'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'feature': feature_name,
            'allowed': plan_service.has_feature(request.user, feature_name),
        })


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------

class CallBalanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'audio_minutes_remaining': quota_service.minutes_remaining(user, 'audio'),
            'audio_minutes_used': quota_service.minutes_used(user, 'audio'),
            'video_minutes_remaining': quota_service.minutes_remaining(user, 'video'),
            'video_minutes_used': quota_service.minutes_used(user, 'video'),
        })


class CallStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        conversation_id = request.data.get('conversation_id')
        call_type = request.data.get('call_type', 'audio')
        if call_type not in ('audio', 'video'):
            return Response({'error': 'INVALID_CALL_TYPE'}, status=status.HTTP_400_BAD_REQUEST)
        if not conversation_id:
            return Response({'error': 'conversation_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        decision = (
            usage_service.can_make_audio_call(request.user, conversation_id=conversation_id)
            if call_type == 'audio'
            else usage_service.can_make_video_call(request.user, conversation_id=conversation_id)
        )
        if not decision['allowed']:
            return Response(decision, status=status.HTTP_403_FORBIDDEN)

        session = usage_service.start_call_session(request.user, call_type, conversation_id)
        return Response(
            CallSessionSerializer(session, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class CallEndView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = CallSession.objects.filter(
            id=session_id,
            conversation__participants=request.user,
        ).first()
        if session is None:
            return Response({'error': 'CALL_NOT_FOUND'}, status=status.HTTP_404_NOT_FOUND)

        session = usage_service.end_call_session(session)
        return Response(CallSessionSerializer(session, context={'request': request}).data)


class CallHistoryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CallSessionSerializer

    def get_queryset(self):
        return (
            CallSession.objects
            .filter(conversation__participants=self.request.user)
            .select_related('conversation', 'initiated_by')
            .order_by('-started_at')
        )