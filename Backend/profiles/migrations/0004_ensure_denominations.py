# Ensures the seeded denomination list exists and is visible on the public
# signup dropdown. Repairs production databases where seed rows were never
# created (e.g. faked migrations) or were deactivated via the admin panel
# (admin delete sets is_active=False, which hides rows from the public list).

from django.db import migrations
from django.utils.text import slugify
import re


SEED_NAMES = [
    'Redeemed Christian Church of God (RCCG)',
    'Living Faith Church (Winners Chapel)',
    'Mountain of Fire and Miracles',
    'Christ Embassy',
    'Dunamis International Gospel Centre',
    'House on the Rock',
    'Salvation Ministries',
    'Deeper Life Bible Church',
    'Assemblies of God',
    'Foursquare Gospel Church',
    'Christ Apostolic Church (CAC)',
    'Roman Catholic Church',
    'Anglican Communion',
    'Methodist Church',
    'Baptist Convention',
    'Presbyterian Church',
    'ECWA',
    'Celestial Church of Christ',
    'Cherubim and Seraphim',
    'Church of God Mission',
    "The Lord's Chosen",
    'Streams of Joy',
    'Harvesters International Christian Centre',
    'Commonwealth of Zion Assembly (COZA)',
    'Daystar Christian Centre',
    'Kingsway International Christian Centre (KICC)',
    'Pentecostal',
    'New Generation Church',
    'Others',
]


def normalize_name(name):
    name = (name or "").strip()
    name = re.sub(r'\s+', ' ', name)
    name = re.sub(r'[^\w\s\-\.\,\&\'\(\)]', '', name)
    return name


def ensure_denominations(apps, schema_editor):
    Denomination = apps.get_model('profiles', 'Denomination')
    for name in SEED_NAMES:
        normalized = normalize_name(name)
        if not normalized:
            continue
        slug = slugify(normalized) or 'unknown'
        obj = (
            Denomination.objects.filter(slug__iexact=slug).first()
            or Denomination.objects.filter(name__iexact=normalized).first()
        )
        if obj:
            updates = {}
            if not obj.approved:
                obj.approved = True
                updates['approved'] = True
            if not obj.is_active:
                obj.is_active = True
                updates['is_active'] = True
            if updates:
                obj.save(update_fields=list(updates.keys()))
        else:
            Denomination.objects.create(
                name=normalized,
                slug=slug,
                approved=True,
                is_active=True,
            )


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0003_testimonial'),
    ]

    operations = [
        migrations.RunPython(ensure_denominations, migrations.RunPython.noop),
    ]
