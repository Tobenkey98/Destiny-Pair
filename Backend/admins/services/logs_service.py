"""Tail logs for the admin System Logs page."""

import os
from pathlib import Path

from django.conf import settings


def _candidate_files():
    candidates = []
    logs_dir = Path(getattr(settings, 'LOGS_DIR', settings.BASE_DIR / 'logs'))
    if logs_dir.exists():
        candidates.extend(sorted(logs_dir.glob('*.log')))

    extra = os.environ.get('SYSTEM_LOG_DIRS', '').split(',')
    candidates.extend(
        Path(p.strip()) for p in extra if p.strip()
    )

    default_extra = [
        '/var/log/gunicorn',
        '/var/log/nginx',
        '/var/log/destinypair',
    ]
    for path in default_extra:
        base = Path(path)
        if base.exists() and base.is_dir():
            candidates.extend(sorted(base.glob('*.log')))

    seen = set()
    result = []
    for p in candidates:
        try:
            resolved = str(p.resolve())
        except Exception:
            resolved = str(p)
        if resolved in seen or not p.is_file():
            continue
        seen.add(resolved)
        try:
            size = p.stat().st_size
        except Exception:
            size = 0
        result.append({
            'name': p.name,
            'path': resolved,
            'size': size,
        })
    return result


def tail_file(path, limit=200):
    """Return the last ``limit`` lines of a log file as a list of strings."""
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as fh:
            fh.seek(0, os.SEEK_END)
            size = fh.tell()
            chunk = min(size, 64 * 1024)
            start = max(size - chunk, 0)
            fh.seek(start)
            # skip past a partial first line when we truncated mid-line
            if start > 0:
                fh.readline()
            text = fh.read()
            lines = text.splitlines()
            return lines[-limit:]
    except Exception:
        return ['(unable to read log file)']


def available():
    return [f for f in _candidate_files()][:20]