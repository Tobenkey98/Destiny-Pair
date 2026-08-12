import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Destiny_Pair.settings')
import django
django.setup()

LOG = open('e2e_result.txt', 'w')
def log(msg):
    LOG.write(str(msg) + '\n')
    LOG.flush()

from rest_framework.test import APIClient
from accounts.models import User
from payments.models import Payment

client = APIClient()
user, _ = User.objects.get_or_create(
    username='e2e_check', email='e2e_check@example.com', password='pw')
client.force_authenticate(user=user)

resp = client.post('/api/subscriptions/subscribe/',
                   {'plan_slug': 'premium', 'gateway': 'monnify'}, format='json')
log('status: %s' % resp.status_code)
log('body: %s' % (resp.data if hasattr(resp, 'data') else resp.json()))

Payment.objects.filter(user=user).delete()
user.delete()
log('cleaned up')
LOG.close()