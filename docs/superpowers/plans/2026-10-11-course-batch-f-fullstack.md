# Course Batch F Full-Stack Textbook Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the six full-stack delivery chapters into 20 detailed, evidence-driven lessons with stable chapter hubs, an auditable coverage matrix, and honest local verification for integration, containers, proxying, CI, release, operations, and recovery.

**Architecture:** Preserve every existing numbered Markdown file as a chapter hub and move full teaching content into same-named lesson directories. Keep all application, deployment, certificate, secret, database, and backup artifacts inside the reader's `market` project or `/tmp/full-course-verification/batch-f/`; this repository receives Markdown only. Separate parser and configuration checks, locally executable runtime checks, and external/manual checks so no unavailable production capability is reported as passing.

**Tech Stack:** Markdown, Node.js 24, pnpm 12.10.1, TypeScript 6 compatibility line, React 19.3, Vue 3.5.43, NestJS 12.1.1, PostgreSQL 18, Redis/BullMQ, Docker Engine, Docker Compose v2, Nginx, GitHub Actions, Bash, OpenSSL, Chromium, Playwright.

---

## 1. Scope And Evidence Contract

- Modify only `web-fullstack-course/09-fullstack/**` while executing this batch.
- Keep all six existing numbered files as stable chapter hubs.
- Create exactly 20 detailed lessons: chapters 1, 4, and 5 have four lessons each; chapters 2 and 3 have three each; chapter 6 has two.
- Create exactly one volume matrix: `web-fullstack-course/09-fullstack/FULLSTACK-COVERAGE.md`.
- Rewrite `web-fullstack-course/09-fullstack/README.md` for the new two-level route, verification classes, and final acceptance.
- Do not modify the root course README, root validation record, global coverage map, or another volume; those belong to Batch G.
- Every detailed lesson must implement the 13 numbered sections and the three fixed headings required by the master design.
- Every lesson must include a minimal observable case, a Neighbor Market integration case, an explicit failure, a five-part diagnosis record, three exercise levels, assessable answers, and dated primary references.
- Preserve the course contracts: integer cents, UTC persistence, same-origin Cookie sessions, CSRF, backend object authorization, atomic reservation, and explicit `409` conflict handling.
- Do not add `labs/`, manifests, lock files, source applications, certificates, secrets, dumps, images, container state, or build output to this repository.

## 2. File Map

