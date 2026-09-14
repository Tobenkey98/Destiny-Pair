"""Godly-community chat content policy (strict, real-time).

DestinyPair is a Christ-centred dating platform. Every text message is
scanned synchronously *before* it is saved or broadcast (on both the
WebSocket and REST paths), so a violating message is never delivered to the
recipient and never stored in the database. Each violation is also written to
the ``ModerationLog`` so admins can monitor chat activity.

All matchers are explicit about *why* a message was blocked: ``check_message_policy``
returns a dict with ``category``, ``code``, a friendly ``reason`` (for the
sender's UI) and ``matches`` (the offending snippets, for the admin log).

Term lists are matched at word boundaries, so ordinary words can never be
flagged by accident (e.g. the sexual term "sex" can never match inside
"text"). Multi-word phrases and ``\\w*`` stem suffixes (e.g. ``masturbat\\w*``)
are supported so word forms are caught without substring false positives.
"""

import re

# ---------------------------------------------------------------------------
# Category 1 — Contact sharing (no phones, emails, socials, links, addresses)
# ---------------------------------------------------------------------------

# Phone numbers: leading '+' with country-style grouping, a separated 3-3-4
# group (US-style with at least one space or dash), a bare 11–13 digit run
# (Nigerian mobiles are 11 digits), or an explicit Nigerian 0x mobile
# (080/081/090/091) with optional separators.
PHONE_PATTERNS = [
    re.compile(r'\+\d[\d\s\-()\.]{6,17}\d'),
    re.compile(r'\b\d{3}[\s\-]\d{3}[\s\-]\d{4}\b'),
    re.compile(r'\b\d{11,13}\b'),
    re.compile(r'\b0[789][01]\d[\s\-]?\d{3}[\s\-]?\d{4}\b'),
]

EMAIL_RE = re.compile(r'\b[\w.+-]+@[\w-]+\.[\w.-]+\b', re.IGNORECASE)

URL_RE = re.compile(
    r'\b(?:https?://|www\.|wa\.me|t\.me|bit\.ly|tinyurl)\S+',
    re.IGNORECASE,
)

SOCIAL_HANDLE_RE = re.compile(r'\b@[\w.]{3,30}\b')

SOCIAL_PLATFORM_RE = re.compile(
    r'\b(?:whatsapp|telegram|snapchat|instagram|ig|tiktok|facebook|fb|discord|'
    r'skype|imo|viber|wechat|line|kik|onlyfans|linkedin|threads)\b'
    r'[\s:.-]*\S{0,40}',
    re.IGNORECASE,
)

# Spoken contact motifs: "call me", "my number", "your whatsapp", mail
# domains spelled out, etc.
CONTACT_PHRASES = [
    'call me', 'text me', 'chat me up', 'dm me', 'pm me', 'inbox me',
    'hmu', 'hit me up', 'add me on', 'look me up', 'add me', 'follow me',
    'my number', 'my phone', 'my line', 'my pin', 'my snap', 'my ig',
    'my instagram', 'my facebook', 'my whatsapp', 'my telegram',
    'my handle', 'my username', 'whatsapp me', 'whatsapp number',
    'your number', 'your phone', 'your whatsapp', 'your handle',
    'give me your number', 'social media', 'socials',
    'gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'ymail', 'rocketmail',
    'dot com', 'dotcom',
]

CONTACT_CODE = 'CONTACT_SHARING'
CONTACT_MESSAGE = (
    'This message was not sent. DestinyPair keeps members safe: please don\'t '
    'share phone numbers, emails, social handles, or external links in chat.'
)

# ---------------------------------------------------------------------------
# Category 2 — Sexual / nudity / explicit content
# ---------------------------------------------------------------------------

SEXUAL_FRAGMENTS = [
    'sex', 'sexy', 'sexual', r'sext\w*', 'fuck', 'fvck', r'porn\w*',
    'nude', 'nudes', 'nudity', 'naked', 'nsfw', 'xxx',
    'dick', 'cock', 'pussy', 'vagina', 'penis', 'boobs', 'tits', 'nipples',
    'breasts', 'blowjob', 'blow job', 'handjob', 'sperm', 'cum',
    r'ejaculat\w*', 'horny', r'masturbat\w*', 'orgasm', 'busty',
    'hookup', 'hook up', 'one night stand', 'sugar daddy', 'sugar baby',
    'escort', r'prostitut\w*', 'erotic', 'pornhub', 'onlyfans', 'milf',
    'wet dream', 'fingering', 'yansh', 'nyash', 'kpomo', 'gbas', 'shayo',
    'oral', 'anal', 'sex tape', 'sleep with', 'slept with', 'make love',
    'intercourse', 'foreplay',
]

