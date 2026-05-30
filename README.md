# PayFlow — Distributed Payment Processing System

**Backend:** Java 17 · Spring Boot 3 · PostgreSQL · Redis · Apache Kafka · Docker Compose
**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS

PayFlow is a portfolio-grade fintech project that demonstrates the engineering primitives a real
payment system relies on: ACID money transfers, idempotent requests, optimistic + pessimistic
locking under concurrency, async event-driven notifications, Redis-based rate limiting,
and role-based authorization — wrapped in a clean React UI for live demos.

---

## Why each piece exists

| What it does | Engineering concept |
| --- | --- |
| Sends money between accounts safely | PostgreSQL ACID transactions — debit + credit in one `@Transactional` |
| Never charges you twice on retry | Redis `SETNX` idempotency keys with 24h TTL + unique DB constraint |
| Survives 100 concurrent withdrawals | `SELECT FOR UPDATE` row locks (ordered) + `@Version` optimistic lock + retry |
| Notifies users without slowing payments | Kafka `payment_completed` topic + async Notification consumer |
| Blocks abuse / brute force | Redis fixed-window rate limiter — 10 req/min per user |
| Admin vs user access | Spring Security RBAC — `ROLE_ADMIN` for `/api/admin/**` |

---

## Architecture

```
                  ┌──────────┐
                  │  Client  │
                  └────┬─────┘
                       │ HTTPS (JWT in Authorization header)
                       ▼
        ┌──────────────────────────────┐
        │   Spring Boot — PayFlow      │
        │                              │
        │   JwtAuthFilter              │  ← Step 5
        │       │                      │
        │       ▼                      │
        │   RateLimitFilter ───────────┼──► Redis (INCR + EXPIRE)
        │       │                      │
        │       ▼                      │
        │   AuthController             │
        │   WalletController           │
        │   PaymentController          │
        │   TransactionController      │
        │   AdminTransactionController │
        │       │                      │
        │       ▼                      │
        │   PaymentService             │
        │       │  ├─► IdempotencyService ───► Redis (SETNX, 24h TTL)
        │       │  └─► AcidTransferExecutor
        │       │         │
        │       │         ├─► WalletRepository (SELECT FOR UPDATE) ─► PostgreSQL
        │       │         ├─► TransactionRepository (INSERT)        ─► PostgreSQL
        │       │         └─► afterCommit ─► PaymentEventProducer ─► Kafka
        │                                                                │
        │   NotificationService (@KafkaListener)   ◄──────────────────────┘
        │       │                                                         
        │       └─► (log → real email/SMS provider as extension)         
        └──────────────────────────────────────────────────────────────────┘
```

Everything (Postgres, Redis, Kafka, Zookeeper) runs locally via `docker compose up -d`.
The Spring Boot app itself runs on the host (`mvn spring-boot:run`) and talks to those
containers through their exposed ports.

---

## Project layout

```
payflow/
├── docker-compose.yml               # Postgres + Redis + Kafka + Zookeeper
├── pom.xml                          # Maven build for the backend
│
├── src/main/java/com/payflow/       # ─── BACKEND ───
│   ├── PayflowApplication.java
│   ├── auth/                        # register, login, JWT, security bridge
│   ├── user/                        # User entity + repo + Role enum
│   ├── wallet/                      # Wallet entity + repo + balance endpoint
│   ├── transaction/                 # heart of the system
│   │   ├── PaymentService.java          # idempotency orchestration
│   │   ├── AcidTransferExecutor.java    # @Transactional + @Retryable
│   │   ├── TransactionService.java
│   │   └── *Controller.java
│   ├── notification/                # Kafka consumer
│   ├── kafka/                       # event records + producer
│   ├── redis/                       # IdempotencyService, RateLimiterService
│   ├── gateway/                     # RateLimitFilter
│   ├── common/                      # ApiError + GlobalExceptionHandler
│   └── config/                      # SecurityConfig, RedisConfig, KafkaConfig
│
└── frontend/                        # ─── FRONTEND ───
    ├── package.json
    ├── vite.config.ts               # dev proxy /api -> localhost:8080
    ├── tailwind.config.js
    └── src/
        ├── api/client.ts            # axios + JWT interceptor + typed endpoints
        ├── context/AuthContext.tsx  # token + role + login/register/logout
        ├── routes/ProtectedRoute.tsx
        ├── components/              # Layout, Logo, PageHeader, Spinner, ...
        ├── pages/                   # Login, Register, Dashboard, Transfer,
        │                            # History, AdminTransactions, NotFound
        ├── lib/format.ts            # currency, dates, initials
        └── types.ts                 # mirrors backend DTOs
```

---

## Quick start — run the whole stack

You will need three terminals.

### Terminal 1 — Infrastructure (Postgres, Redis, Kafka, Zookeeper)

```powershell
docker compose up -d
```

Wait ~10 seconds the first time for Kafka to finish booting. Check:

```powershell
docker compose ps
```

