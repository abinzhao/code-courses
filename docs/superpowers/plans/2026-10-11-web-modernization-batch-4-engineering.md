# Web Modernization Batch 4 Engineering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the engineering volume to one current, reproducible Node/pnpm/Vite/TypeScript/Lint/test/build/CI toolchain and prove that each quality gate detects a real defect.

**Architecture:** Verify the compatible toolchain before modifying commands or configuration. Audit the seven chapters in dependency order, reconstruct the single Capstone in a clean temporary workspace, execute positive and negative gates, and update `SELF-CHECK.md` only from observed output. Apply the selective-split gate to long Capstone lessons without fragmenting their single project ownership.

**Tech Stack:** Markdown, Node.js LTS, pnpm, Vite, TypeScript, ESLint flat config, Prettier, Vitest, Playwright, Chromium, Git and CI workflow syntax.

---

## 1. Scope and Ownership

**Files:**
- Modify: `web-fullstack-course/07-engineering/README.md`
- Modify: `web-fullstack-course/07-engineering/ENGINEERING-COVERAGE.md`
- Modify: `web-fullstack-course/07-engineering/SELF-CHECK.md`
- Modify: all 7 numbered chapter hubs under `web-fullstack-course/07-engineering/`
- Modify: all existing detailed lessons under the 7 same-named chapter directories
- Modify when evidence changes: `web-fullstack-course/00-guide/02-version-baseline.md`
- Modify with observed evidence only: `web-fullstack-course/VALIDATION.md`
- Temporary only: `/tmp/web-fullstack-modernization/batch-4/`

No manifest, lock file, installed dependency, source application, build output, report, browser binary, or CI artifact may be added to the repository.

## 2. Task 1: Freeze Inventory and Toolchain Compatibility

- [ ] **Step 1: Record worktree and volume inventory**

Run:

```bash
mkdir -p /tmp/web-fullstack-modernization/batch-4
git status --short
rg --files web-fullstack-course/07-engineering -g '*.md' \
  | sort \
  | tee /tmp/web-fullstack-modernization/batch-4/inventory.txt
```

Expected: 32 Markdown files: 7 hubs, 22 detailed lessons, README, matrix, and self-check.

- [ ] **Step 2: Verify detailed-lesson distribution**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

