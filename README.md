# PayFlow

Distributed payment processing backend with a React dashboard. Two users can register, send money to each other with idempotent retries, refund completed transfers, and view a system-wide ledger if they're admin — all on top of ACID transactions, optimistic + pessimistic locking, Kafka events, and Redis-backed rate limiting and spend caps.

**Backend** Java 17 · Spring Boot 3 · PostgreSQL 15 · Redis 7 · Apache Kafka
**Frontend** React 18 · TypeScript · Vite · Tailwind CSS
**Infra** Docker Compose

---

## Features

### Money movement
- **ACID transfers** — debit, credit, and ledger insert in one `@Transactional` block. Failures roll back atomically.
- **Idempotency** — every transfer carries an `Idempotency-Key` UUID. Replays return the cached response; a unique DB constraint is the safety net if Redis is unavailable.
- **Refunds** — only the original recipient or an admin can refund a `COMPLETED` transfer. The original flips to `REVERSED`; a new `REFUND` row records the compensating movement. Refunds are independently idempotent.
- **Daily limit** — ₹50,000 outgoing per user per UTC day. Enforced by an atomic Redis counter keyed in paise (integer math, no FP drift); rolled back on transfer failure.
- **Rate limit** — 10 transfer requests per minute per user via Redis sliding window.

### Authentication
- **JWT sessions** (HS256), default 1-hour lifetime
- **Remember Me** — opt into a 24-hour session at login
- **Forgot Password** — single-use, 15-minute reset tokens. In demo mode the reset URL is logged to the backend console; swap in a real email provider for production.
- **Role-based access** — `USER` and `ADMIN`, enforced at both the URL filter chain and the controller method (`@PreAuthorize`).
- **bcrypt** hashing on storage. Plaintext never persisted.

### Reliability primitives
- **Optimistic locking** — `@Version` on `Wallet`; loser retries via `@Retryable` with 50ms exponential backoff
- **Pessimistic locking** — `SELECT … FOR UPDATE` on both wallets, ordered by id to avoid A→B vs B→A deadlock
- **After-commit Kafka publish** — `payment_completed` and `payment_refunded` events are emitted via `TransactionSynchronization.afterCommit`, so consumers never see ghost payments
- **Global error handler** — every exception type maps to a clean JSON `ApiError` shape

### Frontend
- Seven screens: Login, Register, Forgot Password, Reset Password, Dashboard, Send Money, Transactions, Admin
- Refund button surfaces on received transactions with a confirmation modal
- Daily-limit indicator on Dashboard and Transfer pages
- Manual refresh on the history page
- Automatic logout + redirect on `401`

---

## Architecture

```
                  ┌──────────────────┐
                  │     CLIENT       │
                  └────────┬─────────┘
                           │ HTTP + Bearer JWT
                           ▼
       ┌────────────────────────────────────────────┐
       │           SPRING BOOT (port 8080)          │
       │                                            │
       │   JwtAuthFilter       — validate token     │
       │   RateLimitFilter     — 10/min per user    │ ──► REDIS
       │   ↓                                        │
       │   Controllers         — auth, wallet,      │
       │                         payment, history   │
       │   ↓                                        │
       │   PaymentService                           │
       │     ├─ IdempotencyService    (Redis SETNX) │
       │     ├─ DailyLimitService     (Redis INCRBY)│
       │     └─ AcidTransferExecutor                │
       │           ├─ SELECT FOR UPDATE             │ ──► POSTGRES
       │           ├─ debit + credit + insert       │
       │           └─ afterCommit → KAFKA           │ ──► KAFKA
       │                                            │
       │   NotificationService  (@KafkaListener)    │
       │                                            │
       │   GlobalExceptionHandler  (wraps all)      │
       └────────────────────────────────────────────┘

       Outside (Docker Compose):
       ┌──────────┐  ┌────────┐  ┌──────────────────┐
       │ POSTGRES │  │ REDIS  │  │ KAFKA + ZOOKEEPER│
       └──────────┘  └────────┘  └──────────────────┘
```

---

## Project layout

```
payflow/
├── docker-compose.yml               # Postgres + Redis + Kafka + Zookeeper
├── pom.xml
├── .env.example                     # copy to .env locally
│
├── src/main/java/com/payflow/
│   ├── auth/                        # register, login, JWT, password reset
│   │   ├── AuthController, AuthService, JwtService, JwtAuthFilter
│   │   ├── CustomUserDetailsService
│   │   ├── PasswordResetToken, PasswordResetTokenRepository
│   │   └── dto/
│   ├── user/                        # User entity + Role enum + repo
│   ├── wallet/                      # Wallet entity + balance endpoint
│   ├── transaction/                 # core money movement
│   │   ├── PaymentService           # idempotency + daily-limit orchestrator
│   │   ├── AcidTransferExecutor     # @Transactional + @Retryable transfer & refund
│   │   ├── TransactionService       # history queries
│   │   ├── TransactionStatus enum   # PENDING / COMPLETED / FAILED / REVERSED / REFUND
│   │   ├── DailyLimitExceededException
│   │   └── *Controller
│   ├── notification/                # @KafkaListener for both event topics
│   ├── kafka/                       # PaymentEventProducer + event records
│   ├── redis/                       # IdempotencyService, RateLimiterService, DailyLimitService
│   ├── gateway/                     # RateLimitFilter
│   ├── common/                      # ApiError + GlobalExceptionHandler
│   └── config/                      # SecurityConfig, RedisConfig, KafkaConfig
│
└── frontend/
    ├── package.json
    ├── vite.config.ts               # dev proxy /api → localhost:8080
    └── src/
        ├── api/client.ts            # axios + typed endpoints
        ├── context/AuthContext.tsx
        ├── routes/ProtectedRoute.tsx
        ├── components/              # Layout, AuthShell, ConfirmModal, DailyLimitBar, …
        ├── pages/                   # Login, Register, ForgotPassword, ResetPassword,
        │                            # Dashboard, Transfer, History, AdminTransactions
        ├── lib/format.ts
        └── types.ts                 # mirrors backend DTOs
```

