"""Legal document versioning and consent recording.

Bump ``DOCUMENT_VERSIONS`` whenever a legal document's wording changes.
Consent records keep the version the user accepted, and historical records
are never overwritten — a new acceptance simply creates a new row.
"""

from accounts.models import UserConsent

# Current published versions of each mandatory legal document.
# Increment when a document changes so stale consent can be detected.
DOCUMENT_VERSIONS = {
    'TERMS_OF_USE': '1.1',
    'PRIVACY_POLICY': '1.1',
    'REFUND_POLICY': '1.1',
}

# Which documents a user must have accepted before paying.
REQUIRED_FOR_SUBSCRIPTION = ('TERMS_OF_USE', 'REFUND_POLICY')


def record_consent(user, consent_type, request=None, version=None):
    """Record a single consent acceptance. Returns the created record."""
    version = version or DOCUMENT_VERSIONS.get(consent_type, '1.0')
    ip = None
    user_agent = ''
    if request is not None:
        ip = _client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:1000]
    return UserConsent.objects.create(
        user=user,
        consent_type=consent_type,
        document_version=version,
        accepted=True,
        ip_address=ip,
        user_agent=user_agent,
    )


def latest_consent(user, consent_type):
    """Latest consent record for a document type, or None."""
    return UserConsent.objects.filter(
        user=user,
        consent_type=consent_type,
        accepted=True,
    ).first()


def has_current_consent(user, consent_type):
    """True if the user accepted the latest published version."""
    latest = latest_consent(user, consent_type)
    return bool(latest and latest.document_version == DOCUMENT_VERSIONS.get(consent_type))


def consents_status(user):
    """Latest acceptance for each document type (public summary)."""
    status = {}
    for consent_type in DOCUMENT_VERSIONS:
        latest = latest_consent(user, consent_type)
        status[consent_type] = {
            'version': DOCUMENT_VERSIONS[consent_type],
            'accepted_version': latest.document_version if latest else None,
            'accepted_at': latest.accepted_at.isoformat() if latest else None,
            'current': has_current_consent(user, consent_type),
        }
    return status


def _client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')