| Chapter | Detailed lesson path | Single responsibility |
| --- | --- | --- |
| 1 | `web-fullstack-course/09-fullstack/01-contract-integration/01-workspace-contract-runtime-validation.md` | Merge the API, React, Vue, and contracts packages without overwriting manifests; align package names, exports, pnpm version, units, timestamps, status semantics, and runtime response validation. |
| 1 | `web-fullstack-course/09-fullstack/01-contract-integration/02-same-origin-session-csrf-client.md` | Replace demo middleware with the real same-origin proxy; build one browser client for Cookie credentials, CSRF restoration, structured failures, cancellation, and non-JSON upstream errors. |
| 1 | `web-fullstack-course/09-fullstack/01-contract-integration/03-react-vue-auth-data-integration.md` | Adapt the shared client into React Context and Vue Pinia; implement equivalent login, session recovery, logout, loading, error, and identity display behavior without sharing framework components. |
| 1 | `web-fullstack-course/09-fullstack/01-contract-integration/04-edit-conflict-races-end-to-end.md` | Implement integer-cent editing, owner checks, `409` reread/adopt flow, stale-response protection, abort semantics, and equal React/Vue end-to-end acceptance. |
| 2 | `web-fullstack-course/09-fullstack/02-docker-compose/01-multi-stage-image-build-context.md` | Explain image layers and build context; produce the non-root multi-stage API image, `pnpm deploy` runtime, `.dockerignore`, lock-file reproducibility, and image-secret boundary. |
| 2 | `web-fullstack-course/09-fullstack/02-docker-compose/02-compose-services-network-health-migrations.md` | Define PostgreSQL, migration, and API services; teach service DNS, dependency conditions, liveness/readiness, restart behavior, resource limits, and PostgreSQL 18 data layout. |
| 2 | `web-fullstack-course/09-fullstack/02-docker-compose/03-secrets-volumes-persistence-failures.md` | Separate local secrets from encryption claims; prove API recreation persistence, diagnose password/volume/network failures, and distinguish a volume from a backup. |
| 3 | `web-fullstack-course/09-fullstack/03-nginx-https-deployment/01-web-image-spa-static-cache.md` | Build either frontend into the same Nginx runtime; separate SPA fallback from missing assets and API paths; apply safe immutable asset and revalidated HTML caching. |
| 3 | `web-fullstack-course/09-fullstack/03-nginx-https-deployment/02-nginx-proxy-https-same-origin.md` | Configure TLS termination, exact proxy paths, forwarded headers, timeouts, request limits, safe logs, Cookie/Origin/CSRF behavior, and trusted-proxy boundaries. |
| 3 | `web-fullstack-course/09-fullstack/03-nginx-https-deployment/03-compose-tls-certificate-diagnosis.md` | Layer the HTTPS Compose deployment, keep API/database private, manage local versus public certificates, and diagnose 308, 404, 403, 502, stale upstream DNS, and trust failures. |
| 4 | `web-fullstack-course/09-fullstack/04-ci-release-rollback/01-local-quality-gates-clean-install.md` | Define package-owned type, test, build, migration, and browser gates; prove they fail on injected defects and pass after restoration in a clean locked install. |
| 4 | `web-fullstack-course/09-fullstack/04-ci-release-rollback/02-github-actions-database-browser-gates.md` | Build the least-privilege GitHub Actions workflow with PostgreSQL 18, repeatable migration, API/database tests, both frontend builds, image builds, and sequential browser journeys. |
| 4 | `web-fullstack-course/09-fullstack/04-ci-release-rollback/03-immutable-images-release-automation.md` | Separate CI from authorized delivery; compose immutable digest images, split runtime/migration identities, run guarded release steps, reload Nginx, and wait for external readiness. |
| 4 | `web-fullstack-course/09-fullstack/04-ci-release-rollback/04-rollback-expand-contract-evidence.md` | Record prior digests and migration checksums; roll applications back without destructive schema reversal; teach expand/contract compatibility and retain before/after evidence. |
| 5 | `web-fullstack-course/09-fullstack/05-performance-security-operations/01-load-baseline-slow-query.md` | Declare hardware/data/load assumptions, run a bounded local load, calculate percentiles and error classes, inspect query plans and pool waits, and avoid causal overclaims. |
| 5 | `web-fullstack-course/09-fullstack/05-performance-security-operations/02-logs-metrics-alerts-disk.md` | Define safe structured logs, bounded labels, actionable alerts, container rotation, disk/certificate monitoring, and credential-free incident evidence. |
| 5 | `web-fullstack-course/09-fullstack/05-performance-security-operations/03-backup-integrity-isolated-restore.md` | Create a protected PostgreSQL 18 custom dump, verify its catalog and checksum, restore transactionally to a new database, test business invariants, and measure RTO/RPO. |
| 5 | `web-fullstack-course/09-fullstack/05-performance-security-operations/04-failure-drills-credential-rotation.md` | Exercise database, Redis, queue, and disk failures on isolated targets; verify recovery and idempotency; rotate credentials and revoke sessions without hiding the original evidence. |
| 6 | `web-fullstack-course/09-fullstack/06-graduation-project/01-capstone-scope-business-evidence.md` | Define the final workspace, mandatory business loops, cancellation/confirmation rules, optional review boundary, implementation order, external reservation verifier, and evidence package. |
| 6 | `web-fullstack-course/09-fullstack/06-graduation-project/02-scoring-review-independent-change.md` | Apply the 100-point rubric, dimension floors, veto conditions, dual-frontend paths, failure retest, 90-minute independent change, and reproducible reviewer procedure. |

The table is the path contract. Renaming, adding, or removing a detailed lesson requires first reconciling the fixed `4 + 3 + 3 + 4 + 4 + 2 = 20` arithmetic with the master design.

### Task 1: Split Contract Integration Into Four Lessons

**Files:**
- Modify: `web-fullstack-course/09-fullstack/01-contract-integration.md`
- Create: `web-fullstack-course/09-fullstack/01-contract-integration/01-workspace-contract-runtime-validation.md`
- Create: `web-fullstack-course/09-fullstack/01-contract-integration/02-same-origin-session-csrf-client.md`
- Create: `web-fullstack-course/09-fullstack/01-contract-integration/03-react-vue-auth-data-integration.md`
- Create: `web-fullstack-course/09-fullstack/01-contract-integration/04-edit-conflict-races-end-to-end.md`

- [x] **Step 1: Write the workspace and contract lesson**

Explain dry-run migration of the two frontend applications into `market`, structured manifest edits, package exports, one pnpm 12.10.1 lock, TS compatibility boundaries, integer cents, UTC strings, owner/version/status fields, and runtime parsing of untrusted API data. Include failures for destructive copying, missing package scripts, stale lock files, UI-only fields in API types, and mismatched units.

- [x] **Step 2: Write the same-origin browser client lesson**

Provide complete `vite.config.ts`, `packages/contracts/client.ts`, and `browser-api.ts` files. Derive Cookie credential behavior, CSRF token restoration, session generations, `401/403/409`, 204 responses, HTML proxy failures, `AbortSignal`, and why a browser-global token cannot be reused in SSR request handling.

- [x] **Step 3: Write the React and Vue integration lesson**