All four containers should be `Up` or `healthy`.

### Terminal 2 — Backend API (Spring Boot, port 8080)

```powershell
mvn spring-boot:run
```

Wait for `Started PayflowApplication in X.X seconds`. The API is now live on
**http://localhost:8080**.

### Terminal 3 — Frontend (Vite + React, port 5173)

```powershell
cd frontend
npm install     # only the first time
npm run dev
```

Open **http://localhost:5173** in your browser. The dev server proxies `/api/*` to
the backend, so CORS is invisible during development.

### Tear it down

```powershell
# In each terminal: Ctrl+C
docker compose down              # stop containers, keep DB volume
docker compose down -v           # stop containers AND wipe Postgres data
```

---

## API reference

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | Create user (auto-creates empty wallet) |
| POST | `/api/auth/login` | public | Returns JWT |
| GET  | `/api/wallet/balance` | bearer | Caller's wallet balance |
| POST | `/api/payments/transfer` | bearer | Send money. Requires `Idempotency-Key` header |
| GET  | `/api/transactions/history` | bearer | Caller's transactions, paginated |
| GET  | `/api/admin/transactions` | bearer + ADMIN | All transactions |

---

## Frontend tour

| Route | Auth | What it shows |
| --- | --- | --- |
| `/login` | public | Email/password sign-in. JWT stored in localStorage. |
| `/register` | public | Create account; wallet auto-created server-side. |
| `/dashboard` | bearer | Wallet balance card, recently sent/received totals, last 5 transactions. |
| `/transfer` | bearer | Send money. Idempotency-Key UUID auto-generated and shown for transparency. |
| `/history` | bearer | Paginated table with All / Sent / Received filters. |
| `/admin` | bearer + ADMIN | System-wide transaction view (sidebar entry only renders for admins). |

Design notes:

- Tailwind + Inter font for clean typography.
- Brand gradient (indigo) only on the balance card and primary CTAs — everything else is neutral slate so the UI reads like a banking dashboard, not a marketing page.
- All API errors are surfaced via toast notifications; the global error handler on the backend already returns clean JSON, so the frontend just shows `message` or `details`.
- A `401` from any endpoint clears the token and bounces the user back to `/login` automatically.

## Sample curl walkthrough

```bash
# 1) Register two users
curl -s http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@payflow.dev","password":"password123"}'

curl -s http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@payflow.dev","password":"password123"}'

# 2) Login as Alice and grab the JWT
ALICE_TOKEN=$(curl -s http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@payflow.dev","password":"password123"}' | jq -r .token)

# 3) Check Alice's balance (will be 0)
curl -s http://localhost:8080/api/wallet/balance \
  -H "Authorization: Bearer $ALICE_TOKEN"

# 4) Top up Alice manually via SQL (no admin top-up endpoint in this build):
docker exec -it payflow-postgres psql -U payflow -d payflow \
  -c "UPDATE wallets SET balance = 500.00 WHERE user_id = (SELECT id FROM users WHERE email='alice@payflow.dev');"

# 5) Transfer 100 from Alice to Bob (note the Idempotency-Key UUID)
IDEM_KEY=$(uuidgen)
curl -s http://localhost:8080/api/payments/transfer \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"recipientEmail":"bob@payflow.dev","amount":100.00}'

# 6) Replay the SAME request with the SAME key -- should return identical body with replayed=true
curl -s http://localhost:8080/api/payments/transfer \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"recipientEmail":"bob@payflow.dev","amount":100.00}'

# 7) Check history
curl -s http://localhost:8080/api/transactions/history \
  -H "Authorization: Bearer $ALICE_TOKEN"

# 8) Hit the rate limit (11th request within a minute -> 429)
for i in {1..12}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/payments/transfer \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -H "Idempotency-Key: $(uuidgen)" \
    -H 'Content-Type: application/json' \
    -d '{"recipientEmail":"bob@payflow.dev","amount":1.00}'
done
```

Watch the running app's logs while doing step 5/6: you'll see the `[NOTIFICATION]` line
appear from the Kafka consumer — proof of the async event flow.

### PowerShell equivalents (Windows)

```powershell
$alice = (Invoke-RestMethod -Uri http://localhost:8080/api/auth/login -Method Post `
  -ContentType 'application/json' `
  -Body '{"email":"alice@payflow.dev","password":"password123"}').token

$idem = [guid]::NewGuid().ToString()

Invoke-RestMethod -Uri http://localhost:8080/api/payments/transfer -Method Post `
  -Headers @{ Authorization = "Bearer $alice"; "Idempotency-Key" = $idem } `
  -ContentType 'application/json' `
  -Body '{"recipientEmail":"bob@payflow.dev","amount":100.00}'
```

---

## Promoting a user to ADMIN

There is no self-serve admin route by design. Promote via SQL once:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@payflow.dev';
```

Re-login to get a fresh JWT that carries the new role.

---

## Configuration knobs

