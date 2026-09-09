🚀 DEVELOPER PORTFOLIO ASSET
Engineered, Tested, and Maintained independently.

This repository demonstrates standard enterprise architecture, clean code practices, and modern deployment strategies.

---

# DestinyPair (DestinyPair.net)

**PROJECT_TYPE:** Full-Stack Web Platform — React 19 Single-Page Application + Django REST Backend

**CORE_TECHNOLOGIES:** React 19, Vite, Tailwind CSS, Django, Django REST Framework, PostgreSQL, Redis, Celery, Django Channels, SimpleJWT, Flutterwave v4, OpenRouter AI API, Cloudinary, Google & Facebook OAuth

---

## 📖 Project Overview & Motivation

**PROBLEM_SOLVED:** Mainstream dating apps optimise for casual engagement, leaving faith-driven singles — particularly Nigerian Christians seeking covenant marriage — with no vetted, purpose-built alternative. DestinyPair was engineered to fill that gap: a facilitation platform (not a dating app) where verified, serious singles receive guided introductions, pre-marital counselling, and chaperoned communication on the journey to marriage.

**Why this architecture:**

- **Decoupled SPA + API** — the React frontend and Django backend evolve and deploy independently; the same API serves the member app, the admin console, and any future mobile client.
- **Django + DRF on the backend** — the domain is relational and rules-heavy (profiles, matches, subscriptions, role-based admin, audit trails), which maps naturally onto Django's ORM, migrations, and permission framework.
- **PostgreSQL in production, SQLite locally** — zero-friction onboarding for contributors, enterprise-grade persistence in production, switched by environment alone.
- **Redis + Celery + Channels** — asynchronous jobs (emails, AI checks, usage metering) and real-time messaging never block request/response cycles.

---

## 🛠️ System Architecture & Tech Stack

**Structural technologies**

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Framer Motion, Radix UI, Recharts, Lucide icons |
| Backend API | Django 4.x, Django REST Framework, SimpleJWT (access + rotating refresh, blacklist) |
| Data | PostgreSQL (prod) / SQLite (dev), Redis (cache, channels layer, Celery broker) |
| Realtime & Async | Django Channels + Daphne (ASGI), Celery workers, django-celery-results |
| Media | Cloudinary (prod) with local-filesystem fallback |
| Auth providers | Email + verification codes, Google Identity Services, Facebook Login |
| Payments | Flutterwave v4 (OAuth 2.0 + hosted Checkout Sessions + webhooks) |
| AI / Safety | OpenRouter-compatible chatbot API, Sightengine AI-image screening |
| Email | Brevo SMTP relay |
| Deployment | GitHub Actions → Ubuntu VPS (nginx reverse proxy, Gunicorn, systemd) |

**Ecosystem flow**

```text
                    +------------------+
                    |  React 19 SPA    |
                    |  (Vite build,    |
                    |   nginx static)  |
                    +--------+---------+
                             |  /api/* (JSON + JWT)      /media, /ws
              +--------------+--------------+--------------+
              |                             |              |
   +----------v----------+      +-----------v----------+   |
   |  DRF API (Gunicorn) |      | Daphne / Channels    |   |
   |  auth, profiles,    |      | realtime messaging,  |   |
   |  matching, billing, |      | call signalling      |   |
   |  admin RBAC, audit  |      +-----------+----------+   |
   +----------+----------+                  |              |
              |                             |              |
   +----------v-----------------------------v--------------v--+
   |  PostgreSQL   |   Redis (cache/broker)  |  Cloudinary    |
   |  system of    |   Celery workers:       |  photos, audio |
   |  record       |   email, AI checks,     +----------------+
   |               |   usage metering       |
   +---------------+------------------------+       +--------v--------+
                                                    | 3rd parties:    |
                                                    | Flutterwave,    |
                                                    | OpenRouter AI,  |
                                                    | Sightengine,    |
                                                    | Brevo, Google,  |
                                                    | Facebook        |
                                                    +-----------------+
```

---

## ⚙️ Core Features Implemented

- **Member journey** — registration with email verification, denomination-aware profiles, photo management with AI-generated-image screening, guided introductions, likes/matches with compatibility scoring, subscriptions-gated messaging and audio/video calls, counsellor booking.
- **Content & trust surfaces** — publications library, testimonies (admin-curated), help centre/FAQ, legal documents with versioned consents, contact with topic routing.
- **Admin console** — separate `/admin/*` SPA with dashboards, user moderation (block/unblock/delete, CSV export), matches analytics, payments & subscriptions, reports & photo approvals, counselling oversight, denominations, testimonials, chatbot ticket triage, invitations, roles, audit logs, SEO/content/email/settings stubs.
- **AI support chatbot** — OpenAI-compatible API with session/IP rate limits, escalation to human tickets surfaced in the admin panel.

### 🔒 Security, Routing & Data Management