root = Path("web-fullstack-course/07-engineering")
counts = {
    path.name: len(list(path.glob("*.md")))
    for path in sorted(root.glob("[0-9][0-9]-*"))
    if path.is_dir()
}
assert list(counts.values()) == [3, 3, 3, 3, 3, 3, 4], counts
print("Batch 4 lesson inventory: PASS (22)")
PY
```

- [ ] **Step 3: Verify one compatible toolchain from primary sources**

Record exact stable versions, engine constraints, peer dependencies, and interoperability for Node, pnpm, Vite, TypeScript CLI/compiler APIs, ESLint/parser/plugins, Prettier, Vitest, Playwright, Chromium, and CI actions. Do not choose each latest version independently when the combination cannot run.

- [ ] **Step 4: Decide the TypeScript compatibility boundary**

Keep a second compiler/API only when current supported tooling requires it. Record the exact package aliases, executable names, internal compiler versions, and scripts. Otherwise remove the secondary path from all lessons and the baseline.

- [ ] **Step 5: Freeze obsolete patterns**

Create `/tmp/web-fullstack-modernization/batch-4/obsolete-patterns.txt`. At minimum inspect unsupported Node/pnpm versions, old Vite configuration names, `.eslintrc*`, `.eslintignore`, removed ESLint CLI flags, obsolete TypeScript options, stale test APIs, deprecated CI action majors, old Playwright install commands, and historical migration prose.

## 3. Task 2: Modernize Package, Build, Type, Lint, and Format Foundations

**Files:**
- Modify: Chapters 01-03 hubs and all 9 detailed lessons below them

- [ ] **Step 1: Audit Node, pnpm, manifests, and lockfiles**

Verify `packageManager`, engines, dependency ownership, generated lockfile behavior, frozen install, workspace location, content-addressed store, lifecycle scripts, trusted dependencies, cleanup, and permission-safe recovery.

- [ ] **Step 2: Audit Vite and ESM**

Verify current Vite entry/development/build/preview behavior, current production bundler terminology and config keys, browser/Node ESM boundaries, resource imports, resolution, strict ports, `base`, and development-versus-production evidence.

- [ ] **Step 3: Audit TypeScript commands**

Verify current compiler package names, script ownership, strict settings, browser/Node resolution, declaration behavior, old compiler-API consumers if any, version probes, and failure diagnostics. Vite transpilation must never count as type checking.

- [ ] **Step 4: Audit Prettier and ESLint**

Verify current format scope, ignore behavior, generated-file boundaries, ESLint flat configuration, global ignores, file scopes, parser/plugin compatibility, type-aware rule setup, `--print-config`, suppression limits, and Prettier integration order.

- [ ] **Step 5: Audit quality-gate composition**

Keep format, Lint, primary typecheck, compatibility typecheck if required, tests, build, browser checks, and budget as named independent gates. Each must have an exact non-zero failure example and restoration command.

- [ ] **Step 6: Audit build assets and budgets**

Verify current chunk configuration, dynamic imports, targets, public client variables, Source Map risk, root/subpath base paths, hashed-resource caching, HTML revalidation, release order, production preview, gzip/raw measurements, and first-load versus total-JavaScript distinctions.

## 4. Task 3: Modernize Workspaces and Package Contracts

**Files:**
- Modify: `web-fullstack-course/07-engineering/04-workspace-component-library.md`
- Modify: all lessons under `web-fullstack-course/07-engineering/04-workspace-component-library/`

- [ ] **Step 1: Audit workspace graph**

Verify workspace membership, root/package manifests, filters, `workspace:*`, dependency declarations, one lockfile, dependency direction, cycle detection, and package-local scripts.

- [ ] **Step 2: Audit exports and publish boundaries**

Verify public `exports`, deep-import rejection, source-consumed versus compiled packages, declarations, CSS output, peer dependencies, clean-consumer tests, and runtime parser ownership.

- [ ] **Step 3: Audit cross-framework contracts and tokens**

Keep environment-neutral domain contracts and semantic visual tokens shared; keep React/Vue lifecycle and state models separate. Verify theme contrast, forced colors, and current design-token usage through browser evidence.

## 5. Task 4: Modernize Test Layers

**Files:**
- Modify: `web-fullstack-course/07-engineering/05-unit-integration-e2e.md`
- Modify: all lessons under `web-fullstack-course/07-engineering/05-unit-integration-e2e/`

- [ ] **Step 1: Audit unit tests**

Verify current Vitest APIs, integer-cent and UTC boundaries, parser contradictions, duplicate IDs, input immutability, independent expected values, and an observed red/green defect.

- [ ] **Step 2: Audit integration tests**

Verify real `Response` handling, HTTP failures, query encoding, credentials, `AbortSignal`, runtime parsing, deterministic deferred promises, stale-result guards, disposal, and absence of arbitrary timing sleeps.

- [ ] **Step 3: Audit E2E tests**

Verify current Playwright configuration, strict-port production preview, role/name locators, automatic assertions, exact Chromium provisioning, traces retained only on failure, privacy boundaries, and recovery after injected failures.

- [ ] **Step 4: Audit test responsibility**

Map each rule to the smallest sufficient test layer. A route mock or teaching API cannot prove authentication, database transaction, production cache, release, or recovery.

## 6. Task 5: Modernize Git, CI, Artifact, and Release Teaching

**Files:**
- Modify: `web-fullstack-course/07-engineering/06-ci-git-release.md`
- Modify: all lessons under `web-fullstack-course/07-engineering/06-ci-git-release/`

- [ ] **Step 1: Audit Git scope**

Verify working tree/index/commit/branch/worktree boundaries, exact path staging, ignored/generated content, reviewable changes, conflict understanding, and non-destructive recovery. Mutation exercises must use disposable learner repositories.

- [ ] **Step 2: Audit CI workflow**

Verify current action versions, least permissions, trusted/untrusted contribution boundaries, frozen installation, tool probes, matching browser, timeout, concurrency, named gates, artifact scope, cache keys, and no secret-bearing output.

- [ ] **Step 3: Audit artifact and release boundaries**

Separate check, artifact, deployment, release, and rollback. Bind artifacts to commits, retain old hashed assets, define upload order and post-release checks, and state that frontend rollback cannot reverse database writes.

- [ ] **Step 4: Preserve authorization boundaries**

This batch statically validates workflow teaching and runs commands locally. It does not trigger hosted CI, push artifacts, publish packages, or deploy.

## 7. Task 6: Modernize the Engineering Capstone

**Files:**
- Modify: `web-fullstack-course/07-engineering/07-engineering-capstone.md`
- Modify: all 4 lessons under `web-fullstack-course/07-engineering/07-engineering-capstone/`

- [ ] **Step 1: Audit the scaffold owner**

Verify one exact file tree, one compatible dependency combination, one generated lockfile, complete scripts, TypeScript/Lint/format configuration, ignore rules, integer-cent and UTC contracts, and no duplicated complete file.

- [ ] **Step 2: Audit domain, app, and teaching API**

Verify external JSON parsing, safe DOM rendering, valid/delayed/empty/error/invalid responses, cancellation plus generation checks, state recovery, and explicit local-only/non-production boundaries.

- [ ] **Step 3: Audit tests, build, budget, and browser ownership**

Verify complete current configurations and source ownership for Vitest, Playwright, Vite build, budget script, and aggregate verification. Every gate must fail for its own injected defect.

- [ ] **Step 4: Audit clean-room evidence instructions**

Require fresh extraction, generated lock review, frozen reinstall, exact tool probes, positive and negative gates, service cleanup, and classification as observed pass, observed failure/recovery, environment block, or manual gap.

## 8. Task 7: Apply the Selective-Split Gate

**Files:**
- Audit candidate: `web-fullstack-course/07-engineering/07-engineering-capstone/02-capstone-domain-app-teaching-api.md`
- Audit candidate: `web-fullstack-course/07-engineering/07-engineering-capstone/03-capstone-tests-build-budget-browser.md`
- Conditional modify: this plan before creating or deleting lesson paths

- [ ] **Step 1: Measure visible lines and ownership**

Record each candidate's visible lines, complete-file owners, independent topics, exercises, acceptance, and duplication risk.

- [ ] **Step 2: Decide against the design criteria**

Keep a long lesson when it is the single source owner for an inseparable Capstone slice. Split only if independent topics and independent acceptance can move without duplicating the project snapshot.

- [ ] **Step 3: Amend exact split paths before content changes**

For a qualifying split, add exact child filenames, ownership of every complete file, old-heading destinations, hub/README/matrix changes, extraction changes, and content-conservation checks to this plan first.

## 9. Task 8: Reconcile Navigation, Matrix, and Self-Check

**Files:**
- Modify: `web-fullstack-course/07-engineering/README.md`
- Modify: all 7 chapter hubs
- Modify: `web-fullstack-course/07-engineering/ENGINEERING-COVERAGE.md`
- Modify after execution: `web-fullstack-course/07-engineering/SELF-CHECK.md`

- [ ] **Step 1: Verify all routes and matrix evidence**

Require README → hub → lessons → adjacent route → matrix and acceptance links. Every lesson owns a matrix row; every row links all six evidence dimensions; all IDs are unique.

- [ ] **Step 2: Remove stale evidence before the new run**

In `SELF-CHECK.md`, preserve prior results only when clearly labelled historical. Do not present a previous dependency graph, lock resolution, or browser run as current.

- [ ] **Step 3: Populate the self-check from observed output**

Record exact tool versions, commands, exit codes, test counts, bundle sizes, browser scenarios, failure injections, environment blocks, and cleanup. Expected outputs from lessons are not observed evidence.

## 10. Task 9: Clean-Room Verification

**Files:**
- Test: `web-fullstack-course/07-engineering/**/*.md`
- Temporary project: `/tmp/web-fullstack-modernization/batch-4/market-engineering-capstone/`
- Modify with observed facts: `web-fullstack-course/VALIDATION.md`

- [ ] **Step 1: Verify lesson structure**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/07-engineering")
lessons = sorted(root.glob("[0-9][0-9]-*/*.md"))
assert len(lessons) >= 22, len(lessons)
for path in lessons:
    text = path.read_text()
    visible = re.sub(r"```.*?```", "", text, flags=re.S)
    assert re.findall(r"^## ([0-9]+)\.", visible, flags=re.M) == [str(i) for i in range(1, 14)], path
    for heading in ("## 任务卡", "## 我现在能做到什么", "## 单元导航"):
        assert heading in visible, (path, heading)
    assert sum(line.startswith("```") for line in text.splitlines()) % 2 == 0, path
