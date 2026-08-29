from django.urls import path

from . import views

urlpatterns = [
    path('', views.ChatbotSendView.as_view(), name='chatbot-send'),
    path('escalate/', views.ChatbotEscalateView.as_view(), name='chatbot-escalate'),
    path('feedback/', views.ChatbotFeedbackView.as_view(), name='chatbot-feedback'),
    path('config/', views.ChatbotConfigView.as_view(), name='chatbot-config'),
]
