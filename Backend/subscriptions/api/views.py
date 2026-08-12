import uuid

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.models import Payment
from payments.services import monnify, paystack
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


GATEWAYS = ('paystack', 'monnify')


def _gateway_service(gateway):
    return monnify if gateway == 'monnify' else paystack


def _gateway_errors(gateway):
    if gateway == 'monnify':
        return monnify.MonnifyError
    return paystack.PaystackError


def _checkout_callback(gateway, plan_slug):
    return f"{settings.FRONTEND_URL}/checkout/{plan_slug}?gateway={gateway}"


def _initialize_checkout(gateway, user, plan, reference, payment_id):
    """Initialize a checkout on the chosen gateway and normalize the result."""
    metadata = {
        'payment_id': payment_id,
        'user_id': user.id,
        'plan_slug': plan.slug,
    }
    if gateway == 'monnify':
        result = monnify.initialize_transaction(
            user, plan, reference,
            redirect_url=_checkout_callback(gateway, plan.slug),
            metadata=metadata,
        )
        return {
            'checkout_url': result.get('checkoutUrl', ''),
            'access_code': '',
            'transaction_reference': result.get('transactionReference', ''),
        }
    result = paystack.initialize_transaction(
        user, plan, reference,
        metadata=metadata,
        callback_url=_checkout_callback(gateway, plan.slug),
    )
    return {
        'checkout_url': result['authorization_url'],
        'access_code': result.get('access_code'),
        'transaction_reference': '',
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
    ``gateway`` (``paystack`` or ``monnify``). The amount is always read from
    the DB and the payment reference is server-generated, so a client can
    never pay a manipulated price. Activation only happens server-side via
    the webhook or ``verify-payment`` after a fresh gateway verification.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        plan_slug = request.data.get('plan_slug', '').strip()
        gateway = (request.data.get('gateway') or 'paystack').strip().lower()
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
            except (paystack.PaystackError, monnify.MonnifyError):
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
        except (paystack.PaystackError, monnify.MonnifyError) as exc:
            payment.status = 'failed'
            payment.save(update_fields=['status'])
            return Response(
                {'error': 'GATEWAY_UNAVAILABLE', 'gateway': gateway, 'detail': str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if gateway == 'monnify' and result['transaction_reference']:
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
        transaction_reference = request.data.get('transaction_reference', '').strip()

        query = Q(user=request.user)
        if transaction_reference:
            query &= Q(transaction_reference=transaction_reference)
        elif reference:
            query &= Q(reference=reference)
        else:
            return Response(
                {'error': 'reference or transaction_reference is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = Payment.objects.filter(query).select_related(
            'user', 'plan', 'subscription',
        ).first()
        if payment is None:
            return Response({'error': 'PAYMENT_NOT_FOUND'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == 'completed':
            return Response({'status': 'already_activated'})

        gateway = payment.gateway
        try:
            if gateway == 'monnify':
                verified = monnify.verify_transaction(payment.reference)
                amount_ok = abs(float(verified.get('amountPaid') or 0)
                                - float(payment.plan.price)) <= 0.01
            else:
                verified = paystack.verify_transaction(reference or payment.reference)
                amount_ok = int(verified.get('amount', 0)) == int(payment.plan.price * 100)
        except (monnify.MonnifyVerificationError, paystack.PaystackVerificationError) as exc:
            return Response(
                {'error': 'PAYMENT_NOT_SUCCESSFUL', 'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except (monnify.MonnifyError, paystack.PaystackError) as exc:
            return Response(
                {'error': 'GATEWAY_UNAVAILABLE', 'gateway': gateway, 'detail': str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not amount_ok:
            return Response({'error': 'AMOUNT_MISMATCH'}, status=status.HTTP_400_BAD_REQUEST)

        if gateway == 'monnify':
            payment.transaction_reference = (
                verified.get('transactionReference') or payment.transaction_reference
            )
            payment.transaction_id = verified.get('transactionReference') or payment.transaction_id
        else:
            payment.transaction_id = verified.get('id')
        payment.status = 'completed'
        payment.metadata = (payment.metadata or {}) | {'verified': True}
        payment.save()

        subscription = paystack.activate_paid_subscription(payment)
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