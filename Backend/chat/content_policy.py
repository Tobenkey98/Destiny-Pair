"""Godly-community chat content policy.

DestinyPair is a Christ-centred dating platform. Messages that share personal
contact details, sexual content, or financial/business transactions are
blocked before they reach the database, on both the WebSocket and REST paths.

All matchers are designed to be explicit about *why* a message was blocked so
the frontend can show a clear, friendly explanation.
"""

import re

# ---------------------------------------------------------------------------
# Category 1 — Contact sharing (no phone numbers, emails, social handles, links)
# ---------------------------------------------------------------------------

# Loose international / Nigerian phone numbers. Requires a leading '+', a
# country-style spaced group, or a bare 11+ digit run (Nigerian mobiles are 11
# digits) so ordinary short numbers like "500" are never flagged.
PHONE_PATTERNS = [
    re.compile(r'\+\d[\d\s\-()\.]{6,17}\d'),
    re.compile(r'\b\d{3}[\s\-]?\d{3}[\s\-]?\d{4}\b'),
    re.compile(r'\b\d{11,13}\b'),
]

EMAIL_RE = re.compile(r'\b[\w.+-]+@[\w-]+\.[\w.-]+\b', re.IGNORECASE)

URL_RE = re.compile(r'\b(?:https?://|www\.|wa\.me|t\.me)\S+', re.IGNORECASE)

SOCIAL_HANDLE_RE = re.compile(r'\b@[\w.]{3,30}\b')

SOCIAL_PLATFORM_RE = re.compile(
    r'\b(?:whatsapp|telegram|snapchat|instagram|ig|tiktok|facebook|fb|discord|'
    r'skype|imo|viber|wechat|line|kik|onlyfans|linkedin|threads)\b'
    r'[\s:.-]*\S{0,40}',
    re.IGNORECASE,
)

CONTACT_CODE = 'CONTACT_SHARING'
CONTACT_MESSAGE = (
    'This message was not sent. DestinyPair keeps members safe: please don\'t '
    'share phone numbers, emails, social handles, or external links in chat.'
)

# ---------------------------------------------------------------------------
# Category 2 — Sexual / explicit content
# ---------------------------------------------------------------------------

SEXUAL_TERMS = [
    'sex', 'sext', 'fuck', 'porn', 'porno', 'nude', 'naked', 'nsfw', 'xxx',
    'dick', 'cock', 'pussy', 'vagina', 'penis', 'boobs', 'tits', 'nipples',
    'blowjob', 'bj ', 'handjob', 'sperm', 'cum', 'ejaculate', 'horny',
    'masturbat', 'orgasm', 'busty', 'hookup', 'hook up', 'one night stand',
    'sugar daddy', 'sugar baby', 'escort', 'prostitut', 'erotic', 'pornhub',
    'onlyfans', 'roleplay', 'milf', 'horny', 'wet dream', 'fingering',
    'yansh', 'nyash', 'kpomo', 'gbas', 'shayo',
]

SEXUAL_CODE = 'SEXUAL_CONTENT'
SEXUAL_MESSAGE = (
    'This message was not sent. DestinyPair is a Godly platform — please keep '
    'conversations pure, respectful, and free of sexual content.'
)

# ---------------------------------------------------------------------------
# Category 3 — Money / business / transactions
# ---------------------------------------------------------------------------

TRANSACTION_TERMS = [
    'transfer', 'send me money', 'send money', 'wire', 'bank account',
    'account number', 'account no', 'bank details', 'gtbank', 'access bank',
    'zenith', 'first bank', 'uba ', 'kuda', 'opay', 'palmpay', 'flutterwave',
    'paystack', 'monnify', 'paypal', 'venmo', 'bitcoin', 'crypto', 'ethereum',
    'naira', 'dollar', 'payment', 'pay ', 'pay me', 'price', 'pricing',
    'invest', 'investment', 'trade', 'forex', 'btc ', 'airtime', 'recharge',
    'mtn momo', 'momodev', 'cash app', 'salary', 'business deal', 'fee ',
    'wallet', 'withdraw', 'deposit', 'loan',
]

TRANSACTION_CODE = 'TRANSACTION_OR_BUSINESS'
TRANSACTION_MESSAGE = (
    'This message was not sent. DestinyPair is for godly relationships, not '
    'business or financial transactions — please keep money talk out of chat.'
)

POLICY_MESSAGES = {
    CONTACT_CODE: CONTACT_MESSAGE,
    SEXUAL_CODE: SEXUAL_MESSAGE,
    TRANSACTION_CODE: TRANSACTION_MESSAGE,
}


def _contains_term(text, terms):
    lowered = f' {text.lower()} '
    return any(term in lowered for term in terms)


def check_message_policy(text):
    """Return ``None`` when the message is allowed, otherwise a dict with
    ``category``, ``code`` and a friendly ``reason`` for the sender."""
    text = (text or '').strip()
    if not text:
        return None

    for pattern in PHONE_PATTERNS:
        if pattern.search(text):
            return {'category': 'contacts', 'code': CONTACT_CODE, 'reason': CONTACT_MESSAGE}

    if EMAIL_RE.search(text) or URL_RE.search(text) or SOCIAL_HANDLE_RE.search(text):
        return {'category': 'contacts', 'code': CONTACT_CODE, 'reason': CONTACT_MESSAGE}

    if SOCIAL_PLATFORM_RE.search(text):
        return {'category': 'contacts', 'code': CONTACT_CODE, 'reason': CONTACT_MESSAGE}

    if _contains_term(text, SEXUAL_TERMS):
        return {'category': 'sexual', 'code': SEXUAL_CODE, 'reason': SEXUAL_MESSAGE}

    if _contains_term(text, TRANSACTION_TERMS):
        return {'category': 'financial', 'code': TRANSACTION_CODE, 'reason': TRANSACTION_MESSAGE}

    return None


class PolicyViolation(Exception):
    def __init__(self, violation):
        self.violation = violation
        super().__init__(violation['reason'])
