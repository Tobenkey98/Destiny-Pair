from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from accounts.services.role_service import RoleService
from admins.models import AdminProfile

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Seed RBAC role groups and their Django permissions, and optionally "
        "create the first Super Admin. Re-runnable and idempotent."
    )

    def add_arguments(self, parser):
        parser.add_argument('--email', default=None, help="Email for a new Super Admin.")
        parser.add_argument('--password', default=None, help="Password for a new Super Admin.")
        parser.add_argument(
            '--first-name', dest='first_name', default='Super', help="First name."
        )
        parser.add_argument(
            '--last-name', dest='last_name', default='Admin', help="Last name."
        )

    def handle(self, *args, **options):
        self.stdout.write("Setting up RBAC role groups and permissions...")
        roles = RoleService.setup_roles()
        self.stdout.write(self.style.SUCCESS(f"Roles configured: {', '.join(roles)}"))

        email = options.get('email')
        password = options.get('password')
        if not email or not password:
            self.stdout.write(
                self.style.WARNING(
                    "Skipping Super Admin creation (provide --email and --password)."
                )
            )
            return

        if AdminProfile.objects.filter(role='super_admin').exists():
            self.stdout.write(
                self.style.WARNING(
                    "A Super Admin already exists; refusing to create a second one."
                )
            )
            return

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': options['first_name'],
                'last_name': options['last_name'],
                'is_active': True,
                'is_staff': True,
                'is_superuser': True,
            },
        )
        if created:
            user.set_password(password)
            user.save()
        else:
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.set_password(password)
            user.save()

        admin_profile, _ = AdminProfile.objects.update_or_create(
            user=user,
            defaults={
                'role': 'super_admin',
                'department': 'management',
                'is_active': True,
                'is_approved': True,
            },
        )
        RoleService.sync_user_groups(user, 'super_admin')

        self.stdout.write(
            self.style.SUCCESS(
                f"Super Admin ready: {email} (created={created})"
            )
        )
