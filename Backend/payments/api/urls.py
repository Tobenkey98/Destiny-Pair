from django.urls import path
from payments.api import views

urlpatterns = [
    path('flutterwave-webhook/', views.flutterwave_webhook, name='flutterwave-webhook'),
]
