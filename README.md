# PayFlow — Distributed Payment Processing Backend

Java 17 · Spring Boot 3 · PostgreSQL · Redis · Apache Kafka · Docker Compose

PayFlow is a portfolio-grade backend that demonstrates the engineering primitives a real
fintech system relies on: ACID money transfers, idempotent requests, optimistic + pessimistic
locking under concurrency, async event-driven notifications, Redis-based rate limiting,
and role-based authorization.

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
src/main/java/com/payflow
├── PayflowApplication.java         # entry point
├── auth/                            # register, login, JWT, security bridge
│   ├── AuthController.java
│   ├── AuthService.java             # also auto-creates wallet on register
│   ├── JwtService.java
│   ├── JwtAuthFilter.java
│   ├── CustomUserDetailsService.java
│   └── dto/
├── user/                            # User entity + repo + Role enum
├── wallet/                          # Wallet entity + repo + balance endpoint
├── transaction/                     # the heart of the system
│   ├── PaymentController.java
│   ├── PaymentService.java          # idempotency orchestration
│   ├── AcidTransferExecutor.java    # @Transactional + @Retryable money move
│   ├── TransactionController.java
│   ├── AdminTransactionController.java
│   ├── TransactionService.java
│   └── dto/
├── notification/                    # Kafka consumer
├── kafka/                           # event records + producer
├── redis/                           # IdempotencyService, RateLimiterService
├── gateway/                         # RateLimitFilter
├── common/                          # ApiError + GlobalExceptionHandler
└── config/                          # SecurityConfig, RedisConfig, KafkaConfig
```

---

## Quick start

### 1. Boot the infrastructure

```bash
docker compose up -d
```

This starts Postgres (5432), Redis (6379), Zookeeper (2181), Kafka (9092).
Wait ~10s for Kafka to fully come up the first time.

### 2. Build and run the Spring Boot app

```bash
./mvnw spring-boot:run
# or
mvn spring-boot:run
```

App listens on **http://localhost:8080**.

### 3. Tear it down

```bash
docker compose down              # keep volumes
docker compose down -v           # wipe Postgres data too
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
