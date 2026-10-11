# Web Modernization Batch 5 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the backend volume to a current supported Node/Nest/PostgreSQL/Redis/queue stack and verify its validation, authorization, transaction, concurrency, reliability, testing, and observability claims at the strongest locally available evidence level.

**Architecture:** Establish the supported stack and security contract first, then audit the ten chapters from runtime to Capstone. Static parsing and pure domain tests are mandatory; real HTTP/PostgreSQL/Redis/queue checks run only against isolated local services with recorded versions. The long API scaffold receives a selective-split review before any structural change.

**Tech Stack:** Markdown, Node.js LTS, TypeScript, current stable NestJS, PostgreSQL stable supported release, `pg`, Redis, BullMQ-compatible queue stack, OpenAPI, HTTP test tooling, structured logs/metrics/traces.

---

## 1. Scope and Ownership

**Files:**
- Modify: `web-fullstack-course/08-backend/README.md`
- Modify: `web-fullstack-course/08-backend/BACKEND-COVERAGE.md`
- Modify: all 10 numbered chapter hubs under `web-fullstack-course/08-backend/`
- Modify: all 31 existing detailed lessons under the 10 same-named directories
- Modify when evidence changes: `web-fullstack-course/00-guide/02-version-baseline.md`
- Modify with observed evidence only: `web-fullstack-course/VALIDATION.md`
- Temporary only: `/tmp/web-fullstack-modernization/batch-5/`

Do not connect to a shared or production database. Do not use real credentials, mail, object storage, payment systems, or user data.

## 2. Task 1: Freeze Inventory, Versions, and Security Contract

- [ ] **Step 1: Record worktree and exact inventory**

Run:

```bash
mkdir -p /tmp/web-fullstack-modernization/batch-5
git status --short
rg --files web-fullstack-course/08-backend -g '*.md' \
  | sort \
  | tee /tmp/web-fullstack-modernization/batch-5/inventory.txt
```

Expected: 43 Markdown files: 10 hubs, 31 detailed lessons, README, and coverage matrix.

- [ ] **Step 2: Verify lesson distribution**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