SEXUAL_CODE = 'SEXUAL_CONTENT'
SEXUAL_MESSAGE = (
    'This message was not sent. DestinyPair is a Godly platform — please keep '
    'conversations pure, respectful, and free of sexual content.'
)

# ---------------------------------------------------------------------------
# Category 3 — Money / financial transactions
# ---------------------------------------------------------------------------

# Bank/account-sensitive numbers: Nigerian NUBAN (exactly 10 digits) and card
# numbers (13–19 digits, optionally separated by spaces or dashes).
NUBAN_RE = re.compile(r'\b\d{10}\b')
CARD_RE = re.compile(r'\b(?:\d[\s-]?){12,18}\d\b')
NGN_AMOUNT_RE = re.compile(
    r'\b(?:₦|NGN)\s*\d+(?:[.,]\d+)?\b'
    r'|\b\d+(?:[.,]\d+)?\s*(?:naira|NGN)\b',
    re.IGNORECASE,
)

MONEY_FRAGMENTS = [
    r'transfer\w*', 'send me money', 'send money', 'send me airtime', 'wire',
    'bank account', 'bank details', 'account number', 'account no',
    'acct no', 'nuban', 'sort code',
    'gtbank', 'access bank', 'zenith', 'first bank', 'kuda', 'opay',
    'palmpay', 'flutterwave', 'paystack', 'monnify', 'paypal', 'venmo',
    'bitcoin', 'crypto', 'ethereum', 'naira', 'dollar', 'payment', 'pay me',
    'price', 'pricing', r'invest\w*', 'trade', 'forex', 'airtime',
    'recharge card', 'mtn momo', 'momodev', 'cash app', 'salary',
    'business deal', 'wallet', r'withdraw\w*', r'deposit\w*', 'loan',
    r'lend\w*', r'borrow\w*', 'urgently need',
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

MAX_MATCHES = 6


def _build_terms_re(patterns):
    return re.compile(r'\b(?:' + '|'.join(patterns) + r')\b', re.IGNORECASE)


SEXUAL_RE = _build_terms_re(SEXUAL_FRAGMENTS)
MONEY_RE = _build_terms_re(MONEY_FRAGMENTS)
CONTACT_PHRASE_RE = _build_terms_re(CONTACT_PHRASES)


def _first_match(regex, text):
    m = regex.search(text)
    return m.group(0).strip()[:100] if m else None


def _collect(regex, text, limit=MAX_MATCHES):
    found = []
    for m in regex.finditer(text):
        snippet = m.group(0).strip()
        if snippet and snippet not in found:
            found.append(snippet[:100])
            if len(found) >= limit:
                break
    return found


def check_message_policy(text):
    """Return ``None`` when the message is allowed, otherwise a dict with
    ``category``, ``code``, a friendly ``reason`` and the ``matches`` that
    triggered the block."""
    text = (text or '').strip()
    if not text:
        return None

    matches = []
    for pattern in PHONE_PATTERNS:
        snippet = _first_match(pattern, text)
        if snippet:
            matches.append(snippet)
    for regex in (EMAIL_RE, URL_RE, SOCIAL_HANDLE_RE, SOCIAL_PLATFORM_RE):
        snippet = _first_match(regex, text)
        if snippet:
            matches.append(snippet)
    matches += _collect(CONTACT_PHRASE_RE, text)

    if matches:
        return {
            'category': 'contacts',
            'code': CONTACT_CODE,
            'reason': CONTACT_MESSAGE,
            'matches': matches[:MAX_MATCHES],
        }

    matches = _collect(SEXUAL_RE, text)
    if matches:
        return {
            'category': 'sexual',
            'code': SEXUAL_CODE,
            'reason': SEXUAL_MESSAGE,
            'matches': matches[:MAX_MATCHES],
        }

    matches = []
    for regex in (NUBAN_RE, CARD_RE, NGN_AMOUNT_RE):
        snippet = _first_match(regex, text)
        if snippet:
            matches.append(snippet)
    matches += _collect(MONEY_RE, text)

    if matches:
        return {
            'category': 'financial',
            'code': TRANSACTION_CODE,
            'reason': TRANSACTION_MESSAGE,
            'matches': matches[:MAX_MATCHES],
        }

    return None


class PolicyViolation(Exception):
    def __init__(self, violation):
        self.violation = violation
        super().__init__(violation['reason'])