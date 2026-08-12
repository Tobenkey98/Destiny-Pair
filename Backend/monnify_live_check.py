import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Destiny_Pair.settings')

import django
django.setup()

from django.conf import settings
from rest_framework.test import APIClient
from accounts.models import User
from payments.models import Payment
from payments.services import monnify

print('sandbox:', settings.MONNIFY_SANDBOX, '| base:', settings.MONNIFY_BASE_URL,
      '| contract set:', bool(settings.MONNIFY_CONTRACT_CODE))

try:
    token = monnify.get_access_token(force_refresh=True)
    print('token OK:', token[:12] + '...')
except monnify.MonnifyError as exc:
    print('token FAILED:', exc)
    raise SystemExit(1)

client = APIClient()
user, created = User.objects.get_or_create(
    username='monnify_live_check2', email='monnify_live_check2@example.com', password='pw')
client.force_authenticate(user=user)

resp = client.post('/api/subscriptions/subscribe/',
                   {'plan_slug': 'premium', 'gateway': 'monnify'}, format='json')
print('subscribe status:', resp.status_code)
print('subscribe body:', resp.data)

Payment.objects.filter(user=user).delete()
user.delete()