from django.urls import path, include
from admins import views as admins_views

urlpatterns = [
    path('api/auth/', include('accounts.urls')),
    path('api/auth/', include('chat.urls')),
    path('api/auth/', include('profiles.urls')),
    path('api/auth/', include('counselling.urls')),
    path('api/auth/', include('matching.urls')),
    path('api/subscriptions/', include('subscriptions.api.urls')),
    path('api/payments/', include('payments.api.urls')),
    path('api/admin/', include('admins.urls')),
    path('api/seo/', admins_views.PublicSeoView.as_view(), name='public-seo'),
    path('api/content/', admins_views.PublicContentView.as_view(), name='public-content'),
    path('api/content/<slug:slug>/', admins_views.PublicContentDetailView.as_view(), name='public-content-detail'),
]
