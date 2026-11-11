# ZORVI — Development Status

**Author:** Ibrahim Talib
**Tagline:** Learn. Create. Launch.

---

## Environment (verified by inspection)

| Component | Value |
| --- | --- |
| OS | Ubuntu 24.04.5 LTS (noble) |
| Python | 3.12.3 (`/usr/bin/python3`), venv available |
| Flutter | 3.47.4 stable, Dart 3.13.3 (`~/development/flutter`) |
| Git | 2.43.0 (`ibrahim-talib-ds <ibrahimutalibu@gmail.com>`) |
| Docker | 29.1.3, Compose v2.39.2 |
| PostgreSQL (system) | 18.6 installed; `postgresql@18-main.service` inactive |
| PostgreSQL (user) | `~/Databases/post…` running on **127.0.0.1:5432** — belongs to other live projects |
| Docker containers in use | `langloop_postgres` (5433), `langloop_redis` (6380) — **do not touch** |
| Port 8000 | `~/Projects/ZanNe…` (Python) — **do not touch** |
| Port 3000 | Flutter dev server — **do not touch** |

## Port allocation for ZORVI (locked)

| Service | Port | Reason |
| --- | --- | --- |
| ZORVI Postgres (host) | **5434** | 5432 & 5433 already in use |
| ZORVI FastAPI | **8010** | 8000 already in use |
| ZORVI Flutter Web | **5174** | 3000 already in use |

## Phase log

### Phase 0 — Foundation
- [x] Environment inspected (all components present, no installs required)
- [x] Directory skeleton created at `~/Projects/zorvi/`
- [x] `docker-compose.yml` written (isolated stack, port 5434)
- [x] `.env.example` written (no secrets committed)
- [x] `.gitignore` written
- [x] `README.md` written
- [ ] `.env` generated with real secrets (Task 2)
- [ ] `docker compose up -d` verified (Task 3)
- [ ] Python `.venv` created and `requirements.txt` installed (Task 4)
- [ ] Alembic initialized and first empty migration applied (Task 5)
- [ ] FastAPI `/health` returns DB-connected JSON on port 8010 (Task 6)
- [ ] `pytest tests/` passes (Task 7)
- [ ] First git commit (Task 8)

Last updated: 2026-11-07 — skeleton created.

### Phase 0.5 — Real schema in PostgreSQL 18
- [x] Alembic initialized (alembic.ini + env.py + script.py.mako, URL from .env)
- [x] Models: `Base` + `UUIDPrimaryKeyMixin` + `TimestampMixin` + `SoftDeleteMixin`
- [x] Model: `users` — UUID PK, lower(email) unique WHERE deleted_at IS NULL,
      is_active / is_verified / last_login_at, created/updated/deleted timestamps
- [x] Model: `roles` — UUID PK, name UNIQUE
- [x] Model: `user_roles` — composite PK, CASCADE / RESTRICT FKs, granted_at
- [x] Migration `0001_initial` applied to PG 18.6 (cluster 18/zorvi :5434)
- [x] `alembic current` → `0001_initial (head)`
- [x] pytest: 5 tests passing (2 health + 3 models)
- [x] Git commit pending

Last updated: 2026-11-07 — Phase 0.5 complete.

### Phase 1 — Authentication (Task 6) — retroactively recorded
- [x] Argon2id password hashing (OWASP 2024 params: time_cost=3, memory=64MiB, parallelism=4)
- [x] JWT access (30 min) + refresh (30 days) via python-jose HS256
- [x] Refresh rotation: old jti revoked on every /refresh (reuse detection)
- [x] Revocation via refresh_tokens table (jti UNIQUE, revoked_at, expires_at)
- [x] Endpoints: POST /auth/register (201), /login (200), /refresh (200), /logout (200 idempotent)
- [x] GET /users/me protected by HTTPBearer + get_current_user
- [x] Password policy: >=8 chars, letter + digit (Pydantic, 422 on violation)
- [x] Duplicate email → 409; bad creds → 401; missing/invalid token → 401 with WWW-Authenticate
- [x] Migration 0002_refresh_tokens applied
- [x] 11 auth tests + 5 prior = 16 tests passing

### Fix log
- 2026-11-07: Migration 0003 double-created enums (explicit .create + SQLAlchemy auto).
  Fixed with idempotent DO-block CREATE TYPE + column-level create_type=False.
- 2026-11-07: Test emails used `.test` TLD (rejected by email-validator per RFC 2606).
  Switched tests to `@example.com`. Production validation unchanged — `.test` still rejected.
- 2026-11-07: `clean_test_users` fixture failed on FK RESTRICT from `marketplace_products.creator_id`.
  Fixture now deletes children first (files → packages → products → tokens → user_roles → users).
- 2026-11-07: scripts/* failed with `ModuleNotFoundError: app` when run from backend/.
  Added `sys.path.insert(0, parents[1])` bootstrap to seed_roles.py + promote_user.py.

Last updated: 2026-11-07 — Phase 1 + 1.5 both complete, 30/30 tests green.

### Phase 2 — Orders, manual payments, protected downloads (Task 8)
- [x] Schema: orders, order_items (price snapshot), download_tokens
  - status enum: pending / awaiting_verification / paid / cancelled / refunded
  - payment_method enum: manual_bank_transfer / manual_paypal / manual_wise / manual_other
- [x] POST /orders — buyer creates order from package(s), snapshots price
- [x] GET /orders, GET /orders/{id} — buyer's own orders only
- [x] POST /orders/{id}/submit-payment — buyer submits proof (bank transfer etc)
- [x] POST /orders/{id}/cancel — buyer cancels pending order
- [x] Admin (RBAC):
  - GET /admin/orders (+ filter by status)
  - GET /admin/orders/{id}
  - POST /admin/orders/{id}/mark-paid — flips to paid, issues download tokens
  - POST /admin/orders/{id}/mark-cancelled
  - POST /admin/orders/{id}/mark-refunded
- [x] GET /downloads/{token} — single-use, expiring, streaming with Content-Disposition: attachment
- [x] POST /orders/{id}/downloads — buyer re-issues fresh tokens for a paid order
- [x] GET /orders/{id}/downloads — buyer inspects their tokens (no download)
- [x] Storage abstraction: StorageProvider protocol, LocalStorage implementation
  - Path traversal blocked (`..` and absolute paths rejected)
  - Files live under backend/storage/products/ — never served from /static
- [x] 14 new tests: price snapshot, RBAC, ownership, status transitions, single-use tokens, expiry, re-issue
- [x] 44/44 tests passing
- [x] Live end-to-end smoke passed: product created → published → buyer ordered → admin marked paid → buyer downloaded → replay returns 410

Last updated: 2026-11-07 — Phase 2 complete. ZORVI can process real orders.
