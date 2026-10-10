# Course Batch E Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the ten backend chapters into 31 detailed lessons that teach a real Node.js, NestJS, PostgreSQL, authentication, concurrency, reliability, testing, and observability path without overstating unverified infrastructure.

**Architecture:** Preserve ten numbered chapter paths as hubs. Add three detailed lessons per chapter for Chapters 1–9 and four lessons for the capstone. Reuse one Neighbor Market domain and one error/authorization/transaction contract across the volume.

**Tech Stack:** Markdown, Node.js 24, TypeScript 6/7 boundaries, NestJS 12.1.1, PostgreSQL 18, `pg`, Redis, BullMQ, OpenAPI, Node test tooling.

---

## 1. Backend Evidence Rules

- All complete projects remain inside Markdown and are extracted to `/tmp`.
- A TypeScript build is not evidence that HTTP, PostgreSQL, transactions or authorization worked.
- PostgreSQL checks must record server major version, client major version, connection target and migration state.
- If PostgreSQL 18 cannot start, preserve the exact error and run only checks that do not depend on it.
- Mock repositories, in-memory stores and stub sessions must be visibly labelled.
- Every mutation path states authorization, transaction ownership, idempotency and conflict behavior.
- Passwords, tokens, cookies, connection strings and `.env` values use placeholders only.

## 2. Task 1: Node Runtime and HTTP

**Files:**
- Modify: `web-fullstack-course/08-backend/01-node-runtime-http.md`
- Create: `web-fullstack-course/08-backend/01-node-runtime-http/01-node-process-event-loop-lifecycle.md`
- Create: `web-fullstack-course/08-backend/01-node-runtime-http/02-http-request-response-streams.md`
- Create: `web-fullstack-course/08-backend/01-node-runtime-http/03-timeouts-errors-graceful-shutdown.md`

- [ ] Teach process startup, module evaluation, event-loop work, blocking evidence, signals and lifecycle ownership.
- [ ] Teach HTTP parsing, routing, request limits, response status/headers/body, streaming and backpressure.
- [ ] Teach timeout budgets, malformed input, uncaught failures, connection draining and graceful shutdown.
- [ ] Rewrite the hub around a minimal listing API and verify normal, 404, 400, oversized and shutdown paths.

## 3. Task 2: NestJS and Validation

**Files:**
- Modify: `web-fullstack-course/08-backend/02-nest-api-validation.md`
- Create: `web-fullstack-course/08-backend/02-nest-api-validation/01-bootstrap-modules-dependency-injection.md`
- Create: `web-fullstack-course/08-backend/02-nest-api-validation/02-dto-transformation-validation.md`
- Create: `web-fullstack-course/08-backend/02-nest-api-validation/03-pipes-filters-error-contract.md`

- [ ] Teach bootstrap, modules, providers, dependency injection scopes and explicit service ownership.
- [ ] Teach DTO runtime transformation, whitelist behavior, numeric/date parsing, nested validation and unknown input.
- [ ] Teach pipes, filters, domain errors, HTTP mapping and one stable machine-readable error contract.
- [ ] Rewrite the hub and verify valid/invalid create-listing requests without claiming persistence.

## 4. Task 3: SQL Modeling

**Files:**
- Modify: `web-fullstack-course/08-backend/03-sql-modeling.md`
- Create: `web-fullstack-course/08-backend/03-sql-modeling/01-domain-to-relational-model.md`
- Create: `web-fullstack-course/08-backend/03-sql-modeling/02-constraints-foreign-keys-invariants.md`
- Create: `web-fullstack-course/08-backend/03-sql-modeling/03-migrations-indexes-query-plans.md`

- [ ] Derive users, listings, favorites and reservations from domain rules; distinguish identity, references and history.
- [ ] Teach nullability, uniqueness, checks, foreign keys, cascades and invariants that belong in the database.
- [ ] Teach forward migrations, rollback limits, indexes, selectivity and introductory `EXPLAIN`.
- [ ] Rewrite the hub and statically parse all SQL where tooling allows.

## 5. Task 4: PostgreSQL Data Access

