"""Persistence for messages blocked by the chat content policy.

Kept separate from ``content_policy.py`` so the pure matching functions stay
free of DB imports and can be unit-tested in isolation. Blocking never depends
on the audit log: if the log write ever fails, the block still stands.
"""

import logging

logger = logging.getLogger(__name__)

EXCERPT_LIMIT = 300
TERMS_LIMIT = 500


def record_policy_block(*, text, violation, sender=None, recipient_id=None,
                        conversation_id=None, channel='ws'):
    """Write a ``ModerationLog`` row for a blocked message (best-effort)."""
    try:
        from chat.models import ModerationLog

        if not isinstance(text, str):
            text = str(text or '')
        excerpt = text.strip()[:EXCERPT_LIMIT]
        matched = ', '.join(violation.get('matches') or [])[:TERMS_LIMIT]

        ModerationLog.objects.create(
            sender=sender,
            recipient_id=recipient_id,
            conversation_id=conversation_id,
            excerpt=excerpt,
            matched_terms=matched,
            category=violation.get('category', ''),
            code=violation.get('code', ''),
            channel=channel,
        )
    except Exception:
        logger.exception('Failed to persist chat moderation log')