print(f"Batch 4 lesson structure: PASS ({len(lessons)})")
PY
```

- [ ] **Step 2: Reconstruct and install**

Extract every authoritative complete Capstone file to the temporary project, generate the lockfile, review the resolved versions, remove installation output, and perform a frozen reinstall.

- [ ] **Step 3: Run positive gates**

Run exact version probes, format check, ESLint, primary TypeScript, compatibility TypeScript when required, unit/integration tests, production build, recursive raw/gzip budget, production-preview E2E, and the aggregate command.

- [ ] **Step 4: Run negative gates**

Inject and restore one lock drift, formatting error, Lint error, primary type error, compatibility type error when applicable, amount bug, parser bug, stale-result bug, budget failure, unresolved import, occupied port, and browser assertion failure.

- [ ] **Step 5: Run final scans**

Run:

```bash
rg -n -f /tmp/web-fullstack-modernization/batch-4/obsolete-patterns.txt \
  web-fullstack-course || true
find web-fullstack-course/07-engineering -type d \
  \( -name node_modules -o -name dist -o -name coverage \) -print
find web-fullstack-course/07-engineering -type f \
  \( -name package.json -o -name pnpm-lock.yaml -o -name .env \) -print
git diff --check
git diff --name-status
```

Expected: zero obsolete hits, zero repository artifacts, zero whitespace errors, and no Batch 4 changes outside the volume, an evidence-backed version baseline correction, and `VALIDATION.md`.

- [ ] **Step 6: Obtain independent review and record evidence**

Require review of tool compatibility, lock reproducibility, current configs, negative gates, browser evidence, CI security, release overclaims, Capstone ownership, matrix links, and split decisions. Fix blockers, rerun affected commands until `PROCEED`, update both evidence files, stop temporary services, and remove the temporary project.
