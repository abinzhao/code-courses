# Web Modernization Batch 6 Full-Stack Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the full-stack integration and delivery volume to current contract, container, proxy, TLS, CI, release, rollback, observability, backup, recovery, and graduation practices without claiming unavailable production evidence.

**Architecture:** Reconcile the current frontend/backend contract first, then audit delivery layers from local integration outward. Static parsers and safety guards run unconditionally; containers, Nginx, PostgreSQL, Redis, TLS, load, backup, restore, and browser journeys run only in isolated local environments with recorded versions. Long operations and graduation lessons pass the selective-split gate before structural changes.

**Tech Stack:** Markdown, Node.js LTS, pnpm, TypeScript, React, Vue, NestJS, PostgreSQL, Redis/queues, Dockerfile, Docker Compose, Nginx, TLS/OpenSSL, CI workflow syntax, Bash, Playwright, Chromium.

---

## 1. Scope and Ownership

**Files:**
- Modify: `web-fullstack-course/09-fullstack/README.md`
- Modify: `web-fullstack-course/09-fullstack/FULLSTACK-COVERAGE.md`
- Modify: all 6 numbered chapter hubs under `web-fullstack-course/09-fullstack/`
- Modify: all 20 existing detailed lessons under the 6 same-named directories
- Modify when evidence changes: `web-fullstack-course/00-guide/02-version-baseline.md`
- Modify with observed evidence only: `web-fullstack-course/VALIDATION.md`
- Temporary only: `/tmp/web-fullstack-modernization/batch-6/`

Do not publish images, trigger hosted CI, deploy, modify DNS, request public certificates, rotate real credentials, run production load, or restore a shared database.

## 2. Task 1: Freeze Inventory, Versions, and Delivery Safety

- [ ] **Step 1: Record worktree and exact inventory**

Run:

```bash
mkdir -p /tmp/web-fullstack-modernization/batch-6
git status --short
rg --files web-fullstack-course/09-fullstack -g '*.md' \
  | sort \
  | tee /tmp/web-fullstack-modernization/batch-6/inventory.txt
```

Expected: 28 Markdown files: 6 hubs, 20 detailed lessons, README, and coverage matrix.

- [ ] **Step 2: Verify lesson distribution**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

