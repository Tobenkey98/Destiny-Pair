import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Destiny_Pair.settings')
import django
django.setup()

LOG = open('monnify_progress.log', 'w')
def log(msg):
    LOG.write(msg + '\n')
    LOG.flush()

from django.conf import settings
log('1 sandbox=%s base=%s contract=%s' % (settings.MONNIFY_SANDBOX, settings.MONNIFY_BASE_URL, bool(settings.MONNIFY_CONTRACT_CODE)))

from payments.services import monnify
import time

try:
    t0 = time.time()
    token = monnify.get_access_token(force_refresh=True)
    log('2 token OK %.2fs %s...' % (time.time() - t0, token[:12]))
except monnify.MonnifyError as exc:
    log('2 token FAILED: %s' % exc)
    LOG.close()
    raise SystemExit(1)

from accounts.models import User
from subscriptions.models import SubscriptionPlan

user, _ = User.objects.get_or_create(
    username='monnify_probe', email='monnify_probe@example.com', password='pw')
plan = SubscriptionPlan.objects.get(slug='premium')
log('3 user %s plan %s' % (user.id, plan.slug))

t0 = time.time()
try:
    result = monnify.initialize_transaction(
        user, plan, 'DP-PROBE-000123',
        redirect_url='http://localhost:5173/checkout/premium?gateway=monnify',
        metadata={'probe': 1},
    )
    log('4 init OK %.2fs -> %s' % (time.time() - t0, str(result)[:200]))
except Exception as exc:
    log('4 init EXC %.2fs -> %r' % (time.time() - t0, exc))

from payments.models import Payment
Payment.objects.filter(user=user).delete()
user.delete()
log('5 done')
LOG.close()