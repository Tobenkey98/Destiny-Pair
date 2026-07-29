from django.urls import path
from . import views

urlpatterns = [
    path('matches/', views.MatchListView.as_view(), name='matching-matches'),
    path('match-score/<int:profile_id>/', views.MatchScoreView.as_view(), name='matching-match-score'),
    path('recommendations/', views.RecommendationView.as_view(), name='matching-recommendations'),
    path('profile-suggestions/', views.ProfileSuggestionView.as_view(), name='matching-profile-suggestions'),
    path('track-profile-view/', views.ProfileTrackView.as_view(), name='matching-track-view'),
    path('save-profile/', views.SaveProfileView.as_view(), name='matching-save-profile'),
]
