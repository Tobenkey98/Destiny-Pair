import os
from pathlib import Path
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-9$x&#c&@%vsrc!_k(9c8*do09ux@o0gogzei3^&t&+=fwnt#!(')
# DEBUG and ALLOWED_HOSTS are env-driven so production can harden them
# without code changes (e.g. DJANGO_DEBUG=0, ALLOWED_HOSTS=api.yourdomain.com).
DEBUG = os.environ.get('DJANGO_DEBUG', '1').lower() in ('1', 'true', 'yes', 'on')
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get(
        'ALLOWED_HOSTS', 'localhost,127.0.0.1,[::1]',
    ).split(',')
    if host.strip()
]

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'cloudinary_storage',
    'cloudinary',
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
    'chatbot',

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

# --- Database ---
# Production uses PostgreSQL. Configuration is env-driven so you can point at a
# managed Postgres (Neon, RDS, Railway, Aiven, Heroku, etc.).
#
# Preferred: set DATABASE_URL (e.g. postgres://user:pass@host:5432/dbname,
# or the full URL your provider gives you, often with ?sslmode=require).
# Alternative: set the discrete DB_* variables below.
#
# If neither DATABASE_URL nor DB_ENGINE=postgresql is provided, it falls back to
# SQLite so local development / the existing db.sqlite3 keeps working.
if os.environ.get('DATABASE_URL'):
    import dj_database_url

    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ['DATABASE_URL'],
            conn_max_age=600,
            ssl_require=True,
        )
    }
elif os.environ.get('DB_ENGINE', '').lower() in ('postgres', 'postgresql', 'pg'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'destinypair'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'CONN_MAX_AGE': 600,
            'OPTIONS': {
                'sslmode': os.environ.get('DB_SSLMODE', 'disable'),
            },
        }
    }
else:
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

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# Celery + Redis
CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'
CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Flutterwave (v4 — OAuth 2.0 + Checkout Sessions)
# Set FLUTTERWAVE_CLIENT_ID + FLUTTERWAVE_CLIENT_SECRET (the v4 API credentials
# from the Flutterwave dashboard). FLUTTERWAVE_ENCRYPTION_KEY is for client-side
# card encryption (inline charges); it is unused by the hosted Checkout Sessions
# flow but stored for completeness.
# FLUTTERWAVE_SECRET_HASH is the webhook secret hash (set it so webhook
# signatures are verified in production).
# FLUTTERWAVE_PUBLIC_KEY is the browser-side "Public Key" (legacy v3 modal; not
# needed for the v4 Checkout Sessions flow, kept for reference).
# The v4 flow creates a hosted checkout session server-side (no v3 secret key).
# FLUTTERWAVE_SANDBOX: 1/true/yes -> sandbox API, empty -> live API.
FLUTTERWAVE_CLIENT_ID = os.environ.get('FLUTTERWAVE_CLIENT_ID', '')
FLUTTERWAVE_CLIENT_SECRET = os.environ.get('FLUTTERWAVE_CLIENT_SECRET', '')
FLUTTERWAVE_ENCRYPTION_KEY = os.environ.get('FLUTTERWAVE_ENCRYPTION_KEY', '')
FLUTTERWAVE_PUBLIC_KEY = os.environ.get('FLUTTERWAVE_PUBLIC_KEY', '')
FLUTTERWAVE_SECRET_HASH = os.environ.get('FLUTTERWAVE_SECRET_HASH', '')
FLUTTERWAVE_SANDBOX = os.environ.get('FLUTTERWAVE_SANDBOX', '').lower() in ('1', 'true', 'yes', 'on')
FLUTTERWAVE_CALLBACK_URL = os.environ.get(
    'FLUTTERWAVE_CALLBACK_URL',
    f'{FRONTEND_URL}/api/payments/flutterwave-webhook/',
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

# --- Cloudinary storage (production) ---
# All Django file fields (ImageField, FileField — photos, covers, chat audio,
# and any other uploaded files) are stored & served on Cloudinary when the
# credentials below are set. cloudinary will raise "Missing required parameter
# cloud_name" if credentials are missing, so storage only switches to Cloudinary
# when all three env vars are present; otherwise it falls back to local media.
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    import cloudinary

    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': CLOUDINARY_CLOUD_NAME,
        'API_KEY': CLOUDINARY_API_KEY,
        'API_SECRET': CLOUDINARY_API_SECRET,
        'SECURE': True,
        'MEDIA_TAG': 'destinypair',
        'STATIC_TAG': 'destinypair',
    }
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    # Upload media under an organisation-wide folder so it's easy to manage.
    CLOUDINARY_STORAGE['FOLDER'] = 'destinypair-media'
else:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

SIGHTENGINE_API_USER = os.environ.get('SIGHTENGINE_API_USER', '')
SIGHTENGINE_API_SECRET = os.environ.get('SIGHTENGINE_API_SECRET', '')
SIGHTENGINE_ENABLED = bool(SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET)

# Facebook Login — the app secret stays server-side and is used to verify
# client-provided user tokens (debug_token) before trusting them.
FACEBOOK_APP_ID = os.environ.get('FACEBOOK_APP_ID', '')
FACEBOOK_APP_SECRET = os.environ.get('FACEBOOK_APP_SECRET', '')
FACEBOOK_ENABLED = bool(FACEBOOK_APP_ID and FACEBOOK_APP_SECRET)

# AI customer-support chatbot (OpenAI-compatible API, e.g. OpenRouter).
# CHATBOT_API_KEY is read from the environment / Backend/.env — never commit it.
CHATBOT_API_BASE = os.environ.get('CHATBOT_API_BASE', 'https://openrouter.ai/api/v1')
CHATBOT_API_KEY = os.environ.get('CHATBOT_API_KEY', '')
CHATBOT_MODEL = os.environ.get('CHATBOT_MODEL', 'openai/gpt-4o-mini')
CHATBOT_ENABLED = bool(CHATBOT_API_KEY and CHATBOT_API_BASE)
CHATBOT_TIMEOUT = int(os.environ.get('CHATBOT_TIMEOUT', '45'))
CHATBOT_MAX_TOKENS = int(os.environ.get('CHATBOT_MAX_TOKENS', '600'))
CHATBOT_MAX_HISTORY = int(os.environ.get('CHATBOT_MAX_HISTORY', '20'))
# Rate limits: messages per session and per IP within a 1-hour window.
CHATBOT_RATE_WINDOW = 3600
CHATBOT_RATE_PER_SESSION = int(os.environ.get('CHATBOT_RATE_PER_SESSION', '40'))
CHATBOT_RATE_PER_IP = int(os.environ.get('CHATBOT_RATE_PER_IP', '200'))

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://[::1]:5173,http://127.0.0.1:5173,'
        'http://localhost:5174,http://[::1]:5174,http://127.0.0.1:5174',
    ).split(',')
    if origin.strip()
]
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