- **Authentication** — SimpleJWT access (7-day) + rotating refresh (30-day, blacklisted on rotation); `CustomJWTAuthentication` enforces a per-user `security_stamp`, so role changes, bans, or deactivation instantly revoke all issued tokens.
- **RBAC** — four roles with hierarchical levels: Platform Administrator (4) > Operation Manager (3) > Community Manager (2) > Support and Counselling Manager (1). Enforced server-side via DRF permission classes (`IsSuperAdmin`, `IsSuperAdminOrOperationsAdmin`, `IsSuperAdminOrModerator`, …), Django groups synced from profile roles, and a privilege-escalation guard on role assignment.
- **First-admin bootstrap** — the public admin-signup endpoint can only create the initial administrator with a server-owned `ADMIN_BOOTSTRAP_KEY`; afterwards, invitation tokens + Platform Administrator approval are mandatory.
- **Routing** — versioned API namespaces: `/api/auth/*` (accounts, profiles, matching, chat, counselling), `/api/subscriptions/*`, `/api/payments/*`, `/api/admin/*` (staff-only), `/api/chatbot/*`. The marketing/admin SPA owns all non-API routes; Django's built-in admin is isolated at `/django-admin/`.
- **Data management** — explicit `on_delete` policy per relation (user data cascades; financial/catalog rows use `SET_NULL`/`PROTECT`); idempotent seed migrations (denominations) and seed commands (subscription plans, RBAC groups); `clear_test_data` ops command for safe live-database hygiene (dry-run default, admins never touched).
- **Transport hardening** — CORS allow-list, `ALLOWED_HOSTS` enforcement, Brevo SMTP for transactional mail, webhook signature verification for payment callbacks.

### ⚡ Process Automation & Performance Optimization

- **CI/CD** — push to `main` triggers a hardened deploy workflow (fail-fast `set -euo pipefail`, SHA logging): pull → `npm install` + `vite build` (frontend `.env` generated from secrets) → `migrate` → Gunicorn restart.
- **Async offloading** — Celery + Redis for email delivery, AI moderation checks, and subscription usage metering; `django-ratelimit` shields hot endpoints (notably the chatbot).
- **Realtime** — Channels group messaging for chat and call signalling; the unread-count poller and targeted queries keep dashboard chatter cheap (indexed lookups, `select_related`, capped list endpoints).
- **Frontend performance** — route-level code splitting (`lazyWithRetry`), memoised filters, paginated admin tables, and a single production CSS/JS bundle via Vite.

---

## 📊 Testing & Technical Verification

No committed unit-test suite ships yet; verification is enforced through layered gates:

- **Backend gates** — `manage.py check` (zero-issue policy), `makemigrations --check` (no silent schema drift), per-app `migrate` on staging-equivalent SQLite before Postgres promotion.
- **Data-migration proving** — seed/repair migrations are validated against scratch database copies (break → repair → restore cycle) before commit.
- **Contract probing** — live endpoints verified with status/body inspection (e.g., distinguishing Django `DisallowedHost` HTML from JSON payloads); payment flows exercised end-to-end in Flutterwave sandbox before live keys are used.
- **Frontend gates** — production `vite build` must pass (chunk audit included); responsive checks across desktop/mobile breakpoints; destructive admin actions require typed confirmations and are re-verified post-deploy.
- **Observability** — Gunicorn access logs, `journalctl` service logs, nginx error logs, and immutable audit-log rows for every admin mutation.

---

## 📦 Local Setup & Deployment Specifications

**Prerequisites:** Python 3.13+, Node 20+, Redis (for async/realtime features), PostgreSQL 15+ (production only).

```bash
# 1. Backend
cd Backend
python -m venv ../venv && source ../venv/bin/activate   # Windows: ..\venv\Scripts\activate
pip install -r ../requirements.txt
cp .env.example .env        # then fill in values (template below)
python manage.py migrate
python manage.py seed_plans
python manage.py setup_rbac --email you@example.com --password "ChooseAStrongPassword123!"
python manage.py runserver 127.0.0.1:8002

# 2. Frontend (new terminal)
cd Frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api, /media, /ws → :8002)
```

**`.env` template (backend)** — see `Backend/.env.example` for the annotated original:

```ini
SECRET_KEY=change-me
DJANGO_DEBUG=1
ALLOWED_HOSTS=localhost,127.0.0.1,[::1]
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Production database (omit for local SQLite)
DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=require
# - or - DB_ENGINE=postgresql + DB_NAME/DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_SSLMODE

# Media (omit for local filesystem storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Social login (server-side verification)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# AI support chatbot (OpenRouter-compatible)
CHATBOT_API_KEY=
CHATBOT_API_BASE=https://openrouter.ai/api/v1
CHATBOT_MODEL=openai/gpt-4o-mini

# Flutterwave v4 (sandbox when FLUTTERWAVE_SANDBOX=1)
FLUTTERWAVE_CLIENT_ID=
FLUTTERWAVE_CLIENT_SECRET=
FLUTTERWAVE_SECRET_HASH=
FLUTTERWAVE_SANDBOX=1

# Email (Brevo relay)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=

# One-time first-admin bootstrap (set, use, then remove)
ADMIN_BOOTSTRAP_KEY=
```

**Frontend env (`Frontend/.env`, gitignored — injected from CI secrets in production):**

```ini
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_FACEBOOK_APP_ID=your-facebook-app-id
```

**Production deployment (automated):** push to `main` → GitHub Actions SSH deploys to the VPS (`/var/www/destinypair`): `git pull`, frontend `.env` generation from secrets, `npm install && npm run build`, `migrate`, `systemctl restart gunicorn`. nginx serves `Frontend/dist` (including SPA fallback), proxies `/api/`, `/django-admin/` to Gunicorn over a unix socket, and serves `/media/` + `/static/`.