**Files:**
- Modify: `web-fullstack-course/08-backend/04-postgres-data-access.md`
- Create: `web-fullstack-course/08-backend/04-postgres-data-access/01-connections-tls-pools-timeouts.md`
- Create: `web-fullstack-course/08-backend/04-postgres-data-access/02-parameterized-sql-types-sqlstate.md`
- Create: `web-fullstack-course/08-backend/04-postgres-data-access/03-repositories-connection-ownership.md`

- [ ] Teach connection strings, service/pass files, TLS verification, pools, acquisition timeouts and shutdown.
- [ ] Teach parameterized SQL, identifiers versus values, integer/bigint/time conversion and SQLSTATE handling.
- [ ] Teach repository contracts, query ownership and passing a transaction client without hidden pool checkout.
- [ ] Rewrite the hub and verify connection-failure evidence without exposing credentials.

## 6. Task 5: Transactions and Concurrency

**Files:**
- Modify: `web-fullstack-course/08-backend/05-transactions-concurrency.md`
- Create: `web-fullstack-course/08-backend/05-transactions-concurrency/01-isolation-locks-races.md`
- Create: `web-fullstack-course/08-backend/05-transactions-concurrency/02-atomic-reservations-concurrency-reproduction.md`
- Create: `web-fullstack-course/08-backend/05-transactions-concurrency/03-optimistic-lock-deadlock-retry-rollback.md`

- [ ] Teach atomicity, isolation phenomena, row locks and the failure of check-then-write.
- [ ] Implement and reproduce two concurrent reservation attempts with one committed winner.
- [ ] Teach version columns, deadlock ordering, serialization retry limits, rollback and side-effect boundaries.
- [ ] Rewrite the hub and require real database evidence for concurrency claims.

## 7. Task 6: Authentication, Sessions, and Authorization

**Files:**
- Modify: `web-fullstack-course/08-backend/06-auth-sessions-rbac.md`
- Create: `web-fullstack-course/08-backend/06-auth-sessions-rbac/01-password-hashing-account-boundaries.md`
- Create: `web-fullstack-course/08-backend/06-auth-sessions-rbac/02-cookie-sessions-origin-csrf.md`
- Create: `web-fullstack-course/08-backend/06-auth-sessions-rbac/03-authentication-object-authorization-rbac.md`

- [ ] Teach password hashing parameters, account lookup, generic login errors and credential lifecycle boundaries.
- [ ] Teach opaque sessions, Cookie attributes, origin checks, CSRF tokens, rotation and logout.
- [ ] Separate identity, object ownership and role permissions; verify 401, 403 and anti-enumeration behavior.
- [ ] Rewrite the hub without presenting hidden UI or client claims as authorization.

## 8. Task 7: Search, Pagination, and Files

**Files:**
- Modify: `web-fullstack-course/08-backend/07-search-pagination-files.md`
- Create: `web-fullstack-course/08-backend/07-search-pagination-files/01-safe-search-dynamic-queries.md`
- Create: `web-fullstack-course/08-backend/07-search-pagination-files/02-offset-keyset-consistent-pagination.md`
- Create: `web-fullstack-course/08-backend/07-search-pagination-files/03-upload-streams-type-storage-cleanup.md`

- [ ] Teach allow-listed sorting, parameterized filters, escaped search patterns and query-plan evidence.
- [ ] Compare offset and keyset pagination, stable ordering, cursor encoding and concurrent-change behavior.
- [ ] Teach upload streaming, byte limits, signature inspection, generated names, isolated storage, safe download and cleanup.
- [ ] Rewrite the hub and state that the capstone does not implement production upload storage.

## 9. Task 8: Redis, Outbox, and Queues

**Files:**
- Modify: `web-fullstack-course/08-backend/08-redis-queues-reliability.md`
- Create: `web-fullstack-course/08-backend/08-redis-queues-reliability/01-cache-invalidation-stampede-control.md`
- Create: `web-fullstack-course/08-backend/08-redis-queues-reliability/02-transactional-outbox-consistency.md`
- Create: `web-fullstack-course/08-backend/08-redis-queues-reliability/03-bullmq-idempotency-retry-dead-letter-shutdown.md`

- [ ] Teach cache-aside, key design, TTL, invalidation, stale reads and stampede control.
- [ ] Teach why database-plus-queue dual writes fail and how a transactional outbox closes the gap.
- [ ] Teach BullMQ identity, retries, idempotent handlers, dead-letter inspection and graceful worker shutdown.
- [ ] Rewrite the hub and distinguish optional reliability extensions from the core API.