Provide complete integration changes for React Context, Vue Pinia, both login pages, both `api.ts` adapters, and router entry points. Require equal authentication outcomes and visible states while preserving framework-specific ownership, cancellation, and accessibility behavior.

- [x] **Step 4: Write the conflict and race lesson**

Provide the shared draft parser plus complete React and Vue edit flows. Demonstrate owner denial, integer bounds, successful version advancement, stale request suppression, `409` draft preservation, explicit reread/adopt, ambiguous network outcomes, and the fact that client abort does not roll back a server transaction.

- [x] **Step 5: Rewrite the chapter hub**

Keep only the chapter task, outputs, prerequisites, ordered links to the four lessons, dependency graph, suggested time, one chapter-level Neighbor Market integration task, observable acceptance evidence, and previous/next navigation. State that both frontends run sequentially against the same API origin unless separate API origins are deliberately configured.

- [x] **Step 6: Verify chapter 1**

Extract complete TypeScript/TSX/Vue/config files to `/tmp/full-course-verification/batch-f/chapter-01/`, run the declared package type checks and focused tests in the temporary integrated fixture, then run the five equivalent browser paths for React and Vue. Expected evidence includes real Nest request logs, session restoration, controlled non-JSON errors, owner rejection, and preserved input after `409`.

### Task 2: Split Docker And Compose Into Three Lessons

**Files:**
- Modify: `web-fullstack-course/09-fullstack/02-docker-compose.md`
- Create: `web-fullstack-course/09-fullstack/02-docker-compose/01-multi-stage-image-build-context.md`
- Create: `web-fullstack-course/09-fullstack/02-docker-compose/02-compose-services-network-health-migrations.md`
- Create: `web-fullstack-course/09-fullstack/02-docker-compose/03-secrets-volumes-persistence-failures.md`

- [x] **Step 1: Write the image build lesson**

Provide complete `apps/api/Dockerfile` and `.dockerignore`. Explain root build context, frozen installation, `pnpm deploy`, copied migrations, non-root runtime, read-only expectations, build cache tradeoffs, image digest pinning, and why `.env`, certificates, dumps, and secrets must not enter layers.

- [x] **Step 2: Write the Compose topology lesson**

Provide the complete `compose.yaml` with PostgreSQL 18, migration, and API services. Derive service-name DNS, `depends_on` startup semantics, migration exit behavior, liveness/readiness, loopback-only published API, internal database exposure, `init`, graceful stop, dropped capabilities, log limits, and `/var/lib/postgresql/18/docker`.

- [x] **Step 3: Write the persistence and failure lesson**

Teach local Compose secret mounts without calling them encrypted secret management. Verify API recreation preserves database rows and sessions; inject localhost-as-database-host, wrong health path, changed initialization password, missing migration artifact, and loopback-only application binding. Explain safe role rotation and why deleting a volume is not a repair.

- [x] **Step 4: Rewrite the chapter hub**

Route image construction before topology and topology before persistence. Include Docker/Compose prerequisites, PostgreSQL major-version warning, a chapter integration task that starts a fresh local stack, acceptance evidence for migration/health/persistence, and explicit prohibition of default `docker compose down -v`.

- [x] **Step 5: Verify chapter 2**

Run Dockerfile parser/build checks and Compose configuration checks before starting containers. In an isolated Compose project, require `migrate` exit 0, `db` and `api` healthy, ready 200, database not published, non-root API execution, and successful lookup of a recorded listing after `api` recreation.

### Task 3: Split Nginx And HTTPS Into Three Lessons

**Files:**
- Modify: `web-fullstack-course/09-fullstack/03-nginx-https-deployment.md`
- Create: `web-fullstack-course/09-fullstack/03-nginx-https-deployment/01-web-image-spa-static-cache.md`
- Create: `web-fullstack-course/09-fullstack/03-nginx-https-deployment/02-nginx-proxy-https-same-origin.md`
- Create: `web-fullstack-course/09-fullstack/03-nginx-https-deployment/03-compose-tls-certificate-diagnosis.md`

- [x] **Step 1: Write the web image lesson**

Provide complete `deploy/web.Dockerfile`. Build React or Vue through a validated `WEB_APP` argument, copy only `dist`, and explain why `VITE_*` is public. Demonstrate SPA deep-link fallback, API separation, missing-asset 404, immutable hashed assets, non-cached `index.html`, and MIME failures caused by over-broad fallback.

- [x] **Step 2: Write the Nginx proxy lesson**

Provide complete `deploy/nginx.conf`. Explain TLS termination, full `/api/v1` preservation, `proxy_pass` slash behavior, Origin/Cookie forwarding, trusted forwarded headers, login/register limits, timeouts, safe logs, upstream request IDs, HSTS preconditions, CSP derivation, and the distinction among TLS, CSRF, CORS, and authorization.

- [x] **Step 3: Write the HTTPS Compose and diagnosis lesson**

