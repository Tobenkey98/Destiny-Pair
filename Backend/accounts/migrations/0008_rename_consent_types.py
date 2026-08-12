from django.db import migrations, models


def rename_consent_types(apps, schema_editor):
    UserConsent = apps.get_model('accounts', 'UserConsent')
    UserConsent.objects.filter(consent_type='TERMS').update(consent_type='TERMS_OF_USE')
    UserConsent.objects.filter(consent_type='PRIVACY').update(consent_type='PRIVACY_POLICY')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_userconsent'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userconsent',
            name='consent_type',
            field=models.CharField(choices=[('TERMS_OF_USE', 'Terms of Use'), ('PRIVACY_POLICY', 'Privacy Policy'), ('REFUND_POLICY', 'Refund & Cancellation Policy')], max_length=20),
        ),
        migrations.RunPython(rename_consent_types, migrations.RunPython.noop),
    ]
