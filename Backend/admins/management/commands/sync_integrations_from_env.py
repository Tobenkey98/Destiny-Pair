"""Sync DB integration overrides to match the server's ``Backend/.env``.

The admin Integrations page stores values in both the DB and ``.env``. Because
the DB row wins at runtime (``integration_service.get_value``), a stale DB row
(e.g. leftover test credentials saved weeks ago) silently overrides the live
values in ``.env``. This command rewrites the deploy-owned keys (the
Flutterwave group and ``FRONTEND_URL``) from the current ``Backend/.env`` so a
stale DB row can never shadow the live payment configuration. Non-deploy keys
are only refreshed when the ``.env`` actually has a value, so admin-edited
values that were never written to ``.env`` are preserved.

Usage:
    python manage.py sync_integrations_from_env
"""

import os

from django.core.management.base import BaseCommand

from admins.models import IntegrationSetting
from admins.services.integration_service import INTEGRATION_CATALOG, env_dict


class Command(BaseCommand):
    help = (
        "Align the deploy-owned IntegrationSetting rows (Flutterwave + "
        "FRONTEND_URL) with the current .env so stale DB overrides can never "
        "shadow the live payment config."
    )

    def handle(self, *args, **options):
        env = env_dict()
        changed = 0
        created = 0
        skipped = 0
        for meta in INTEGRATION_CATALOG:
            key = meta['key']
            is_deploy_owned = (
                meta.get('group') == 'flutterwave' or key == 'FRONTEND_URL'
            )
            value = env.get(key, os.environ.get(key, ''))
            if not is_deploy_owned and not value:
                skipped += 1
                continue
            row, was_created = IntegrationSetting.objects.update_or_create(
                key=key,
                defaults={
                    'value': value,
                    'group': meta.get('group', ''),
                    'label': meta.get('label', key),
                    'description': meta.get('description', ''),
                    'is_secret': meta.get('is_secret', False),
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
            else:
                changed += 1
        self.stdout.write(
            self.style.SUCCESS(
                f'Integration overrides synced from .env '
                f'({created} created, {changed} updated, {skipped} unchanged).'
            )
        )