Provide complete `compose.https.yaml`, including verified `!reset` behavior or a complete standalone-file fallback. Teach local trust versus ACME, private-key mounts, HTTP-01/DNS-01 boundaries, API/database port removal, certificate reload, service-name resolution, and diagnosis for 308, SPA 404, asset 404, API 404, CSRF 403, Cookie absence, 502, and stale upstream IP.

- [x] **Step 4: Rewrite the chapter hub**

Order the route as web artifact, proxy contract, then TLS deployment. Include a React-first and Vue-second chapter task, exact browser-facing origin rules, certificate prerequisites, acceptance for redirect/deep link/API/assets/Cookie/CSRF, and links to the Compose and CI chapters.

- [x] **Step 5: Verify chapter 3**

Run `nginx -t` against the extracted complete config, build both web images, and use a temporary local certificate trusted explicitly by the test client. Verify HTTP 308, TLS hostname validation, ready 200, deep-link 200 HTML, missing asset 404, API failure not becoming HTML, and API stop/recovery behavior. Public trust, ACME renewal, HSTS rollout, and real DNS remain external checks unless actually exercised.

### Task 4: Split CI, Release, And Rollback Into Four Lessons

**Files:**
- Modify: `web-fullstack-course/09-fullstack/04-ci-release-rollback.md`
- Create: `web-fullstack-course/09-fullstack/04-ci-release-rollback/01-local-quality-gates-clean-install.md`
- Create: `web-fullstack-course/09-fullstack/04-ci-release-rollback/02-github-actions-database-browser-gates.md`
- Create: `web-fullstack-course/09-fullstack/04-ci-release-rollback/03-immutable-images-release-automation.md`
- Create: `web-fullstack-course/09-fullstack/04-ci-release-rollback/04-rollback-expand-contract-evidence.md`

- [x] **Step 1: Write the local quality-gate lesson**

Define package-owned `typecheck`, `test`, and `build` scripts, API build/migration/HTTP checks, frozen clean installation, and real source inclusion. Inject one React and one Vue type defect, capture non-zero results, restore the files, and rerun passing gates so an empty or disconnected configuration cannot masquerade as coverage.

- [x] **Step 2: Write the GitHub Actions lesson**

Provide complete `.github/workflows/verify.yml`. Cover minimal permissions, concurrency, timeout, PostgreSQL 18 service health, job-only credentials, repeatable migrations, API/database tests, both frontend gates, both web images, API image, sequential Playwright journeys, artifacts without secrets, fork isolation, and audited action commit pinning for high-trust use.

- [x] **Step 3: Write the immutable release lesson**

Provide complete `compose.release.yaml` and `deploy/release.sh`. Require repository digests, HTTPS site URL, split DML/DDL identities, config validation, image pull, migration-before-switch, no-build startup, Nginx validation/reload, bounded readiness polling, and release evidence containing commit, lock checksum, image digests, migration checksum, and config version.

- [x] **Step 4: Write the rollback lesson**

Teach application rollback to recorded digests without rerunning old migrations or dropping new schema. Work through nullable expansion, dual-read/write or backfill, rollback-window evidence, delayed contraction, irreversible migration review, and why backup restoration is data-loss recovery rather than routine application rollback.

- [x] **Step 5: Rewrite the chapter hub**

Separate CI validation, authorized release, and rollback decisions. Route readers through four lessons, declare required local and external permissions, assign a chapter task that releases and rolls back only an isolated target, and require evidence for a failed migration gate, successful readiness, preserved writes, and old-image compatibility.

- [x] **Step 6: Verify chapter 4**

Parse the workflow, run every job command locally in the temporary fixture, and execute both frontend browser journeys. Run shell syntax and release guard tests without external writes. A hosted Actions run, remote registry promotion, protected environment approval, or real deployment is passing only when an actual authorized run URL and result exist.

### Task 5: Split Performance, Security, And Operations Into Four Lessons

**Files:**
- Modify: `web-fullstack-course/09-fullstack/05-performance-security-operations.md`
- Create: `web-fullstack-course/09-fullstack/05-performance-security-operations/01-load-baseline-slow-query.md`
- Create: `web-fullstack-course/09-fullstack/05-performance-security-operations/02-logs-metrics-alerts-disk.md`
- Create: `web-fullstack-course/09-fullstack/05-performance-security-operations/03-backup-integrity-isolated-restore.md`
- Create: `web-fullstack-course/09-fullstack/05-performance-security-operations/04-failure-drills-credential-rotation.md`

- [x] **Step 1: Write the bounded performance lesson**

Provide complete `ops/load.mjs` with loopback allowlist, concurrency/duration/sample limits, timeout, status classes, and percentiles. Require declared hardware, PostgreSQL version, 10,000 synthetic rows, warmup, public-list ratio, and the teaching threshold. Explain closed-loop limitations, `EXPLAIN (ANALYZE, BUFFERS)`, waits, pool pressure, cursor pagination, and why a fast empty database proves little.

