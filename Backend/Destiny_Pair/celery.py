import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Destiny_Pair.settings')

app = Celery('Destiny_Pair')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

import sys
if sys.platform == 'win32':
    app.conf.worker_pool = 'solo'