root = Path("web-fullstack-course/08-backend")
counts = {
    path.name: len(list(path.glob("*.md")))
    for path in sorted(root.glob("[0-9][0-9]-*"))
    if path.is_dir()
}
assert list(counts.values()) == [3, 3, 3, 3, 3, 3, 3, 3, 3, 4], counts
print("Batch 5 lesson inventory: PASS (31)")
PY
```

- [ ] **Step 3: Verify the supported backend combination**

From official sources, record current production Node LTS, Nest stable release and migration guide, module format, validation stack, PostgreSQL supported release, `pg` compatibility, Redis server/client compatibility, BullMQ/queue compatibility, OpenAPI tooling, and test runner constraints.

- [ ] **Step 4: Freeze obsolete patterns**

Create `/tmp/web-fullstack-modernization/batch-5/obsolete-patterns.txt`. Inspect unsupported Node/Nest/PostgreSQL/Redis majors, removed Nest APIs, stale decorators or validation patterns, unsupported module config, old PostgreSQL image/layout assumptions, unsafe Redis commands, obsolete queue APIs, old OpenAPI syntax, and historical migration teaching.

- [ ] **Step 5: Freeze the security and consistency contract**

Record exact requirements for integer cents, UTC, validation at trust boundaries, parameterized values, identifier allowlists, transaction ownership, lock/conflict semantics, password hashing, opaque sessions, Cookie attributes, CSRF, object authorization, RBAC, upload isolation, cache staleness, outbox atomicity, worker idempotency, redaction, correlation IDs, and graceful shutdown.

## 3. Task 2: Modernize Runtime, HTTP, Nest, and Validation

**Files:**
- Modify: Chapters 01-02 hubs and all 6 detailed lessons below them

- [ ] **Step 1: Audit Node runtime and process lifecycle**

Verify current ESM/runtime behavior, process startup, blocking evidence, signals, timeouts, request limits, streams/backpressure, client disconnects, uncaught failure policy, connection draining, and bounded graceful shutdown.

- [ ] **Step 2: Audit HTTP behavior**

Verify request parsing, routing, method/status/header/body semantics, content type, structured errors, malformed and oversized input, 404/405 behavior, timeout budgets, and response completion.

- [ ] **Step 3: Audit Nest bootstrap and ownership**

Verify current project/module/provider/bootstrap APIs, module format, dependency scopes, configuration validation, controller/service/repository ownership, exception mapping, and shutdown hooks.

- [ ] **Step 4: Audit DTO and runtime validation**

Verify transformation, whitelist/unknown field policy, nested values, exact number/date handling, pipe/filter behavior, stable error bodies, and the distinction between TypeScript types and runtime admission.

## 4. Task 3: Modernize SQL, PostgreSQL, Transactions, and Concurrency

**Files:**
- Modify: Chapters 03-05 hubs and all 9 detailed lessons below them

- [ ] **Step 1: Audit relational modeling**

Verify identities, references, history, nullability, uniqueness, checks, foreign keys, cascades, reservation invariants, status constraints, UTC types, integer cents, and database-owned guarantees.

- [ ] **Step 2: Audit migrations and indexes**

Verify forward migration ordering, checksums, expand/contract boundaries, rollback limits, concurrent index implications, selectivity, query plans, and current PostgreSQL syntax. Destructive reversal cannot be the default recovery story.

- [ ] **Step 3: Audit connections and data access**

Verify TLS validation, connection strings/service files, pools, acquisition/query/statement timeouts, parameterized SQL, identifiers versus values, type conversion, SQLSTATE mapping, repository contracts, client ownership, and shutdown.

- [ ] **Step 4: Audit transaction ownership**

Ensure one transaction client flows through every participating repository, all errors roll back, external side effects stay outside the commit boundary or use an outbox, and hidden pool checkout cannot escape the transaction.

- [ ] **Step 5: Audit concurrency**

Verify atomic reservation, check-then-write failure, row locks, optimistic versions, serialization/deadlock retry limits, lock ordering, idempotency, ambiguous outcomes, and a deterministic two-client reproduction with one effective winner.

## 5. Task 4: Modernize Authentication, Authorization, Search, Pagination, and Files

**Files:**
- Modify: Chapters 06-07 hubs and all 6 detailed lessons below them

- [ ] **Step 1: Audit credentials and sessions**

Verify current password-hashing recommendations and tunable parameters, generic login failures, credential lifecycle, opaque session storage, Cookie attributes, rotation, logout, expiry, origin checks, and CSRF.

- [ ] **Step 2: Audit authorization**

Separate authentication, object ownership, role permissions, and database constraints. Verify 401/403/404 anti-enumeration decisions, owner/admin paths, server-side checks, and direct API negative tests.

- [ ] **Step 3: Audit search and pagination**

Verify allow-listed sort keys, escaped patterns, parameterized filters, stable ordering, offset/keyset tradeoffs, cursor integrity, concurrent-change behavior, page metadata, limits, and query-plan evidence.

- [ ] **Step 4: Audit file handling**

Verify streaming upload, byte limits, signature/content checks, generated names, path isolation, malware-scan boundary, safe download headers, cleanup, authorization, orphan handling, and explicit exclusion of production object storage when not implemented.

## 6. Task 5: Modernize Cache, Outbox, Queue, Tests, OpenAPI, and Observability

**Files:**
- Modify: Chapters 08-09 hubs and all 6 detailed lessons below them

- [ ] **Step 1: Audit cache behavior**

Verify cache-aside ownership, key/version design, TTL, invalidation, stale reads, negative caching, stampede control, failure fallback, and the rule that cache never grants authorization.

- [ ] **Step 2: Audit outbox and queues**

Verify database-plus-queue dual-write failure, transactional outbox, claim/lease behavior, duplicate delivery, idempotent handlers, bounded retries, backoff, dead-letter inspection, poison messages, and graceful worker shutdown.

- [ ] **Step 3: Audit test layers**

Verify unit, module, HTTP, repository, migration, real PostgreSQL, authorization, transaction, concurrency, Redis, and queue responsibilities. Tests requiring real infrastructure must not be replaced by in-memory claims.

- [ ] **Step 4: Audit OpenAPI**

Verify current schema syntax and tooling, status/error examples, runtime validation alignment, drift checks, generated-client limits, auth/cookie/CSRF documentation, and pagination/conflict contracts.

- [ ] **Step 5: Audit observability**

Verify structured logs, request/correlation IDs, route templates, metrics with bounded labels, trace context, health/readiness separation, sensitive-data redaction, release correlation, and evidence-driven incident diagnosis.

## 7. Task 6: Modernize the API Capstone

**Files:**
- Modify: `web-fullstack-course/08-backend/10-api-capstone.md`
- Modify: all 4 lessons under `web-fullstack-course/08-backend/10-api-capstone/`

- [ ] **Step 1: Audit workspace, configuration, and migrations**

Verify one exact current dependency combination, ESM/tool config, validated environment, secret placeholders, schema/migration order, least-privilege roles, isolated test database, deterministic fixtures, and startup/shutdown commands.

- [ ] **Step 2: Audit domain, repositories, and services**

Verify integer cents, UTC, runtime parsers, parameterized SQL, transaction-client propagation, conflict/status mapping, object authorization, one-winner reservation, and outbox boundaries.

- [ ] **Step 3: Audit controllers, sessions, and security wiring**

Verify login/session/logout, Cookie attributes, origin/CSRF checks, rate/size limits, error redaction, request IDs, 400/401/403/404/409/503 behavior, and direct unauthorized requests. Request syntax, path/query parameters, and field validation use HTTP 400 with `VALIDATION` or a more specific input code.

- [ ] **Step 4: Audit the acceptance runbook**

Require clean setup, migration, fixture, HTTP, real database, concurrent reservation, authorization, error, shutdown, restart, and cleanup evidence. Separate mandatory local evidence from Redis/queue and external-service extensions.

## 8. Task 7: Apply the Selective-Split Gate

**Files:**
- Audit candidate: `web-fullstack-course/08-backend/10-api-capstone/01-workspace-config-migration-bootstrap.md`
- Conditional modify: this plan before creating or deleting lesson paths

- [ ] **Step 1: Measure and classify the candidate**

Record visible lines, workspace/config/migration ownership, complete files, independent exercises, independent acceptance, and duplication risk.

- [ ] **Step 2: Decide `KEEP-LONG` or `SPLIT`**

Keep the lesson when it is one authoritative scaffold that must be applied atomically. Split only when at least two independent topics can own separate runnable cases and acceptance without copying manifests, migrations, or configuration.

- [ ] **Step 3: Amend exact paths before a split**

For `SPLIT`, add exact child filenames, ownership of every complete file, migration/config sequencing, old-heading destinations, hub/README/matrix changes, extraction updates, and content-conservation checks to this plan before editing.

## 9. Task 8: Reconcile Navigation and Coverage

**Files:**
- Modify: `web-fullstack-course/08-backend/README.md`
- Modify: all 10 chapter hubs
- Modify: `web-fullstack-course/08-backend/BACKEND-COVERAGE.md`

- [ ] **Step 1: Verify route continuity**

Require README → hub → ordered lessons → adjacent lesson/hub → matrix and acceptance links. Keep all stable hub paths.

- [ ] **Step 2: Verify matrix evidence**

Every detailed lesson owns at least one row. Every row links all six teaching dimensions to real headings. Explicit rows must cover cents, UTC, CSRF, object authorization, transaction ownership, idempotency, concurrency, environment evidence, redaction, and graceful shutdown.

- [ ] **Step 3: Record downstream integration changes**

Write exact contract changes needed by `09-fullstack` to `/tmp/web-fullstack-modernization/batch-5/fullstack-follow-up.md`. Batch 6 owns those edits.

## 10. Task 9: Static, Domain, and Runtime Verification

**Files:**
- Test: `web-fullstack-course/08-backend/**/*.md`
- Temporary project: `/tmp/web-fullstack-modernization/batch-5/api-capstone/`
- Modify with observed facts: `web-fullstack-course/VALIDATION.md`

- [ ] **Step 1: Verify lesson structure**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/08-backend")
lessons = sorted(root.glob("[0-9][0-9]-*/*.md"))
assert len(lessons) >= 31, len(lessons)
for path in lessons:
    text = path.read_text()
    visible = re.sub(r"```.*?```", "", text, flags=re.S)
    assert re.findall(r"^## ([0-9]+)\.", visible, flags=re.M) == [str(i) for i in range(1, 14)], path
    for heading in ("## 任务卡", "## 我现在能做到什么", "## 单元导航"):
        assert heading in visible, (path, heading)
    assert sum(line.startswith("```") for line in text.splitlines()) % 2 == 0, path
