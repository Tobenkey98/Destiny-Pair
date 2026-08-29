import uuid

from django.db import migrations, models


def backfill_public_ids(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    seen = set()
    for user in User.objects.all().order_by('id'):
        candidate = None
        for _ in range(50):
            attempt = 'DP-' + uuid.uuid4().hex[:8].upper()
            if attempt not in seen and not User.objects.filter(public_id=attempt).exists():
                candidate = attempt
                break
        if not candidate:
            candidate = 'DP-' + uuid.uuid4().hex[:12].upper()
        user.public_id = candidate
        user.save(update_fields=['public_id'])
        seen.add(candidate)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_rename_consent_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='public_id',
            field=models.CharField(max_length=20, null=True, blank=True, unique=True, editable=False),
        ),
        migrations.RunPython(backfill_public_ids, migrations.RunPython.noop),
    ]