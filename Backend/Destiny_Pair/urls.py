from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # NOTE: the React admin panel owns /admin/* (login, dashboard, ...).
    # Django's built-in admin lives at /django-admin/ so nginx can serve the
    # SPA for /admin/* while proxying /api/* (and /django-admin/*) to Django.
    path('django-admin/', admin.site.urls),
    path('', include('Destiny.urls')),
    path('api/', include('matching.api.urls')),
    path('api/chatbot/', include('chatbot.urls')),
    path('api/admin/', include('admins.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
