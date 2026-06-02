# Engineering Decisions

A short record of *why* PayFlow is built the way it is. Each entry names the
choice, the alternative it replaced, and the reason. Reading this should
answer most of the "why didn't you just…?" questions an interviewer might ask.

---

## Money correctness

- **Used `BigDecimal` everywhere for money instead of `double` / `float`** —
  Float math drops pennies on rounding. `BigDecimal(scale=2)` maps 1-to-1 to
  the Postgres `DECIMAL(15,2)` column and gives exact arithmetic. Floats and
  ledgers don't belong in the same project.

- **Stored the daily-limit counter in integer *paise* in Redis instead of
  decimal rupees** — Redis `INCRBY` is exact on integers but drifts on
  floats. Multiplying by 100 at read/write time costs nothing and removes a
  whole class of accumulated-rounding bug.

- **Refunds intentionally don't replenish the daily budget** — Stripe, Visa,
  and most card networks measure "daily spend" at the moment of
  authorisation, not net of returns. Simpler invariant, harder to game.

---

## Concurrency & ordering

- **Locked both wallets in ascending ID order (`SELECT FOR UPDATE`), not in
  transfer order** — Otherwise an `A → B` transfer and a simultaneous
  `B → A` transfer deadlock: each holds one row and waits for the other.
  Always locking the lower id first makes every transaction acquire locks
  in the same global order.

- **Kept `@Version` on `Wallet` *alongside* the pessimistic row lock** —
  Belt-and-suspenders. The row lock serialises most writers; the optimistic
  version catches the rare case where Hibernate flushes an `UPDATE` late
  and a stale view slips through. `@Retryable` retries up to 3 times so the
  client never sees the internal collision.

- **Published the Kafka event via `TransactionSynchronization.afterCommit`,
  not inside the `@Transactional` block** — Publishing before the commit
  means a later rollback leaves consumers thinking a payment happened that
  the DB never durably accepted. Publishing after commit is the only way to
  keep the ledger and the event bus consistent.

---

## Authorization & security

- **Restricted refunds to the original recipient (or admin), never the
  sender** — Matches real payment networks. The party currently *holding*
  the money is the only one who can voluntarily release it. A sender
  clicking "refund" and pulling money back from the recipient is theft,
  not a refund. Senders must request; admins act as the chargeback override.

- **`/forgot-password` returns the same generic message whether the email
  exists or not** — Otherwise an attacker iterating random addresses can
  build a list of real accounts. The user-visible flow is identical in both
  cases; only the backend log differs.

- **Configured Spring Security as fully stateless (no HTTP session)** —
  Every request carries its own JWT. The backend can scale horizontally
  without sticky sessions or a shared session store.

- **Double-guarded admin routes with both path-based rules in
  `SecurityConfig` AND `@PreAuthorize("hasRole('ADMIN')")` on the method**
  — A future routing change that accidentally exposes the path shouldn't be
  one mistake away from leaking admin endpoints.

---

## Reliability & idempotency

- **Layered idempotency: Redis `SETNX` as the fast path + a `UNIQUE`
  constraint on `transactions.idempotency_key` as the safety net** —
  Redis can fail. If it does, the DB constraint still guarantees that the
  same key never produces two transactions. Two independent failure
  domains, one invariant.

- **Required `Idempotency-Key` to be a real UUID, not any string** — Weak
  or predictable keys (counters, timestamps) would silently collide across
  users and produce mis-attributed cached responses. UUID validation in the
  controller catches this at the boundary.

- **`DailyLimit.tryConsume` does atomic `INCRBY` first, then checks, then
  `DECRBY` on overflow** — A check-then-`INCRBY` alternative has a window
  where two concurrent transfers can both see "ok" and both push the
  counter over the limit. INCRBY-first makes the check race-free.

---

## Operational & dev experience

- **Forced JVM to UTC (`-Duser.timezone=UTC`) plus Hibernate
  `jdbc.time_zone=UTC`** — Windows reports the legacy `Asia/Calcutta` zone
  which Postgres 15+ rejects. UTC is also the right default for a ledger:
  no timezone math anywhere near money.

- **Split `AcidTransferExecutor` out from `PaymentService` as a separate
  Spring bean** — `@Transactional` and `@Retryable` are proxy-based.
  Calling them from inside the same class bypasses the proxy and silently
  skips both advices. Two beans = the proxy chain actually runs.

- **Added `spring-dotenv` so `mvn spring-boot:run` auto-loads `.env`** —
  Docker Compose has built-in `.env` support, Maven does not. A manual
  `source .env` step every fresh terminal is friction without value. The
  library merges `.env` into Spring's property sources at startup.

- **Made `REVERSED` and `REFUND` separate `TransactionStatus` enum values**
  — They describe two different things. `REVERSED` is the *original*
  transaction (now refunded). `REFUND` is the *new* compensating row.
  Conflating them into one status would make SQL queries and the history
  view ambiguous.

- **Kept secrets exclusively in `.env` (gitignored), with
  `${POSTGRES_PASSWORD:?…}` in `docker-compose.yml`** — A missing or
  empty password should make the stack refuse to start, not silently boot
  on an insecure default. `.env.example` is checked in as the template.

---

*Last updated: 02 Jun 2026.*