print(f"Batch 5 lesson structure: PASS ({len(lessons)})")
PY
```

- [ ] **Step 2: Run static checks**

Extract and check TypeScript/JavaScript syntax and compilation, JSON/YAML/OpenAPI parsing, environment templates, SQL parsing or linting, current Nest bootstrap, and all documented configuration files.

- [ ] **Step 3: Run pure domain tests**

Cover cents, UTC, validation errors, pagination cursors, status mapping, authorization decisions, version conflicts, retry bounds, idempotency keys, outbox states, and log redaction without infrastructure.

- [ ] **Step 4: Probe infrastructure before claiming runtime evidence**

Record exact Node, package manager, PostgreSQL server/client, Redis server/client, and queue library versions. Use only isolated local databases and queues.

- [ ] **Step 5: Run real HTTP/PostgreSQL checks when the declared version is available**

Apply migrations, load deterministic fixtures, run API tests, verify authorization directly, reproduce concurrent reservation, inspect persisted rows, test rollback, restart the API, and perform clean shutdown. When the declared database cannot start, record the exact command/error and keep these checks blocked.

- [ ] **Step 6: Run Redis/queue checks when available**

Verify cache failure fallback, stale invalidation, outbox publishing, duplicate delivery, transient retry then success, permanent failure, dead-letter inspection, idempotent effect, and graceful shutdown. Do not infer these from mocks.

- [ ] **Step 7: Run final scans**

Run:

```bash
rg -n -f /tmp/web-fullstack-modernization/batch-5/obsolete-patterns.txt \
  web-fullstack-course || true
find web-fullstack-course/08-backend -type d \
  \( -name node_modules -o -name dist -o -name coverage \) -print
find web-fullstack-course/08-backend -type f \
  \( -name package.json -o -name pnpm-lock.yaml -o -name .env -o -name '*.sql.dump' \) -print
git diff --check
git diff --name-status
```

Expected: zero obsolete hits, zero repository artifacts, zero whitespace errors, and no Batch 5 changes outside the volume, an evidence-backed version baseline correction, and `VALIDATION.md`.

- [ ] **Step 8: Obtain independent review and record evidence**

Require correctness and security review of input validation, SQL, transactions, concurrency, sessions, CSRF, object authorization, files, cache, outbox, queue, observability, environment claims, matrix links, and split decisions. Fix blockers, rerun affected checks until `PROCEED`, update `VALIDATION.md`, stop services, and remove temporary state.
