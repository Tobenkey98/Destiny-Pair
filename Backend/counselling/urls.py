from django.urls import path
from . import views

urlpatterns = [
    path('counselling/', views.CounsellingSessionListCreateView.as_view(), name='auth-counselling'),
]