root = Path("web-fullstack-course/09-fullstack")
counts = {
    path.name: len(list(path.glob("*.md")))
    for path in sorted(root.glob("[0-9][0-9]-*"))
    if path.is_dir()
}
assert list(counts.values()) == [4, 3, 3, 4, 4, 2], counts
print("Batch 6 lesson inventory: PASS (20)")
PY
```

- [ ] **Step 3: Verify the supported delivery combination**

From official sources, record current stable Dockerfile/BuildKit syntax, Docker Compose specification and CLI, PostgreSQL image/storage behavior, Nginx stable configuration, TLS defaults, Node/pnpm/framework/backend compatibility, CI actions, Bash/OpenSSL assumptions, and current browser/test tooling.

- [ ] **Step 4: Freeze obsolete patterns**

Create `/tmp/web-fullstack-modernization/batch-6/obsolete-patterns.txt`. Inspect obsolete Compose keys/commands, unsupported image tags, old PostgreSQL data paths, removed Nginx directives or TLS protocols, deprecated CI actions, mutable release tags, destructive rollback guidance, stale backup commands, and historical migration prose.

- [ ] **Step 5: Freeze a safety allowlist**

Record exact allowed local hosts, ports, Compose project name, temporary directories, database names, certificate subject names, maximum load duration/concurrency, backup paths, and service-stop commands. Every destructive exercise must reject targets outside this allowlist before performing a write.

## 3. Task 2: Modernize Contract Integration

**Files:**
- Modify: `web-fullstack-course/09-fullstack/01-contract-integration.md`
- Modify: all 4 lessons under `web-fullstack-course/09-fullstack/01-contract-integration/`

- [ ] **Step 1: Audit workspace and contract reconciliation**

Verify structured manifest merging, package exports, one lockfile, current tool compatibility, integer cents, UTC, listing/page/error fields, runtime response validation, and non-destructive integration of both frontends and the API.

- [ ] **Step 2: Audit same-origin session and CSRF client**

Verify Cookie credentials, CSRF restoration, session epochs, non-JSON upstream errors, cancellation, 204 behavior, trusted origins, proxy boundaries, SSR request-local credentials, and exact 401/403/409 handling.

- [ ] **Step 3: Audit React and Vue adapters**

Preserve framework-specific ownership while requiring equal authentication, search, detail, edit, conflict, reserve, favorite, logout, loading, empty, error, and focus behavior.

- [ ] **Step 4: Audit conflict and race behavior**

Verify exact amount parsing, owner checks, optimistic version updates, preserved drafts, explicit reread/adopt flow, late-response suppression, ambiguous network outcomes, and the rule that client abort does not undo a committed server transaction.

## 4. Task 3: Modernize Images, Compose, Nginx, and TLS

**Files:**
- Modify: Chapters 02-03 hubs and all 6 detailed lessons below them

- [ ] **Step 1: Audit image construction**

Verify current multi-stage syntax, root build context, frozen install, workspace deploy/pruning, non-root runtime, read-only behavior, init/signals, `.dockerignore`, build secrets, image metadata/digests, and no secrets/certificates/dumps in layers.

- [ ] **Step 2: Audit Compose topology**

Verify current Compose schema, service DNS, health/readiness, migration one-shot behavior, dependency conditions, restart limits, private networks, loopback-only publishing, resource/log limits, PostgreSQL storage path, stop grace, and persistence.

- [ ] **Step 3: Audit secrets and volumes**

Distinguish local secret mounts from managed encryption, initialization credentials from rotation, volume persistence from backup, API recreation from database recreation, and safe cleanup from destructive volume deletion.

- [ ] **Step 4: Audit web image and SPA behavior**

Verify one validated frontend choice per image, static artifact ownership, missing-asset 404, deep-link fallback, API exclusion, MIME types, immutable hashed assets, revalidated HTML, public build variables, and no secret in browser assets.

- [ ] **Step 5: Audit Nginx proxy and TLS**

Verify current syntax, exact path forwarding, upstream name resolution, forwarding headers, trusted-proxy boundaries, request limits, timeouts, buffering, safe logs, Cookie/Origin/CSRF behavior, TLS protocols/ciphers, HSTS preconditions, CSP derivation, and certificate reload.

- [ ] **Step 6: Audit failure diagnosis**

Cover redirect loops, SPA 404, asset 404/MIME mismatch, API 404, CSRF 403, missing Cookie, 413, 499/timeout, 502, stale upstream DNS, untrusted certificate, hostname mismatch, expired certificate, and private-key permissions.

## 5. Task 4: Modernize CI, Release, and Rollback

**Files:**
- Modify: `web-fullstack-course/09-fullstack/04-ci-release-rollback.md`
- Modify: all 4 lessons under `web-fullstack-course/09-fullstack/04-ci-release-rollback/`

- [ ] **Step 1: Audit local quality gates**

Verify frozen clean installation, package-owned type/test/build commands, migration repeatability, API/database tests, both frontend builds, image/config checks, browser journeys, and negative source inclusion.

- [ ] **Step 2: Audit hosted workflow syntax and security**

Verify current action versions, least permissions, concurrency, timeout, service health, isolated credentials, migration order, artifacts, fork boundaries, secret redaction, and sequential stateful browser journeys.

- [ ] **Step 3: Audit immutable release**

Verify digest-pinned images, split runtime/migration identities, config validation, authorized environment gate, image pull, migration-before-switch, bounded readiness, proxy reload, release evidence, and no local build on the target.

- [ ] **Step 4: Audit rollback and schema evolution**

Verify prior digest/checksum records, application rollback without rerunning old migrations, expand/contract compatibility, delayed contraction, backfill evidence, rollback windows, irreversible-migration review, and the distinction between rollback and backup restore.

- [ ] **Step 5: Preserve external authorization boundaries**

Local static checks and isolated rehearsal are allowed. Hosted workflow runs, registry writes, protected approvals, and deployment remain unverified without explicit authorization and actual run evidence.

## 6. Task 5: Modernize Performance, Observability, Backup, and Recovery

**Files:**
- Modify: `web-fullstack-course/09-fullstack/05-performance-security-operations.md`
- Modify: all 4 lessons under `web-fullstack-course/09-fullstack/05-performance-security-operations/`

- [ ] **Step 1: Audit bounded load and query evidence**

Verify local-target allowlist, duration/concurrency/sample ceilings, timeout, warmup, dataset size, status classes, percentile calculation, hardware/environment declaration, query plans, pool waits, and prohibition on causal overclaims.

- [ ] **Step 2: Audit logs, metrics, traces, and alerts**

Verify allowed/prohibited fields, route-template labels, cardinality bounds, release correlation, disk/image/volume/certificate/outbox/queue monitoring, actionable owners, rotation, retention, and credential-free incident evidence.

- [ ] **Step 3: Audit backup and isolated restore**

Verify protected paths and permissions, partial-file cleanup, current PostgreSQL dump format/options, catalog validation, checksum, atomic rename, retention, restore to a new database, transactional restore where supported, least privilege, business invariants, migration checksum, indexes, API smoke, measured RTO, and explicit RPO.

- [ ] **Step 4: Audit failure drills and credential rotation**

Verify isolated target guards, live/ready behavior, bounded failure, queue/outbox recovery, idempotent replay, database/Redis/disk recovery, staged credential rotation, confirmed new connections, old credential revocation, session revocation, and original evidence retention.

## 7. Task 6: Modernize Graduation Scope and Review

**Files:**
- Modify: `web-fullstack-course/09-fullstack/06-graduation-project.md`
- Modify: both lessons under `web-fullstack-course/09-fullstack/06-graduation-project/`

- [ ] **Step 1: Audit mandatory scope**

Verify domain rules, core business loops, cancellation/confirmation state machine, same-origin security, object authorization, atomic reservation, outbox/idempotency, dual frontend equivalence, delivery artifacts, recovery evidence, and optional-feature boundaries.

- [ ] **Step 2: Audit evidence package**

Require sanitized commands/results for clean install, migrations, API, database assertions, both browser journeys, conflicts, containers, proxy/TLS, release/rollback, backup/restore, accessibility keyboard path, fault drill, and independent change.

- [ ] **Step 3: Audit rubric and vetoes**

Recalculate the 100-point rubric, dimension floors, veto conditions, unearned environment-dependent points, failure/retest history, reviewer reproduction, and the 90-minute independent change.

- [ ] **Step 4: Audit local verifier safety**

Any verifier must allow only isolated local targets, use deterministic test identities, clean its own data, expose failures, and pair API results with database invariants where required.

## 8. Task 7: Apply the Selective-Split Gate

**Files:**
- Audit candidate: `web-fullstack-course/09-fullstack/05-performance-security-operations/03-backup-integrity-isolated-restore.md`
- Audit candidate: `web-fullstack-course/09-fullstack/05-performance-security-operations/04-failure-drills-credential-rotation.md`
- Audit candidate: `web-fullstack-course/09-fullstack/06-graduation-project/01-capstone-scope-business-evidence.md`
- Audit candidate: `web-fullstack-course/09-fullstack/06-graduation-project/02-scoring-review-independent-change.md`
- Conditional modify: this plan before creating or deleting lesson paths

- [ ] **Step 1: Measure visible content and ownership**

Record visible lines, runbook/Capstone ownership, independent topics, independent exercises and acceptance, complete scripts, and duplication risk.

- [ ] **Step 2: Decide each candidate independently**

Keep a long file when it is one restore runbook, incident drill, Capstone scope, or reviewer procedure. Split only when multiple independently executable owners can be separated without copying a complete operations or graduation artifact.

- [ ] **Step 3: Amend exact paths before splitting**

For each `SPLIT`, add exact filenames, safety ownership, complete-script owner, old-heading destinations, hub/README/matrix changes, extraction updates, and content-conservation checks to this plan before editing.

## 9. Task 8: Reconcile Navigation and Coverage

**Files:**
- Modify: `web-fullstack-course/09-fullstack/README.md`
- Modify: all 6 chapter hubs
- Modify: `web-fullstack-course/09-fullstack/FULLSTACK-COVERAGE.md`

- [ ] **Step 1: Verify route continuity**

Require README → hub → ordered lessons → adjacent lesson/hub → matrix and graduation acceptance links.

- [ ] **Step 2: Verify matrix evidence**

Every lesson owns at least one row. Every row links all six teaching dimensions to real headings. Explicit rows must cover contracts, sessions/CSRF, conflicts, containers, migrations, health, TLS, immutable releases, rollback, observability, backup/restore, failure drills, evidence boundaries, and graduation vetoes.

- [ ] **Step 3: Record whole-book corrections**

Write exact cross-volume links, terms, contract references, and final-statistics changes to `/tmp/web-fullstack-modernization/batch-6/final-governance.md` for Batch 7.

## 10. Task 9: Static and Isolated Runtime Verification

**Files:**
- Test: `web-fullstack-course/09-fullstack/**/*.md`
- Temporary stack: `/tmp/web-fullstack-modernization/batch-6/stack/`
- Modify with observed facts: `web-fullstack-course/VALIDATION.md`

- [ ] **Step 1: Verify lesson structure**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/09-fullstack")
lessons = sorted(root.glob("[0-9][0-9]-*/*.md"))
assert len(lessons) >= 20, len(lessons)
for path in lessons:
    text = path.read_text()
    visible = re.sub(r"```.*?```", "", text, flags=re.S)
    assert re.findall(r"^## ([0-9]+)\.", visible, flags=re.M) == [str(i) for i in range(1, 14)], path
    for heading in ("## 任务卡", "## 我现在能做到什么", "## 单元导航"):
        assert heading in visible, (path, heading)
    assert sum(line.startswith("```") for line in text.splitlines()) % 2 == 0, path
