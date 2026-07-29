"""Run this to delete ALL users and their data from the database."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Destiny_Pair.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

User = get_user_model()

print("Deleting all blacklisted tokens...")
count, _ = BlacklistedToken.objects.all().delete()
print(f"  Removed {count}")

print("Deleting all outstanding tokens...")
count, _ = OutstandingToken.objects.all().delete()
print(f"  Removed {count}")

print("Deleting all users...")
count, _ = User.objects.all().delete()
print(f"  Removed {count}")

print("\nDone. All user data has been cleared.")
