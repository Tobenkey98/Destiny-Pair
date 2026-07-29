import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
import requests

from .serializers import (
    SignupSerializer, LoginSerializer, SocialAuthSerializer,
    UserSerializer, EmailSerializer, VerifyCodeSerializer,
    DiscoverSerializer, ActivitySerializer,
)
from .models import Activity
from matching.models import Match

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    stamp = getattr(user, 'security_stamp', '') or ''
    refresh['stamp'] = stamp
    refresh.access_token['stamp'] = stamp
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def generate_code():
    return f"{random.randint(100000, 999999)}"


def send_verification_email(user):
    code = generate_code()
    user.verification_code = code
    user.verification_code_created_at = timezone.now()
    user.save(update_fields=['verification_code', 'verification_code_created_at'])

    subject = "Your verification code – DestinyPair"
    html_message = render_to_string('accounts/verify_email.html', {
        'user': user,
        'code': code,
    })
    plain_message = strip_tags(html_message)

    try:
        send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message)
    except Exception:
        pass


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        password = serializer.validated_data['password']
        first_name = serializer.validated_data.get('first_name', '').strip() or 'User'

        try:
            user = User.objects.get(email=email)
            if user.is_verified:
                return Response({'error': 'This email is already registered.'}, status=status.HTTP_409_CONFLICT)
            user.first_name = first_name
            user.set_password(password)
            user.save()
            send_verification_email(user)
            return Response({
                'user': UserSerializer(user, context={'request': request}).data,
                'message': 'Account updated. New verification code sent.',
            })
        except User.DoesNotExist:
            pass

        user = User(email=email, username=email, first_name=first_name)
        user.set_password(password)
        user.is_active = True
        user.save()
        send_verification_email(user)
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'message': 'Account created. Please check your email for the verification code.',
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(email=serializer.validated_data['email'])
        except User.DoesNotExist:
            return Response({'error': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(serializer.validated_data['password']):
            return Response({'error': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)

        if hasattr(user, 'admin_profile'):
            return Response(
                {'error': 'This is an administrator account. Please sign in via the admin portal.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.is_verified:
            return Response({
                'error': 'Email not verified',
                'needs_verification': True,
                'email': user.email,
            }, status=status.HTTP_403_FORBIDDEN)

        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        tokens = get_tokens_for_user(user)
        return Response({'user': UserSerializer(user, context={'request': request}).data, 'tokens': tokens})


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        code = serializer.validated_data['code']

        try:
            user = User.objects.get(email=email, is_verified=False)
        except User.DoesNotExist:
            return Response({'error': 'User not found or already verified'}, status=status.HTTP_404_NOT_FOUND)

        if user.verification_code is None:
            return Response({'error': 'No verification code sent'}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now() - user.verification_code_created_at > timedelta(minutes=10):
            return Response({'error': 'Verification code expired. Request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.verification_code != code:
            return Response({'error': 'Invalid verification code'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_verified = True
        user.verification_code = None
        user.verification_code_created_at = None
        user.save(update_fields=['is_verified', 'verification_code', 'verification_code_created_at'])

        return Response({'message': 'Email verified successfully'})


class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(email=serializer.validated_data['email'], is_verified=False)
            send_verification_email(user)
            return Response({'message': 'Verification code resent'})
        except User.DoesNotExist:
            return Response({'error': 'User not found or already verified'}, status=status.HTTP_404_NOT_FOUND)


class SocialAuthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SocialAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = serializer.validated_data['provider']
        access_token = serializer.validated_data['access_token']

        user_data = self.verify_token(provider, access_token)
        if not user_data:
            return Response({'error': f'Invalid {provider} token'}, status=status.HTTP_401_UNAUTHORIZED)

        email = user_data.get('email')
        if not email:
            return Response({'error': 'Email not provided by provider'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            created = False
        except User.DoesNotExist:
            first_name = serializer.validated_data.get('first_name') or user_data.get('given_name', '') or user_data.get('first_name', '')
            last_name = serializer.validated_data.get('last_name') or user_data.get('family_name', '') or user_data.get('last_name', '')
            user = User.objects.create(
                email=email,
                username=email,
                first_name=first_name,
                last_name=last_name,
                is_verified=True,
            )
            created = True

        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'tokens': tokens,
            'created': created,
        })

    def verify_token(self, provider, token):
        if provider == 'google':
            return self._verify_google(token)
        elif provider == 'facebook':
            return self._verify_facebook(token)
        return None

    def _verify_google(self, token):
        try:
            resp = requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {token}'},
                timeout=10,
            )
            if resp.status_code == 200:
                return resp.json()
        except requests.RequestException:
            pass
        return None

    def _verify_facebook(self, token):
        try:
            resp = requests.get(
                'https://graph.facebook.com/me',
                params={
                    'fields': 'id,name,email,first_name,last_name',
                    'access_token': token,
                },
                timeout=10,
            )
            data = resp.json()
            if 'email' in data:
                return data
        except requests.RequestException:
            pass
        return None


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


SUGGESTION_FIELDS = {
    'denomination', 'place_of_worship',
    'institution', 'profession', 'workplace',
    'highest_qualification',
}


class SuggestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        field = request.query_params.get('field', '')
        query = request.query_params.get('q', '').strip()

        if field not in SUGGESTION_FIELDS:
            return Response({'error': 'Invalid field'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f'suggestions:{field}'
        suggestions = cache.get(cache_key)

        if suggestions is None:
            suggestions = list(
                User.objects
                .filter(**{f'{field}__gt': ''})
                .values_list(field, flat=True)
                .distinct()
                .order_by(field)
            )
            cache.set(cache_key, suggestions, settings.SUGGESTIONS_CACHE_TTL)

        if query:
            ql = query.lower()
            suggestions = [s for s in suggestions if ql in s.lower()]

        return Response({'suggestions': suggestions[:20]})


class DiscoverView(generics.ListAPIView):
    serializer_class = DiscoverSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.filter(is_verified=True).exclude(id=user.id)
        if user.faith:
            qs = qs.filter(faith=user.faith)
        if user.gender == 'Male':
            qs = qs.filter(gender='Female')
        elif user.gender == 'Female':
            qs = qs.filter(gender='Male')
        interacted = Match.objects.filter(from_user=user).values_list('to_user_id', flat=True)
        qs = qs.exclude(id__in=interacted)
        return qs


class ActivityListView(generics.ListAPIView):
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Activity.objects.filter(user=self.request.user)[:50]


class UnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Activity.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})


class MarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Activity.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'ok'})


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            code = generate_code()
            user.reset_code = code
            user.reset_code_created_at = timezone.now()
            user.save(update_fields=['reset_code', 'reset_code_created_at'])

            subject = "Password Reset Code – DestinyPair"
            html_message = render_to_string('accounts/reset_code_email.html', {
                'user': user,
                'code': code,
            })
            plain_message = strip_tags(html_message)
            try:
                send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message)
            except Exception:
                pass
        except User.DoesNotExist:
            pass

        return Response({'message': 'If this email is registered, a reset code has been sent.'})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = request.data.get('code', '').strip()
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')
        new_password2 = request.data.get('new_password2', '')

        if not all([email, code, old_password, new_password, new_password2]):
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Invalid reset code or email'}, status=status.HTTP_400_BAD_REQUEST)

        if user.reset_code != code:
            return Response({'error': 'Invalid reset code or email'}, status=status.HTTP_400_BAD_REQUEST)

        if user.reset_code_created_at and (timezone.now() - user.reset_code_created_at) > timedelta(minutes=10):
            return Response({'error': 'Invalid reset code or email'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({'error': 'The remembered password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != new_password2:
            return Response({'error': 'New passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.reset_code = None
        user.reset_code_created_at = None
        user.save(update_fields=['password', 'reset_code', 'reset_code_created_at'])

        return Response({'message': 'Password has been reset successfully. You can now sign in.'})


class RecentlyVerifiedView(generics.ListAPIView):
    serializer_class = DiscoverSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(is_verified=True).order_by('-date_joined')[:6]