---

## Getting started

### Prerequisites
- Java 17
- Maven 3.9+
- Node.js 18+
- Docker Desktop (running)

### 1. Configure local secrets

```powershell
Copy-Item .env.example .env
```

The defaults in `.env.example` work for local development as-is. **`.env` is gitignored** — real secrets never enter the repo.

### 2. Start the infrastructure

```powershell
docker compose up -d
```

Wait ~10 seconds for Kafka to settle on first boot. Verify with `docker compose ps` — all four containers should be `Up` or `healthy`.

### 3. Run the backend

```powershell
mvn spring-boot:run
```

API serves on **http://localhost:8080**. Wait for `Started PayflowApplication` in the log.

### 4. Run the frontend

```powershell
cd frontend
npm install         # first time only
npm run dev
```

Open **http://localhost:5173**.

### Tear down

```powershell
docker compose down              # stop containers, keep DB volume
docker compose down -v           # also wipe the Postgres volume
```

---

## API reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create user; wallet auto-created in same transaction |
| POST | `/api/auth/login` | public | Returns JWT. Optional `rememberMe: true` for 24h session |
| POST | `/api/auth/forgot-password` | public | Issues a reset token (logged to backend console) |
| POST | `/api/auth/reset-password` | public | Consumes token, updates bcrypt hash |
| GET  | `/api/wallet/balance` | bearer | Caller's wallet balance |
| POST | `/api/payments/transfer` | bearer | Send money. Requires `Idempotency-Key` UUID header |
| POST | `/api/payments/refund/{transactionId}` | bearer | Refund a received transfer. Requires `Idempotency-Key`. Caller must be the original recipient, or an admin |
| GET  | `/api/payments/daily-spent` | bearer | Today's outgoing total, cap, and remaining |
| GET  | `/api/transactions/history` | bearer | Caller's transactions, paginated |
| GET  | `/api/admin/transactions` | bearer + ADMIN | System-wide transactions |

### Example: transfer with idempotency

```powershell
$token = (Invoke-RestMethod -Uri http://localhost:8080/api/auth/login -Method Post `
  -ContentType 'application/json' `
  -Body '{"email":"alice@payflow.dev","password":"password123"}').token

Invoke-RestMethod -Uri http://localhost:8080/api/payments/transfer -Method Post `
  -Headers @{ Authorization = "Bearer $token"; "Idempotency-Key" = [guid]::NewGuid().ToString() } `
  -ContentType 'application/json' `
  -Body '{"recipientEmail":"bob@payflow.dev","amount":100.00}'
```

Submitting the same request with the same `Idempotency-Key` returns the original response without re-processing.

---

## Configuration

All values overridable via environment variables (see `.env.example`).

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | — | Docker Compose Postgres init. **Required** in `.env` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `localhost` / `5432` / `payflow` / `payflow` / `change-me-locally` | Spring datasource |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis |
| `KAFKA_BOOTSTRAP` | `localhost:9092` | Kafka broker |
| `JWT_SECRET` | dev placeholder | HS256 signing key. Use 64+ random chars in production |
| `payflow.jwt.expiration-ms` | `3600000` (1h) | Default JWT lifetime |
| `payflow.jwt.remember-me-expiration-ms` | `86400000` (24h) | Remember-me JWT lifetime |
| `payflow.password-reset.token-ttl-minutes` | `15` | Reset token lifetime |
| `payflow.daily-limit.amount` | `50000.00` | Outgoing cap per user per day |
| `payflow.rate-limit.payment-per-minute` | `10` | Transfer rate limit |
| `payflow.idempotency.ttl-hours` | `24` | Idempotency-key TTL in Redis |
| `payflow.cors.allowed-origins` | `localhost:5173,localhost:4173` | Comma-separated CORS allow-list |

---

## Promoting a user to admin

There is no admin-create endpoint by design. Promote via SQL once:

```powershell
docker exec -it payflow-postgres psql -U payflow -d payflow `
  -c "UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';"
```

Log out and back in to pick up a JWT carrying the new role.

---

## Security notes

- **No secrets in the repo.** All credentials live in `.env`, which is gitignored. Docker Compose auto-loads it. `${POSTGRES_PASSWORD:?…}` syntax makes it impossible to start the stack without one set.
- **Passwords** stored only as bcrypt hashes.
- **JWTs** are stateless and signed; clients can never forge a valid token without the secret.
- **Refund authorisation** matches real payment networks: the party currently holding the funds (recipient) is the only one who can voluntarily release them. Senders cannot unilaterally claw back.
- **Daily spend cap** limits blast radius if an account is compromised.
- **`/api/admin/**`** is restricted to `ROLE_ADMIN` at both the path matcher and method level (`@PreAuthorize`) — defense in depth.
- **Idempotent retries + ACID transactions** mean repeated network failures never produce double charges or partial ledger entries.
