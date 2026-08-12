from django.urls import path
from payments.api import views

urlpatterns = [
    path('webhook/', views.paystack_webhook, name='paystack-webhook'),
    path('monnify-webhook/', views.monnify_webhook, name='monnify-webhook'),
]