print(f"Batch 6 lesson structure: PASS ({len(lessons)})")
PY
```

- [ ] **Step 2: Run unconditional static checks**

Extract and parse TypeScript/TSX/Vue, JSON, YAML, workflow, Dockerfile, Compose, Nginx, OpenAPI, JavaScript, and Bash examples with current available parsers. Run shell syntax and local safety-guard rejection tests.

- [ ] **Step 3: Probe local runtime capabilities**

Record exact Docker/Compose, Nginx, PostgreSQL, Redis, Node, pnpm, OpenSSL, and Chromium versions or command-not-found errors before selecting runtime checks.

- [ ] **Step 4: Run isolated stack checks when available**

Build images, validate Compose, run migration, verify health/readiness/private ports/non-root execution/persistence, validate Nginx, create local certificates, run same-origin API and both frontend browser journeys, and test service stop/recovery.

- [ ] **Step 5: Run operations checks when prerequisites exist**

Within the safety allowlist, run bounded load, query observations, log rotation, backup/catalog/checksum, isolated restore, business invariant/API smoke, database/Redis failure recovery, outbox replay, and local credential/session rotation. Record measured values.

- [ ] **Step 6: Preserve external gaps**

Hosted CI, remote registry, public PKI/ACME, DNS, production release, production load, real incident response, and real disaster recovery remain gaps unless an explicitly authorized actual run occurs.

- [ ] **Step 7: Run final scans**

Run:

```bash
rg -n -f /tmp/web-fullstack-modernization/batch-6/obsolete-patterns.txt \
  web-fullstack-course || true
find web-fullstack-course/09-fullstack -type d \
  \( -name node_modules -o -name dist -o -name coverage \) -print
find web-fullstack-course/09-fullstack -type f \
  \( -name package.json -o -name pnpm-lock.yaml -o -name .env -o -name '*.key' -o -name '*.crt' -o -name '*.dump' \) -print
git diff --check
git diff --name-status
```

Expected: zero obsolete hits, zero repository artifacts, zero whitespace errors, and no Batch 6 changes outside the volume, an evidence-backed version baseline correction, and `VALIDATION.md`.

- [ ] **Step 8: Obtain independent review and record evidence**

Require correctness, security, operations, and evidence review of contracts, containers, proxy/TLS, CI/release, rollback, observability, backup/restore, failure drills, graduation scoring, overclaims, matrix links, and split decisions. Fix blockers, rerun affected checks until `PROCEED`, update `VALIDATION.md`, stop services, and remove temporary state.
