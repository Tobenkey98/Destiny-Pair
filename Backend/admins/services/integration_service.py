"""Third-party API / integration settings management.

Values edited in the admin Integrations page are stored in the DB so they can
be read at runtime (immediate effect without restarting the servers) and are
also written back to ``Backend/.env`` so the change survives restarts and stays
aligned with the server's environment.

Services that need a runtime value should use :func:`get_value` instead of
``getattr(settings, ...)`` directly when they want admin-editability to apply
live.
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)

ENV_PATH = getattr(settings, 'BASE_DIR', None) and (settings.BASE_DIR / '.env')

# Static metadata describing every integration the admin can manage.
# ``default`` is only used when neither the DB row nor the .env has a value.
INTEGRATION_CATALOG = [
    # --- Flutterwave payment gateway -------------------------------------
    {'key': 'FLUTTERWAVE_CLIENT_ID', 'group': 'flutterwave',
     'label': 'Client ID', 'is_secret': True,
     'description': 'Flutterwave v4 API client id (from the Payments/Merchant API section of your Flutterwave dashboard).'},
    {'key': 'FLUTTERWAVE_CLIENT_SECRET', 'group': 'flutterwave',
     'label': 'Client Secret', 'is_secret': True,
     'description': 'Flutterwave v4 API client secret. Keep this private.'},
    {'key': 'FLUTTERWAVE_ENCRYPTION_KEY', 'group': 'flutterwave',
     'label': 'Encryption Key', 'is_secret': True,
     'description': 'Client-side card encryption key (inline charges). Optional for the hosted Checkout flow.'},
    {'key': 'FLUTTERWAVE_PUBLIC_KEY', 'group': 'flutterwave',
     'label': 'Public Key', 'is_secret': False,
     'description': 'Browser-side public key (legacy v3 modal; shown to help verify which key pair is loaded).'},
    {'key': 'FLUTTERWAVE_SECRET_HASH', 'group': 'flutterwave',
     'label': 'Webhook Secret Hash', 'is_secret': True,
     'description': 'Secret hash configured in the Flutterwave dashboard webhooks section. Used to verify webhook signatures.'},
    {'key': 'FLUTTERWAVE_SANDBOX', 'group': 'flutterwave',
     'label': 'Sandbox Mode', 'is_secret': False,
     'description': 'Set to 1 to use the Flutterwave test environment, or leave empty for the live production API.'},
    {'key': 'FLUTTERWAVE_CALLBACK_URL', 'group': 'flutterwave',
     'label': 'Callback / Webhook URL', 'is_secret': False,
     'description': 'Where Flutterwave returns the user after payment and sends webhooks. Usually https://destinypair.net/api/payments/flutterwave-webhook/'},

    # --- Email / SMTP ------------------------------------------------------
    {'key': 'EMAIL_HOST', 'group': 'email', 'label': 'SMTP Host', 'is_secret': False,
     'description': 'Outgoing mail server host (e.g. smtp-relay.brevo.com).'},
    {'key': 'EMAIL_PORT', 'group': 'email', 'label': 'SMTP Port', 'is_secret': False,
     'description': 'SMTP port (587 with TLS, 465 with SSL).'},
    {'key': 'EMAIL_HOST_USER', 'group': 'email', 'label': 'SMTP Username', 'is_secret': False,
     'description': 'SMTP login username.'},
    {'key': 'EMAIL_HOST_PASSWORD', 'group': 'email', 'label': 'SMTP Password', 'is_secret': True,
     'description': 'SMTP login password / API key.'},
    {'key': 'DEFAULT_FROM_EMAIL', 'group': 'email', 'label': 'From Address', 'is_secret': False,
     'description': 'Sender address shown on outbound emails.'},

    # --- Cloudinary media storage ------------------------------------------
    {'key': 'CLOUDINARY_CLOUD_NAME', 'group': 'cloudinary', 'label': 'Cloud Name', 'is_secret': False,
     'description': 'Cloudinary account cloud name.'},
    {'key': 'CLOUDINARY_API_KEY', 'group': 'cloudinary', 'label': 'API Key', 'is_secret': True,
     'description': 'Cloudinary API key.'},
    {'key': 'CLOUDINARY_API_SECRET', 'group': 'cloudinary', 'label': 'API Secret', 'is_secret': True,
     'description': 'Cloudinary API secret.'},

    # --- SightEngine content moderation ------------------------------------
    {'key': 'SIGHTENGINE_API_USER', 'group': 'sightengine', 'label': 'API User', 'is_secret': True,
     'description': 'SightEngine API user (used to auto-screen uploaded photos).'},
    {'key': 'SIGHTENGINE_API_SECRET', 'group': 'sightengine', 'label': 'API Secret', 'is_secret': True,
     'description': 'SightEngine API secret.'},

    # --- AI Chatbot (OpenAI-compatible / OpenRouter) -----------------------
    {'key': 'CHATBOT_API_BASE', 'group': 'chatbot', 'label': 'API Base URL', 'is_secret': False,
     'description': 'OpenAI-compatible endpoint (default https://openrouter.ai/api/v1).'},
    {'key': 'CHATBOT_API_KEY', 'group': 'chatbot', 'label': 'API Key', 'is_secret': True,
     'description': 'Chatbot API key (OpenRouter or OpenAI). Enables the AI assistant.'},
    {'key': 'CHATBOT_MODEL', 'group': 'chatbot', 'label': 'Model', 'is_secret': False,
     'description': 'Chatbot model id (e.g. openai/gpt-4o-mini).'},

    # --- Social login -------------------------------------------------------
    {'key': 'FACEBOOK_APP_ID', 'group': 'social-login', 'label': 'Facebook App ID', 'is_secret': False,
     'description': 'Facebook app id used for Facebook login.'},
    {'key': 'FACEBOOK_APP_SECRET', 'group': 'social-login', 'label': 'Facebook App Secret', 'is_secret': True,
     'description': 'Facebook app secret (verifies client tokens server-side).'},
    {'key': 'GOOGLE_OAUTH2_CLIENT_ID', 'group': 'social-login', 'label': 'Google Client ID', 'is_secret': False,
     'description': 'Google OAuth 2.0 client id used for Google login.'},
    {'key': 'GOOGLE_OAUTH2_CLIENT_SECRET', 'group': 'social-login', 'label': 'Google Client Secret', 'is_secret': True,
     'description': 'Google OAuth 2.0 client secret.'},

    # --- Site ------------------------------------------------------------------
    {'key': 'FRONTEND_URL', 'group': 'site', 'label': 'Frontend URL', 'is_secret': False,
     'description': 'Canonical website URL (e.g. https://destinypair.net). Used in emails and redirects.'},
]


def get_value(key, default=None):
    """Return the most up-to-date value for an integration setting.

    The DB override (set from the admin Integrations page) wins over the
    process environment so edits apply immediately; otherwise falls back to
    ``default``.
    """
    try:
        from admins.models import IntegrationSetting
        row = IntegrationSetting.objects.filter(key=key, is_active=True).only('value').first()
        if row is not None and row.value != '':
            return row.value
    except Exception:
        # DB not migrable / not reachable yet — behave like settings fallback.
        pass
    if default is not None:
        return default
    return getattr(settings, key, '')


def get_bool_value(key, default=False):
    """Boolean variant of :func:`get_value`. True for 1/true/yes/on."""
    val = get_value(key, '')
    if val is None or val == '':
        return default
    return str(val).strip().lower() in ('1', 'true', 'yes', 'on')


def env_dict():
    """Parse the server's ``Backend/.env`` file into a plain dict."""
    result = {}
    try:
        if ENV_PATH and ENV_PATH.exists():
            for line in ENV_PATH.read_text(encoding='utf-8').splitlines():
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, _, value = line.partition('=')
                result[key.strip()] = (value.strip().strip('"').strip("'"))
    except Exception:
        logger.exception('Failed to read env file %s', ENV_PATH)
    return result


