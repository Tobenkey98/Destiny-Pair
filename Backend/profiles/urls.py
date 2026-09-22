from django.urls import path
from . import views

urlpatterns = [
    path('photos/', views.PhotoListView.as_view(), name='auth-photos'),
    path('photos/upload/', views.PhotoUploadView.as_view(), name='auth-photo-upload'),
    path('photos/<int:pk>/', views.PhotoDeleteView.as_view(), name='auth-photo-delete'),
    path('photos/<int:photo_id>/primary/', views.PrimaryPhotoView.as_view(), name='auth-photo-primary'),
    path('cover-photo/', views.CoverPhotoUploadView.as_view(), name='auth-cover-photo'),
    path('denominations/', views.DenominationListView.as_view(), name='auth-denominations'),
    path('testimonials/', views.TestimonialListView.as_view(), name='auth-testimonials'),
    path('vibes/', views.VibeListView.as_view(), name='auth-vibes'),
    path('hobbies/', views.HobbyListView.as_view(), name='auth-hobbies'),
    path('languages/', views.LanguageListView.as_view(), name='auth-languages'),
    path('locations/', views.LocationOptionListView.as_view(), name='auth-locations'),
]