## 10. Task 9: Testing, OpenAPI, and Observability

**Files:**
- Modify: `web-fullstack-course/08-backend/09-testing-openapi-observability.md`
- Create: `web-fullstack-course/08-backend/09-testing-openapi-observability/01-unit-http-real-postgres-tests.md`
- Create: `web-fullstack-course/08-backend/09-testing-openapi-observability/02-openapi-generation-contract-validation.md`
- Create: `web-fullstack-course/08-backend/09-testing-openapi-observability/03-structured-logs-metrics-traces.md`

- [ ] Define unit, module, HTTP and real PostgreSQL test responsibilities with isolated state.
- [ ] Teach OpenAPI generation, status/error examples, drift checks and generated-client limits.
- [ ] Teach structured logs, correlation IDs, metrics, traces, sensitive-data redaction and evidence-driven diagnosis.
- [ ] Rewrite the hub and preserve historical environment gaps.

## 11. Task 10: API Capstone

**Files:**
- Modify: `web-fullstack-course/08-backend/10-api-capstone.md`
- Create: `web-fullstack-course/08-backend/10-api-capstone/01-workspace-config-migration-bootstrap.md`
- Create: `web-fullstack-course/08-backend/10-api-capstone/02-domain-repositories-transaction-services.md`
- Create: `web-fullstack-course/08-backend/10-api-capstone/03-session-controllers-authorization-wiring.md`
- Create: `web-fullstack-course/08-backend/10-api-capstone/04-real-http-database-acceptance-runbook.md`

- [ ] Define the complete temporary workspace, pinned manifests, configuration validation, schema and migration order.
- [ ] Implement domain types, repositories and transaction services with integer cents, UTC and conflict semantics.
- [ ] Wire sessions, controllers, CSRF, object authorization, errors and redacted logs.
- [ ] Provide a real HTTP/PostgreSQL acceptance runbook covering migrations, fixtures, concurrent reservations, authorization and shutdown.
- [ ] Rewrite the hub so complete source has one owner and all exclusions remain explicit.

## 12. Task 11: Coverage Matrix and Navigation

**Files:**
- Create: `web-fullstack-course/08-backend/BACKEND-COVERAGE.md`
- Modify: `web-fullstack-course/08-backend/README.md`

- [ ] Map runtime, Nest, validation, SQL, PostgreSQL, transactions, authentication, authorization, search, files, Redis, queues, testing, OpenAPI, observability and capstone requirements to lessons.
- [ ] Include separate rows for integer cents, UTC, CSRF, object authorization, transaction ownership, idempotency and environment evidence.
- [ ] Link all 31 lessons from hubs and README.
- [ ] Preserve prerequisites and expected local services.

## 13. Task 12: Static Verification

- [ ] Verify exactly 31 detailed lesson files and ten stable hubs.
- [ ] Verify the 13-section contract, code fences, relative links and matrix IDs.
- [ ] Extract complete TypeScript, SQL, JSON, YAML and configuration examples to `/tmp/full-course-verification/backend/`.
- [ ] Run JavaScript/TypeScript syntax and declared compilation checks.
- [ ] Parse JSON/YAML/OpenAPI and lint SQL where tools are available.
- [ ] Run pure domain assertions for cents, UTC, version conflicts, authorization decisions, pagination cursors and retry limits.

## 14. Task 13: Runtime Gate

- [ ] Inspect local Node, package manager, PostgreSQL server/client and library availability.
- [ ] If PostgreSQL 18 starts, apply migrations to an isolated database and run the declared HTTP/database acceptance suite.
- [ ] If it does not start, record the exact command, version and error; do not substitute PostgreSQL 16 as proof of PostgreSQL 18 compatibility.
- [ ] Stop temporary services and remove temporary data directories.
- [ ] Update validation text with new observed evidence only.

## 15. Task 14: Review and Commit

- [ ] Run independent correctness and security review for transaction, auth, file, Redis and queue lessons.
- [ ] Fix all blocking findings and re-run affected checks.
- [ ] Run `git diff --check`.
- [ ] Commit Chapters 1–3, 4–6, 7–9, and Chapter 10/navigation as four scoped commits.
- [ ] Do not stage other course volumes.
