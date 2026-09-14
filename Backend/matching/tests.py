from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from matching.models import Match
from matching.services.filter_engine import get_qualified_candidates
from subscriptions.models import SubscriptionPlan, UserSubscription

User = get_user_model()


class DiscoverHardFilterTests(TestCase):

    def setUp(self):
        self.viewer = User.objects.create_user(
            username='viewer', email='viewer@test.com', password='pass1234',
            gender='Male', faith='Christianity',
        )
        self.plain_female = User.objects.create_user(
            username='f1', email='f1@test.com', password='pass1234',
            gender='Female', faith='Christianity',
        )
        self.different_faith_female = User.objects.create_user(
            username='f2', email='f2@test.com', password='pass1234',
            gender='Female', faith='Islam',
        )
        self.expired_subscription_female = User.objects.create_user(
            username='f3', email='f3@test.com', password='pass1234',
            gender='Female', faith='',
        )
        self.banned_female = User.objects.create_user(
            username='f4', email='f4@test.com', password='pass1234',
            gender='Female', faith='Christianity', is_banned=True,
        )

        plan = SubscriptionPlan.objects.create(
            name='Test Plan', slug='test-plan', price='0.00',
        )
        UserSubscription.objects.create(
            user=self.expired_subscription_female,
            plan=plan,
            start_date=timezone.now() - timedelta(days=60),
            end_date=timezone.now() - timedelta(days=30),
            status='expired',
        )

    def ids(self):
        return set(get_qualified_candidates(self.viewer).values_list('id', flat=True))

    def test_all_registered_females_visible(self):
        result = self.ids()
        self.assertIn(self.plain_female.id, result)
        self.assertIn(self.different_faith_female.id, result)
        self.assertIn(self.expired_subscription_female.id, result)

    def test_banned_female_hidden(self):
        self.assertNotIn(self.banned_female.id, self.ids())

    def test_liked_female_moves_to_connections(self):
        Match.objects.create(
            from_user=self.viewer,
            to_user=self.plain_female,
            status='pending',
        )
        self.assertNotIn(self.plain_female.id, self.ids())