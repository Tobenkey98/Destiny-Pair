from django.urls import path, include

urlpatterns = [
    path('api/auth/', include('accounts.urls')),
    path('api/auth/', include('chat.urls')),
    path('api/auth/', include('profiles.urls')),
    path('api/auth/', include('counselling.urls')),
    path('api/auth/', include('matching.urls')),
    path('api/admin/', include('admins.urls')),
]
