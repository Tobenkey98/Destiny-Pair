from django.urls import path
from . import views

urlpatterns = [
    path('conversations/', views.ConversationListCreateView.as_view(), name='auth-conversations'),
    path('messages/', views.MessageListCreateView.as_view(), name='auth-messages'),
    path('audio-upload/', views.AudioUploadView.as_view(), name='auth-audio-upload'),
]
