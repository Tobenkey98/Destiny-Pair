import os
from pathlib import Path
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-9$x&#c&@%vsrc!_k(9c8*do09ux@o0gogzei3^&t&+=fwnt#!('
DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',
    'Destiny',
    'accounts',
    'counselling',
    'chat',
    'matching',
    'payments',
    'subscriptions',
    'profiles',
    'publications',
    'notifications',
    'audit_logs',
    'contacts',
    'admins',

]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'accounts.middleware.AdminActivityMiddleware',
]

ROOT_URLCONF = 'Destiny_Pair.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'Destiny_Pair.wsgi.application'
ASGI_APPLICATION = 'Destiny_Pair.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'accounts.validators.StrongPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = '127.0.0.1'
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
DEFAULT_FROM_EMAIL = 'noreply@destinypair.net'

FRONTEND_URL = 'http://localhost:5173'

# Celery + Redis
CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'
CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Paystack
# Set PAYSTACK_SECRET_KEY to a live/test secret key to enable checkout.
PAYSTACK_SECRET_KEY = os.environ.get('PAYSTACK_SECRET_KEY', '')
PAYSTACK_PUBLIC_KEY = os.environ.get('PAYSTACK_PUBLIC_KEY', '')
PAYSTACK_CALLBACK_URL = os.environ.get(
    'PAYSTACK_CALLBACK_URL',
    f'{os.environ.get("FRONTEND_URL", "http://localhost:5173")}/pricing',
)

# Monnify
# Set MONNIFY_API_KEY + MONNIFY_SECRET_KEY (client credentials) to enable the
# Monnify checkout. MONNIFY_SANDBOX accepts 1/true/yes (or a sandbox URL).
MONNIFY_API_KEY = os.environ.get('MONNIFY_API_KEY', '')
MONNIFY_SECRET_KEY = os.environ.get('MONNIFY_SECRET_KEY', '')
MONNIFY_CONTRACT_CODE = os.environ.get('MONNIFY_CONTRACT_CODE', '')
_monnify_sandbox_val = os.environ.get('MONNIFY_SANDBOX', '1')
MONNIFY_SANDBOX = (
    _monnify_sandbox_val.lower() in ('1', 'true', 'yes', 'on')
    or 'sandbox' in _monnify_sandbox_val.lower()
)
MONNIFY_BASE_URL = os.environ.get(
    'MONNIFY_BASE_URL',
    'https://sandbox.monnify.com' if MONNIFY_SANDBOX else 'https://api.monnify.com',
)
MONNIFY_REDIRECT_URL = os.environ.get(
    'MONNIFY_REDIRECT_URL',
    f'{FRONTEND_URL}/checkout/complete',
)

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 2,
            'SOCKET_TIMEOUT': 5,
        },
    }
}

# Cache suggestions for 1 hour
SUGGESTIONS_CACHE_TTL = 60 * 60

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'uploads'

SIGHTENGINE_API_USER = os.environ.get('SIGHTENGINE_API_USER', '')
SIGHTENGINE_API_SECRET = os.environ.get('SIGHTENGINE_API_SECRET', '')
SIGHTENGINE_ENABLED = bool(SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET)

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authentication.CustomJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