def write_env_changes(changes):
    """Write ``{KEY: value}`` updates into ``Backend/.env`` preserving other lines.

    Returns True on success, False when the file could not be written (permission
    issues) — the DB override still applies, so the setting works immediately.
    """
    if not changes:
        return True
    try:
        if not ENV_PATH:
            return False
        if not ENV_PATH.exists():
            ENV_PATH.parent.mkdir(parents=True, exist_ok=True)
            ENV_PATH.write_text('', encoding='utf-8')
        from dotenv import set_key
        for key, value in changes.items():
            if value == '':
                set_key(str(ENV_PATH), key, value, quote_mode='always')
            else:
                set_key(str(ENV_PATH), key, str(value), quote_mode='always')
        return True
    except Exception:
        logger.exception('Failed to update env file %s', ENV_PATH)
        return False


def catalog():
    """Return the full integration catalog with live values (secrets masked)."""
    env = env_dict()
    stored = {}
    try:
        from admins.models import IntegrationSetting
        for row in IntegrationSetting.objects.all():
            stored[row.key] = row
    except Exception:
        stored = {}

    entries = []
    for meta in INTEGRATION_CATALOG:
        key = meta['key']
        row = stored.get(key)
        if row is not None and row.value != '':
            raw_value = row.value
        else:
            raw_value = env.get(key, meta.get('default', ''))
        if meta.get('is_secret'):
            masked = ('*' * (len(raw_value) - 4) + raw_value[-4:]) if len(raw_value) > 4 else ('*' * len(raw_value))
        else:
            masked = raw_value
        entries.append({
            'key': key,
            'value': masked,
            'raw_length': len(raw_value),
            'has_value': bool(raw_value),
            'group': meta.get('group', ''),
            'label': meta.get('label', key),
            'description': meta.get('description', ''),
            'is_secret': meta.get('is_secret', False),
            'source': 'database' if row is not None and row.value != '' else ('env' if env.get(key) else 'unset'),
        })
    return entries


def resolve_updates(payload):
    """Merge raw payload values with the mask convention into {key: final_value}.

    Secret fields sent back as a masked placeholder (e.g. the 4-char tail with
    leading asterisks, or a ``value`` equal to the current masked value) are
    left untouched. An empty string clears the value.
    """
    current = {(e['key']): e for e in catalog()}
    resolved = {}
    for key, raw in payload.items():
        if not raw:
            resolved[key] = ''
            continue
        existing = current.get(key, {})
        if existing.get('is_secret') and existing.get('has_value') and (
            raw.startswith('*') or (len(raw) >= 4 and raw == existing.get('value'))
        ):
            # unchanged secret — keep as-is (no-op so .env write is skipped)
            continue
        resolved[key] = str(raw)
    return resolved


def test_flutterwave():
    """Validate the currently configured Flutterwave credentials by trying to
    fetch an OAuth access token. Returns (ok, detail)."""
    try:
        from payments.services import flutterwave as fw
        token = fw.get_access_token()
        return True, f"Credentials accepted — access token obtained ({'sandbox' if fw._sandbox() else 'live'} API)."
    except Exception as exc:
        return False, str(exc) or 'Flutterwave validation failed.'