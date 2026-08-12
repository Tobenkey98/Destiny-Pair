from django.urls import path
from subscriptions.api import views

urlpatterns = [
    path('plans/', views.PlanListView.as_view(), name='subscription-plans'),
    path('current/', views.CurrentSubscriptionView.as_view(), name='subscription-current'),
    path('usage/', views.UsageView.as_view(), name='subscription-usage'),
    path('subscribe/', views.SubscribeView.as_view(), name='subscription-subscribe'),
    path('verify-payment/', views.VerifyPaymentView.as_view(), name='subscription-verify-payment'),
    path('features/<str:feature_name>/', views.FeatureCheckView.as_view(), name='subscription-feature'),
    path('calls/balance/', views.CallBalanceView.as_view(), name='subscription-call-balance'),
    path('calls/history/', views.CallHistoryView.as_view(), name='subscription-call-history'),
    path('calls/start/', views.CallStartView.as_view(), name='subscription-call-start'),
    path('calls/<int:session_id>/end/', views.CallEndView.as_view(), name='subscription-call-end'),
]
