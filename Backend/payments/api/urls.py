from django.urls import path
from payments.api import views

urlpatterns = [
    path('flutterwave-webhook/', views.flutterwave_webhook, name='flutterwave-webhook'),
    path('charge/', views.ChargeCardView.as_view(), name='charge-card'),
]