- [x] **Step 2: Write the observability lesson**

Define allowed and prohibited log fields, route-template metrics, bounded labels, release version correlation, rotation, disk/volume/image monitoring, certificate-expiry alerts, outbox age, queue failures, and an action owner for every alert. Include a controlled log-directory exhaustion experiment that never deletes WAL, database files, or retained backups.

- [x] **Step 3: Write the backup and restore lesson**

Provide complete `ops/backup.sh` using `PGSERVICE`, protected permissions, partial-file cleanup, custom format, catalog validation, atomic rename, and SHA-256. Restore to a newly created `market_restore_test` with `--single-transaction`, reapply least privileges, test counts, cents, owners, reservation uniqueness, migration checksums, indexes, API smoke, and measured RTO/RPO.

- [x] **Step 4: Write the failure and rotation lesson**

Stop only the isolated database and Redis services, verify live/ready separation, bounded API failure, outbox recovery, idempotent replay, and service restoration. Teach staged credential rotation, confirmed new connections, old credential revocation, session revocation, audit evidence, and the limits of database restore for leaked sessions or external side effects.

- [x] **Step 5: Rewrite the chapter hub**

Order performance evidence before alerts, restore proof, and fault recovery. Include test-only safety prerequisites, the declared teaching threshold, a chapter incident exercise, evidence for p95/errors/waits/RTO/RPO/idempotency, and a clear ban on production load or destructive restore.

- [x] **Step 6: Verify chapter 5**

Run Node and Bash syntax checks first. On the isolated stack, run the bounded load, query-plan observations, backup, catalog/checksum validation, restore to the new database, temporary API smoke, database failure, Redis replay, and log rotation checks. Record measured values rather than copying expected values from the lesson.

### Task 6: Split The Graduation Project Into Two Lessons

**Files:**
- Modify: `web-fullstack-course/09-fullstack/06-graduation-project.md`
- Create: `web-fullstack-course/09-fullstack/06-graduation-project/01-capstone-scope-business-evidence.md`
- Create: `web-fullstack-course/09-fullstack/06-graduation-project/02-scoring-review-independent-change.md`

- [x] **Step 1: Write the capstone scope and evidence lesson**

Define the final workspace, immutable domain rules, required business loops, cancellation/confirmation state machine, outbox reliability, dual-frontend states, delivery artifacts, and optional review feature. Provide complete `evidence/verify-reservation.mjs`, restrict it to local targets, explain test-data cleanup, and specify the sanitized evidence package.

- [x] **Step 2: Write the scoring and independent-change lesson**

Preserve the 100-point table, simultaneous dimension floors, all eight veto conditions, optional five-point report, five dual-frontend paths, failure/retest history, random fault drill, and 90-minute independent change. Define how reviewers reproduce cold install, database assertions, browser journeys, container delivery, rollback, restore, and accessibility keyboard checks.

- [x] **Step 3: Rewrite the chapter hub**

Route implementation evidence before assessment. State prerequisites, estimated review time, mandatory versus optional scope, one complete graduation task, exact pass floors, evidence retention rules, remediation flow, and navigation back to the volume route and course-level assessment.

- [x] **Step 4: Verify chapter 6**

Run the external reservation verifier against only the isolated test API and pair it with a database assertion for one effective reservation. Recalculate the rubric from recorded results, confirm every veto item is absent, and mark Docker, browser, Redis, hosted CI, or recovery dimensions unearned when their evidence was not executed.

### Task 7: Build Volume Navigation And Coverage

**Files:**
- Modify: `web-fullstack-course/09-fullstack/README.md`
- Create: `web-fullstack-course/09-fullstack/FULLSTACK-COVERAGE.md`

- [x] **Step 1: Rewrite the volume README**

List all six chapter hubs and all 20 detailed lessons in order. Add prerequisites, version matrix, Neighbor Market topology, local-only artifact rule, static/runtime/external verification legend, security and secret-handling boundaries, estimated route, and final acceptance links. Do not update whole-book counts in this batch.

- [x] **Step 2: Create the coverage matrix**

Use the exact columns:

```text
ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收
```

Use unique continuous IDs within these prefixes:

- `FS-CONTRACT`: workspace, units, runtime validation, session, CSRF, errors, framework adapters, conflicts, cancellation.
- `FS-CONTAINER`: image layers, context, lock file, Compose network, migration, health, secrets, PostgreSQL 18 layout, persistence.
- `FS-EDGE`: web image, SPA fallback, cache, proxy paths, forwarded headers, TLS, certificates, Cookie/Origin, failure diagnosis.
- `FS-DELIVERY`: local gates, workflow security, database/browser CI, immutable images, release, readiness, rollback, expand/contract.
- `FS-OPS`: bounded load, query plans, logs, metrics, alerts, disk, backup, restore, RTO/RPO, fault drills, credential rotation.
- `FS-CAPSTONE`: business closure, concurrent reservation, dual frontends, evidence package, scoring, vetoes, remediation, independent change.
- `FS-BOUNDARY`: mock/static labels, local-only targets, hosted CI, registry, public PKI, production capacity, real disaster recovery, manual accessibility.

