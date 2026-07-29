from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.SignupView.as_view(), name='auth-signup'),
    path('login/', views.LoginView.as_view(), name='auth-login'),
    path('social/', views.SocialAuthView.as_view(), name='auth-social'),
    path('verify-email/', views.VerifyEmailView.as_view(), name='auth-verify-email'),
    path('resend-verification/', views.ResendVerificationView.as_view(), name='auth-resend-verification'),
    path('profile/', views.ProfileView.as_view(), name='auth-profile'),
    path('logout/', views.LogoutView.as_view(), name='auth-logout'),
    path('suggestions/', views.SuggestionsView.as_view(), name='auth-suggestions'),
    path('discover/', views.DiscoverView.as_view(), name='auth-discover'),
    path('activities/', views.ActivityListView.as_view(), name='auth-activities'),
    path('activities/unread-count/', views.UnreadCountView.as_view(), name='auth-unread-count'),
    path('activities/mark-read/', views.MarkReadView.as_view(), name='auth-mark-read'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='auth-reset-password'),
    path('recently-verified/', views.RecentlyVerifiedView.as_view(), name='auth-recently-verified'),
]
