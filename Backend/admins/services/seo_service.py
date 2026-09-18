"""SEO settings — the admin page edits one singleton row that the frontend
reads to apply title/meta/OpenGraph tags + Analytics on the live website."""

SEO_FIELDS = [
    'site_title', 'tagline', 'description', 'keywords',
    'og_title', 'og_description', 'og_image', 'canonical_url',
    'google_analytics_id', 'google_site_verification', 'robots',
]


def get_or_create():
    from admins.models import SeoSetting
    row = SeoSetting.objects.first()
    if row is None:
        row = SeoSetting.objects.create(site_title='Destiny Pair')
    return row


def public_dict():
    from django.conf import settings
    row = get_or_create()
    defaults = {
        'site_title': 'Destiny Pair — Christian Dating & Marriage',
        'tagline': 'Find your God-given partner',
        'description': (
            'Destiny Pair is a faith-based dating and marriage platform for '
            'Christians in Nigeria. Meet, connect and find your God-given partner.'
        ),
        'title': 'Destiny Pair',
        'canonical_url': getattr(settings, 'FRONTEND_URL', ''),
    }
    return {
        field: (getattr(row, field, '') or defaults.get(field, ''))
        for field in SEO_FIELDS
    } | {'title': 'Destiny Pair'}