Every detailed lesson must be the primary tutorial for at least one row. Every evidence cell must link to a real heading in that lesson; status words alone do not count as evidence.

- [x] **Step 3: Verify navigation and matrix integrity**

Check that the README reaches every hub, lesson, and matrix; every hub reaches its lessons and adjacent chapters; every lesson reaches its hub and neighbors; every matrix link resolves; every ID is unique; and each row has all six evidence dimensions.

### Task 8: Run Structural And Static Verification

**Files:**
- Test: `web-fullstack-course/09-fullstack/**/*.md`
- Temporary only: `/tmp/full-course-verification/batch-f/`

- [x] **Step 1: Verify the exact lesson inventory and heading contract**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/09-fullstack")
expected = {
    "01-contract-integration": [
        "01-workspace-contract-runtime-validation.md",
        "02-same-origin-session-csrf-client.md",
        "03-react-vue-auth-data-integration.md",
        "04-edit-conflict-races-end-to-end.md",
    ],
    "02-docker-compose": [
        "01-multi-stage-image-build-context.md",
        "02-compose-services-network-health-migrations.md",
        "03-secrets-volumes-persistence-failures.md",
    ],
    "03-nginx-https-deployment": [
        "01-web-image-spa-static-cache.md",
        "02-nginx-proxy-https-same-origin.md",
        "03-compose-tls-certificate-diagnosis.md",
    ],
    "04-ci-release-rollback": [
        "01-local-quality-gates-clean-install.md",
        "02-github-actions-database-browser-gates.md",
        "03-immutable-images-release-automation.md",
        "04-rollback-expand-contract-evidence.md",
    ],
    "05-performance-security-operations": [
        "01-load-baseline-slow-query.md",
        "02-logs-metrics-alerts-disk.md",
        "03-backup-integrity-isolated-restore.md",
        "04-failure-drills-credential-rotation.md",
    ],
    "06-graduation-project": [
        "01-capstone-scope-business-evidence.md",
        "02-scoring-review-independent-change.md",
    ],
}
lessons = []
for directory, names in expected.items():
    actual = sorted(path.name for path in (root / directory).glob("*.md"))
    assert actual == names, (directory, actual)
    lessons.extend(root / directory / name for name in names)
assert len(lessons) == 20
for lesson in lessons:
    text = lesson.read_text()
    visible = re.sub(r"```.*?```", "", text, flags=re.S)
    assert re.findall(r"^## ([0-9]+)\.", visible, flags=re.M) == [
        str(number) for number in range(1, 14)
    ], lesson
    for heading in ("## 任务卡", "## 我现在能做到什么", "## 单元导航"):
        assert heading in visible, (lesson, heading)
    assert text.count("```") % 2 == 0, lesson
print("Batch F lesson contract: PASS (20 lessons)")
PY
```

Expected: `Batch F lesson contract: PASS (20 lessons)`.

- [x] **Step 2: Verify relative links, unfinished markers, and whitespace**

Run the master relative-link checker, then:

```bash
rg -n '\b(TO[D]O|TB[D]|FIX[M]E|WI[P])\b|待完[善]|自行补[充]|占位[符]' \
  web-fullstack-course/09-fullstack || true
git diff --check -- web-fullstack-course/09-fullstack
```

Expected: both commands produce no findings.

- [x] **Step 3: Extract complete examples to the temporary fixture**

Create `/tmp/full-course-verification/batch-f/market` from code blocks explicitly labelled as complete files. Preserve each declared relative path, reject duplicate paths with differing contents, and keep generated credentials, certificates, Compose state, databases, dumps, and logs under the temporary root.

- [x] **Step 4: Run language and configuration checks**

From the extracted fixture, run:

```bash
node --check scripts/integrate-workspace.mjs
node --check ops/load.mjs
node --check evidence/verify-reservation.mjs
bash -n deploy/release.sh
bash -n ops/backup.sh
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/verify.yml", aliases: true); puts "workflow YAML: PASS"'
```

Also run the declared TypeScript/TSX/Vue checks in the fixed temporary workspace, `docker buildx build --check` for both Dockerfiles when BuildKit supports it, and an available Dockerfile linter as a supplementary check. Parser success does not prove runtime behavior.

- [x] **Step 5: Validate Compose and Nginx statically**

Use generated test-only secret files in the temporary root and syntactically valid validation-only digest strings. Run:

```bash
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml -f compose.https.yaml config --quiet
API_IMAGE="registry.example.test/market-api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" \
WEB_IMAGE="registry.example.test/market-web@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" \
  docker compose -f compose.yaml -f compose.https.yaml -f compose.release.yaml config --quiet