All overridable via environment variables (see `src/main/resources/application.yml`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | localhost / 5432 / payflow | Postgres connection |
| `REDIS_HOST` / `REDIS_PORT` | localhost / 6379 | Redis connection |
| `KAFKA_BOOTSTRAP` | localhost:9092 | Kafka brokers |
| `JWT_SECRET` | dev-only string | HS256 signing key (use 64+ chars in prod) |
| `payflow.cors.allowed-origins` | `http://localhost:5173,http://localhost:4173` | Comma-separated CORS allow-list (yml property; can also be set via env) |
| `VITE_API_BASE_URL` (frontend) | empty (uses Vite proxy) | Absolute backend URL for production frontend builds |

---

## How each requirement is implemented

| Requirement | Implementation |
| --- | --- |
| **ACID transactions** | `AcidTransferExecutor.execute` is `@Transactional(isolation=READ_COMMITTED)`. Debit + credit + Transaction insert are one DB tx. |
| **Idempotency** | `Idempotency-Key` (UUID) header. `IdempotencyService.tryReserve` is Redis SETNX. On hit, returns cached `TransferResponse`. DB has `UNIQUE(idempotency_key)` as a safety net. |
| **Optimistic locking** | `@Version Long version` on `Wallet`. Concurrent writers race; loser gets `ObjectOptimisticLockingFailureException` and `@Retryable` re-runs (max 3 attempts). |
| **Pessimistic locking** | `WalletRepository.findByIdForUpdate` uses `@Lock(PESSIMISTIC_WRITE)` (Postgres `SELECT … FOR UPDATE`). Both wallets locked in ascending id order to dodge deadlock. |
| **Kafka events** | `PaymentEventProducer` publishes `PaymentCompletedEvent` after-commit via `TransactionSynchronization`. `NotificationService` is the `@KafkaListener`. |
| **Rate limiting** | `RateLimiterService` Redis INCR + EXPIRE. `RateLimitFilter` enforces 10/min/user on `/api/payments/**`, keyed by JWT subject. |
| **RBAC** | `Role` enum + `ROLE_USER` / `ROLE_ADMIN`. `SecurityConfig` restricts `/api/admin/**` by path; `AdminTransactionController` adds `@PreAuthorize("hasRole('ADMIN')")` as defense in depth. |

---

## Interview-ready talking points

- **"Walk me through PayFlow."** Double-entry ledger on Postgres. SELECT FOR UPDATE
  for ordered row locks. Redis-backed idempotency with a unique DB constraint as a
  safety net. Kafka for fire-and-forget notifications, published only after the DB
  commits via `TransactionSynchronization`. Spring Security with stateless JWTs.

- **"How do you prevent double charges?"** Every request carries an
  `Idempotency-Key` UUID. `IdempotencyService.tryReserve` is Redis SETNX with 24h
  TTL — only the first caller proceeds. The response is cached so retries return
  the same body byte-for-byte. The DB has `UNIQUE(idempotency_key)` so even if
  Redis goes down, a duplicate insert fails fast.

- **"What does `@Transactional` actually do here?"** Wraps debit + credit + ledger
  insert in one DB transaction with READ_COMMITTED isolation. If anything fails,
  Postgres rolls back the whole thing — balances can never diverge.

- **"Why Kafka, not a direct call?"** Decoupling. Payment commits in ~10ms.
  Notification might call an external provider that takes a second. We don't want
  payment latency tied to notification health. Also: if notifications are down,
  payments keep working; events queue up and replay when the consumer is back.

- **"What happens under concurrent transfers from the same wallet?"** Two layers:
  pessimistic `SELECT FOR UPDATE` locks the row inside the tx, so concurrent
  transactions queue. The `@Version` optimistic lock is the second layer — if
  Hibernate's UPDATE finds a stale version (rare with the row lock but possible
  during late flush), it throws `ObjectOptimisticLockingFailureException`, and
  `@Retryable` re-runs up to 3 times with exponential backoff. We also lock
  wallets in **ascending id order** so A→B and B→A transfers can't deadlock.

- **"Scale this to 10x traffic?"** Partition Kafka topics (already 3); add more
  consumer instances in the same group. Add Postgres read replicas for history
  queries (writes still go to the primary). Redis cluster for distributed cache.
  Horizontally scale the stateless Spring Boot app behind a load balancer. Move
  rate-limit and idempotency keys to a sharded Redis cluster to avoid hot keys.

---

## What's intentionally out of scope

These are the obvious next steps if you want to extend the project:

- Database migrations (Flyway/Liquibase) — currently `ddl-auto: update`.
- Real notification providers (Twilio, SES, FCM) — `NotificationService` logs.
- Refund / reversal flow — Transaction is immutable in this build.
- OpenAPI / Swagger UI — drop in `springdoc-openapi-starter-webmvc-ui` for free.
- Containerizing the app itself — add a Dockerfile and an `app:` service in
  `docker-compose.yml`. Env-var overrides in `application.yml` already support it.
