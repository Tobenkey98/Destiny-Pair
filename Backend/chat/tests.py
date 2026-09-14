from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from django.test import TestCase

from chat.content_policy import check_message_policy, CONTACT_CODE, SEXUAL_CODE, TRANSACTION_CODE
from chat.models import Conversation, Message, ModerationLog

User = get_user_model()


class ContentPolicyTests(TestCase):

    def assert_allowed(self, text):
        self.assertIsNone(
            check_message_policy(text),
            f'expected message to be allowed: {text!r}',
        )

    def assert_blocked(self, text, code=None):
        violation = check_message_policy(text)
        self.assertIsNotNone(violation, f'expected message to be blocked: {text!r}')
        self.assertIn('category', violation)
        self.assertIn('matches', violation)
        if code:
            self.assertEqual(violation['code'], code)
        return violation

    # --- Allowed messages (word boundaries must never false-positive) ---

    def test_ordinary_dating_chat_allowed(self):
        self.assert_allowed('Good morning! How was your day? I hope work went well.')
        self.assert_allowed('God bless you and your family. Have a great week ahead.')
        self.assert_allowed('I will text you later this evening.')
        self.assert_allowed('The service was lovely, the preacher really spoke to me.')
        self.assert_allowed('See you at church on Sunday, God willing.')

    # --- Contact sharing ---

    def test_phone_numbers_blocked(self):
        for text in (
            '+2348012345678',
            '+234 801 234 5678',
            'Call me on 08012345678',
            '0812 345 6789',
            '0701 111 2222 please',
        ):
            self.assert_blocked(text, CONTACT_CODE)

    def test_email_blocked(self):
        self.assert_blocked('Reach me at johndoe@gmail.com', CONTACT_CODE)

    def test_url_and_wa_me_blocked(self):
        self.assert_blocked('Check wa.me/2348012345678', CONTACT_CODE)
        self.assert_blocked('www.facebook.com/johndoe', CONTACT_CODE)

    def test_social_handle_and_phrase_blocked(self):
        self.assert_blocked('hit me up @john_doe', CONTACT_CODE)
        self.assert_blocked('what is your number?', CONTACT_CODE)
        self.assert_blocked('this is my whatsapp', CONTACT_CODE)
        self.assert_blocked('dm me please', CONTACT_CODE)

    # --- Sexual / nudity ---

    def test_sexual_blocked(self):
        for text in (
            'that is sexy',
            'let us hook up tonight',
            'she was fully nude in that',
            'I want to make love to you',
            'my yansh is big',
        ):
            self.assert_blocked(text, SEXUAL_CODE)

    # --- Money / transactions ---

    def test_nuban_and_amounts_blocked(self):
        self.assert_blocked('my account number is 0123456789', TRANSACTION_CODE)
        self.assert_blocked('kindly send 5000 naira', TRANSACTION_CODE)
        self.assert_blocked('pay me NGN 30000', TRANSACTION_CODE)

    def test_money_phrases_blocked(self):
        for text in (
            'please send me money',
            'I urgently need a loan',
            'here is my gtbank account no',
        ):
            self.assert_blocked(text, TRANSACTION_CODE)

    def test_match_snippets_reported(self):
        violation = self.assert_blocked('Call me on 08012345678 or email a@b.com', CONTACT_CODE)
        self.assertTrue(any('08012345678' in m for m in violation['matches']))

    def test_priority_contact_over_money(self):
        violation = self.assert_blocked('call me, then send me money', CONTACT_CODE)
        self.assertEqual(violation['code'], CONTACT_CODE)


class PolicyLoggingTests(APITestCase):

    def setUp(self):
        self.sender = User.objects.create_user(
            username='sender', email='sender@test.com', password='pass1234', gender='Male'
        )
        self.recipient = User.objects.create_user(
            username='recipient', email='recipient@test.com', password='pass1234', gender='Female'
        )
        self.conversation = Conversation.objects.create()
        self.conversation.participants.add(self.sender, self.recipient)
        self.url = reverse('auth-messages')

    def post(self, text):
        self.client.force_authenticate(user=self.sender)
        return self.client.post(self.url, {'conversation': self.conversation.id, 'message': text}, format='json')

    def test_blocked_message_logged_and_not_saved(self):
        response = self.post('My number is 08012345678, call me')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], CONTACT_CODE)

        self.assertEqual(Message.objects.filter(conversation=self.conversation).count(), 0)
        log = ModerationLog.objects.filter(sender=self.sender).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.channel, 'rest')
        self.assertEqual(log.category, 'contacts')
        self.assertEqual(log.recipient, self.recipient)
        self.assertEqual(log.conversation, self.conversation)
        self.assertIn('08012345678', log.excerpt)
        self.assertIn('call me', log.matched_terms)

    def test_allowed_message_saved_without_log(self):
        response = self.post('Good morning! Hope you slept well.')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Message.objects.filter(conversation=self.conversation).count(), 1)
        self.assertEqual(ModerationLog.objects.filter(sender=self.sender).count(), 0)