docker run --rm \
  -v "$PWD/deploy/nginx.conf:/etc/nginx/nginx.conf:ro" \
  nginx:stable-bookworm nginx -t
```

Expected: all available parsers exit 0. The digest strings validate interpolation and shape only and must never be pulled or reported as deployable images.

### Task 9: Run Available Local Runtime Verification

**Files:**
- Test: extracted files under `/tmp/full-course-verification/batch-f/market`
- Evidence: `/tmp/full-course-verification/batch-f/evidence`

**Execution note (2026-10-11):** The local machine had Node 24, pnpm, OpenSSL, and Chromium, but no
Docker/Compose or Nginx binary and only PostgreSQL 16 clients. The steps below are checked as handled:
available static checks, local guards, certificate checks, and fake-inspect rejection tests passed; Docker,
PostgreSQL 18, real proxy/browser integration, hosted CI, registry, rollout, and disaster-recovery execution
remain explicitly blocked or external in the lessons and final validation record. A checked item does not
reclassify an unavailable runtime as passing.

- [x] **Step 1: Record the environment before execution**

Capture OS, CPU/memory, Node, pnpm, Docker client/server, Compose, OpenSSL, PostgreSQL client, Nginx, Chromium, and Playwright versions. Classify each following check as executed-pass, executed-fail, blocked-by-tool, blocked-by-environment, or external-not-authorized.

- [x] **Step 2: Verify the container stack and persistence**

Build the API image, start the isolated database/migration/API stack, wait for health, and verify migration idempotency. Create synthetic accounts and one listing, record its ID and session behavior, force-recreate only the API service, then prove the listing and unexpired session still exist. Confirm database ports are absent and the API process is non-root.

- [x] **Step 3: Verify Nginx and local TLS**

Generate a two-day local certificate with `market.example.test` in the SAN under the temporary secrets directory. Trust it only through the test client's explicit CA option or a documented local trust tool. Use a temporary Compose verification override that binds loopback high ports and sets the exact external origin, then verify redirect, hostname-aware TLS, SPA deep link, missing asset, API proxy, React build, Vue build, Cookie attributes, CSRF, and upstream stop/recovery.

Do not use an insecure TLS bypass as certificate-success evidence. Explicit local trust does not prove public CA issuance, automatic renewal, HSTS safety, real DNS, or production browser trust.

- [x] **Step 4: Reproduce the CI commands locally**

In a fresh temporary checkout/fixture, run frozen installation, API build, two migrations, HTTP/database tests, React typecheck/test/build, Vue typecheck/test/build, both browser journey suites, API image build, and both web image builds. If a compatible local Actions runner is installed, run the `verify` job as supplementary evidence; only the actual hosted run can prove GitHub runner permissions, service behavior, cache behavior, and protected-environment controls.

- [x] **Step 5: Verify release guards without external delivery**

Prove the release script exits non-zero when an image is missing, when either image is a mutable tag, and when `SITE_URL` is not HTTPS. Validate the release Compose overlay and shell trace with redacted synthetic values. A positive release run may target only an explicitly created loopback registry and isolated Compose project; never push to an organization registry, trigger hosted delivery, or contact a production host during this batch.

- [x] **Step 6: Verify backup and isolated restore**

Use PostgreSQL 18 client tools, either on the host or in a temporary client container attached to the isolated Compose network. Run `ops/backup.sh` against synthetic data, validate the custom dump catalog and checksum, restore with `--single-transaction` into a newly created `market_restore_test`, reapply least privileges, run business invariant queries and temporary API smoke, and record measured RTO/RPO. Never use `--clean`, overwrite an existing database, or treat checksum success alone as recoverability.

- [x] **Step 7: Verify bounded load and failure recovery**

Run the loopback-only load first at concurrency 1, then at 10 for 60 seconds with at least 10,000 synthetic listings. Record status counts, network errors, p50/p95/p99, query plans, and waits. Stop only the isolated database and Redis services in turn; verify live/ready distinction, controlled errors, outbox recovery, idempotent replay, and post-recovery business invariants.

- [x] **Step 8: Preserve honest gaps and remove temporary state**

Record Safari, Firefox, real assistive technology, public DNS/PKI, ACME renewal, hosted CI, remote registry promotion, cloud deployment, production capacity, production credential rotation, and real disaster recovery as unverified unless actual authorized evidence exists. After evidence review, stop the isolated stack without deleting unrelated volumes, remove only the named temporary verification root and its synthetic secrets, and retain no dump or private key in the repository.

### Task 10: Review Security And Operational Boundaries

**Files:**
- Review: `web-fullstack-course/09-fullstack/**/*.md`

- [x] Confirm every load, failure, release, rollback, backup, and restore command names an isolated or local target and states its destructive boundary.
- [x] Confirm no command defaults to a public host, production database, external registry, remote deployment, workflow dispatch, `docker compose down -v`, blind schema reversal, or restore over an existing database.
- [x] Confirm examples contain no real password, token, Cookie, CSRF value, private key, connection string, user data, registry credential, or organization endpoint.
- [x] Confirm Docker build contexts exclude secrets, certificates, dumps, logs, and environment files; runtime examples use non-root, least privilege, private database/API networking, and bounded logs.
- [x] Confirm authentication, object authorization, CSRF, CORS, TLS, CSP, rate limits, trusted proxies, and input validation are described as separate controls.
- [x] Confirm runtime, migration, backup, and restore database identities have distinct minimum privileges and that rotation includes cutover, revocation, and audit.
- [x] Confirm CI forks and unreviewed code cannot receive deployment credentials; high-trust actions require reviewed immutable revisions.
- [x] Confirm every expected result is labelled as expected until observed, and every blocked check remains a gap rather than a pass.

### Task 11: Commit In Four Scoped Boundaries

Do not commit until the files in that boundary pass their chapter structure, links, fences, example checks, and applicable runtime checks. Never use `git add -A`, never stage another volume, and never push from this batch.

- [x] **Commit 1: Contract integration and containers**

```bash
git add \
  web-fullstack-course/09-fullstack/01-contract-integration.md \
  web-fullstack-course/09-fullstack/01-contract-integration \
  web-fullstack-course/09-fullstack/02-docker-compose.md \
  web-fullstack-course/09-fullstack/02-docker-compose
