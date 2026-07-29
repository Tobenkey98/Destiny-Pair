from django.urls import path
from . import views

urlpatterns = [
    path('matches/', views.MatchListCreateView.as_view(), name='auth-matches'),
    path('matches/<int:pk>/', views.MatchUpdateView.as_view(), name='auth-match-update'),
]