git diff --cached --check
git diff --cached --name-only
git commit -m "docs: expand full-stack integration and containers"
```

The staged list must contain exactly two hubs and seven detailed lessons.

- [x] **Commit 2: Edge deployment and delivery**

```bash
git add \
  web-fullstack-course/09-fullstack/03-nginx-https-deployment.md \
  web-fullstack-course/09-fullstack/03-nginx-https-deployment \
  web-fullstack-course/09-fullstack/04-ci-release-rollback.md \
  web-fullstack-course/09-fullstack/04-ci-release-rollback
git diff --cached --check
git diff --cached --name-only
git commit -m "docs: expand full-stack proxy and delivery"
```

The staged list must contain exactly two hubs and seven detailed lessons.

- [x] **Commit 3: Operations and assessment**

```bash
git add \
  web-fullstack-course/09-fullstack/05-performance-security-operations.md \
  web-fullstack-course/09-fullstack/05-performance-security-operations \
  web-fullstack-course/09-fullstack/06-graduation-project.md \
  web-fullstack-course/09-fullstack/06-graduation-project
git diff --cached --check
git diff --cached --name-only
git commit -m "docs: expand full-stack operations and assessment"
```

The staged list must contain exactly two hubs and six detailed lessons.

- [x] **Commit 4: Volume navigation and coverage**

```bash
git add \
  web-fullstack-course/09-fullstack/README.md \
  web-fullstack-course/09-fullstack/FULLSTACK-COVERAGE.md
git diff --cached --check
git diff --cached --name-only
git commit -m "docs: add full-stack coverage evidence"
```

The staged list must contain exactly the volume README and coverage matrix.

### Task 12: Final Batch Audit

- [x] Verify exactly six chapter hubs, 20 detailed lessons, one volume README, and one coverage matrix are in Batch F scope.
- [x] Verify the fixed chapter arithmetic is `4 + 3 + 3 + 4 + 4 + 2 = 20`.
- [x] Run the full lesson-structure, relative-link, matrix-ID, code-fence, unfinished-marker, and whitespace checks.
- [x] Re-run all statically available Dockerfile, Compose, Nginx, workflow, shell, JavaScript, TypeScript, TSX, and Vue checks.
- [x] Re-run the representative local container, proxy, dual-frontend, release-guard, backup/restore, load, and failure-recovery paths affected by final corrections.
- [x] Compare each master-design requirement with a chapter, lesson, matrix row, or explicit external gap.
- [x] Review `git show --stat` for the four commits and confirm no path outside `web-fullstack-course/09-fullstack/**` was committed.
- [x] Confirm the work remains local: no remote push, deployment, hosted workflow trigger, external registry write, cloud resource, or production data operation.
- [x] Request an independent review with file and line references; fix every blocking correctness, safety, navigation, and evidence issue, then rerun affected checks.

Final expected evidence:

```text
20 detailed full-stack lessons
6 rewritten chapter hubs
1 FULLSTACK-COVERAGE.md with unique IDs and complete evidence links
1 rewritten volume README
0 broken relative links
0 unfinished markers
0 whitespace errors
0 repository application, secret, certificate, dump, package, lock, or build artifacts
all available static checks passing
all executed local runtime checks recorded with observed results
all unavailable external and manual checks explicitly unverified
4 scoped local commits, 0 remote pushes
```
