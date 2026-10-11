# Web Modernization Batch 3 React and Vue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the React and Vue volumes to current stable framework ecosystems while preserving independent teaching models, equal business complexity, equal quality gates, and equal observable acceptance.

**Architecture:** Freeze one shared Neighbor Market/API/state/test contract, then audit React and Vue in matching capability slices rather than translating code line by line. Version and tool compatibility are verified before prose changes. Each framework is reconstructed and tested independently, followed by a parity audit and selective-split decisions for the two long Capstone owners.

**Tech Stack:** Markdown, TypeScript strict mode, current stable React and Vue, React Router, Vue Router, Pinia, Vite, current compatible TypeScript/ESLint/test stacks, Vitest, Testing Library/Vue Test Utils, Playwright, Node.js LTS, pnpm, Chromium.

---

## 1. Scope and Ownership

**Files:**
- Modify: all current Markdown files under `web-fullstack-course/05-react/`
- Modify: all current Markdown files under `web-fullstack-course/06-vue/`
- Modify when evidence changes: `web-fullstack-course/00-guide/02-version-baseline.md`
- Modify with observed evidence only: `web-fullstack-course/VALIDATION.md`
- Temporary React fixture: `/tmp/web-fullstack-modernization/batch-3/react/`
- Temporary Vue fixture: `/tmp/web-fullstack-modernization/batch-3/vue/`
- Temporary parity evidence: `/tmp/web-fullstack-modernization/batch-3/parity.md`

Do not modify shared API behavior in this batch. When current framework needs expose a contract defect, record the exact required domain/API change for the owning later batch.

## 2. Task 1: Freeze Inventory, Versions, and Shared Parity

- [ ] **Step 1: Record worktree and exact inventory**

Run:

```bash
mkdir -p /tmp/web-fullstack-modernization/batch-3
git status --short
rg --files web-fullstack-course/05-react web-fullstack-course/06-vue \
  -g '*.md' | sort \
  | tee /tmp/web-fullstack-modernization/batch-3/inventory.txt
```

Expected: 34 Markdown files per volume: 8 hubs, 24 detailed lessons, one README, and one matrix.

- [ ] **Step 2: Verify lesson arithmetic**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

result = {}
for volume in ("05-react", "06-vue"):
    root = Path("web-fullstack-course") / volume
    chapters = {
        path.name: len(list(path.glob("*.md")))
        for path in sorted(root.glob("[0-9][0-9]-*"))
        if path.is_dir()
    }
    assert len(chapters) == 8, (volume, chapters)
    assert set(chapters.values()) == {3}, (volume, chapters)
    result[volume] = sum(chapters.values())
assert result == {"05-react": 24, "06-vue": 24}, result
print("Batch 3 lesson inventory: PASS", result)
PY
```

- [ ] **Step 3: Verify the supported dependency combinations**

From official framework, router, Pinia, Vite, TypeScript, ESLint, test, SSR, and package metadata sources, record exact stable versions, engine requirements, peer dependencies, compiler/API constraints, and release status. Preview-only APIs cannot become the mainline.

- [ ] **Step 4: Freeze obsolete patterns**

Create `/tmp/web-fullstack-modernization/batch-3/obsolete-patterns.txt`. Inspect unsupported React/Vue majors, removed framework APIs, Create React App, legacy root mounting, unsupported router APIs, removed Vue filter/instance patterns, stale Vite plugins, old Lint config, obsolete SSR/hydration entry points, and historical migration prose.

- [ ] **Step 5: Freeze the parity contract**

Write `parity.md` with exact shared requirements:

```text
Listing and Page fields
integer-cent input boundaries
UTC persistence and localized display
API endpoints and status-specific errors
same-origin Cookie session and CSRF boundary
initial/loading/empty/error/success/unauthenticated/forbidden/conflict states
search/pagination/detail/login/publish/reserve/favorite/logout flows
late-session and stale-search suppression
keyboard, focus, status, route-recovery, and reduced-motion requirements
SSR public HTML, safe serialization, request isolation, failure statuses, and hydration
shared scenario names and fixture values
```

Expected: framework-specific implementation differs, but every shared observable requirement has one React owner and one Vue owner.

## 3. Task 2: Modernize React Foundations and Data Flow

**Files:**
- Modify: `web-fullstack-course/05-react/01-jsx-components.md`
- Modify: all lessons under `web-fullstack-course/05-react/01-jsx-components/`
- Modify: `web-fullstack-course/05-react/02-events-state-forms.md`
- Modify: all lessons under `web-fullstack-course/05-react/02-events-state-forms/`
- Modify: `web-fullstack-course/05-react/03-effects-reuse.md`
- Modify: all lessons under `web-fullstack-course/05-react/03-effects-reuse/`

- [ ] **Step 1: Audit rendering and components**

Verify current element rendering, JSX transform assumptions, purity, render/commit boundaries, Strict Mode development behavior, escaped text, composition, props ownership, list identity, and Vite/TypeScript setup.

- [ ] **Step 2: Audit events, state, and forms**

Verify state snapshots, functional updates, immutable changes, derived state, controlled/uncontrolled boundaries, exact amount parsing, draft retention, submission states, `useId`, state ownership, and in-memory limitations.

- [ ] **Step 3: Audit Effects, HTTP, and custom Hooks**

Verify Effect ownership and cleanup, current dependency guidance, external synchronization, `AbortSignal`, HTTP status handling, runtime response parsing, discriminated resource states, retries, stale-result guards, custom Hook ownership, and local API disclaimers.

## 4. Task 3: Modernize React Application Architecture

**Files:**
- Modify: React Chapters 04-08 hubs and all 15 detailed lessons below them

- [ ] **Step 1: Audit routing and server data**

Verify current router mode and APIs, URL-owned state, deep links, loaders/actions or current equivalents, request cancellation, error boundaries, revalidation, authentication recovery, server-issued identity, and `409` handling.

- [ ] **Step 2: Audit state architecture**

Separate local, URL, session, shared client, and server state. Verify reducer/Context boundaries, external-store contracts, logout cleanup, per-ID command locks, request/session generations, SSR request isolation, and no duplicated server cache.

- [ ] **Step 3: Audit testing and accessibility**

Verify current test libraries and APIs, user-visible assertions, route recovery, error states, keyboard navigation, focus restoration, accessible names, status/alert semantics, reduced motion, Lint hooks rules, and honest frontend evidence limits.

- [ ] **Step 4: Audit performance and current React capabilities**

Keep only stable APIs supported by the verified version. Require profiler evidence before memoization, distinguish urgent/deferred work, verify optimistic rollback and pending state, and state current Compiler/Suspense/server-component boundaries without teaching preview behavior as production default.

- [ ] **Step 5: Audit SSR and the React Capstone**

Verify CSR/SSR/static/hybrid distinctions, hydration invariants, safe serialization, trusted upstreams, timeouts, per-request state, response statuses, streaming boundaries, no-JavaScript behavior, and one authoritative complete-project owner.

## 5. Task 4: Modernize Vue Foundations and Data Flow

**Files:**
- Modify: `web-fullstack-course/06-vue/01-sfc-templates.md`
- Modify: all lessons under `web-fullstack-course/06-vue/01-sfc-templates/`
- Modify: `web-fullstack-course/06-vue/02-reactivity-events-forms.md`
- Modify: all lessons under `web-fullstack-course/06-vue/02-reactivity-events-forms/`
- Modify: `web-fullstack-course/06-vue/03-lifecycle-composables.md`
- Modify: all lessons under `web-fullstack-course/06-vue/03-lifecycle-composables/`

- [ ] **Step 1: Audit SFCs, templates, and components**

Verify current SFC compilation, `script setup`, typed props/emits/slots, escaping, directive behavior, list identity, scoped-style limits, instance/module ownership, and Vite/TypeScript setup.

- [ ] **Step 2: Audit reactivity, events, and forms**

Verify `ref`, `reactive`, `computed`, update timing, destructuring boundaries, component events, current `v-model` APIs, draft validation, exact amount parsing, pending/error/success, state ownership, and in-memory limitations.

- [ ] **Step 3: Audit lifecycle, watchers, and composables**

Verify lifecycle timing, `watch`/`watchEffect` choice, current cleanup registration rules, cancellation, shallow server snapshots, discriminated resource states, composable inputs/instances, retries, stale-result guards, and local API disclaimers.

## 6. Task 5: Modernize Vue Application Architecture

**Files:**
- Modify: Vue Chapters 04-08 hubs and all 15 detailed lessons below them

- [ ] **Step 1: Audit router and server data**

Verify current Vue Router APIs, URL-owned state, deep links, component reuse on parameter changes, navigation/fetch ordering, cancellation, status-specific errors, authentication recovery, server-issued identity, and `409` handling.

- [ ] **Step 2: Audit Pinia and state architecture**

Separate local, URL, session, shared client, and server state. Verify current Pinia setup, `storeToRefs`, action ownership, provide/inject boundaries, logout cleanup, per-ID command locks, request/session generations, and per-request SSR stores.

- [ ] **Step 3: Audit testing and accessibility**

Verify current Vitest, Vue Test Utils, Pinia, router, and browser test APIs; user-visible assertions; error capture; keyboard/focus recovery; labels; status semantics; reduced motion; SFC Lint rules; and honest evidence limits.

- [ ] **Step 4: Audit performance and advanced Vue**

Require measurement before shallow reactivity or memoization. Verify root replacement, stable props, pagination/virtualization boundaries, Teleport/dialog focus, Transition reduced motion, KeepAlive activation/deactivation cleanup, and async-component failure/retry.

- [ ] **Step 5: Audit SSR and the Vue Capstone**

Verify CSR/SSR/static/hybrid distinctions, hydration invariants, safe serialization, trusted upstreams, timeouts, per-request app/router/Pinia, response statuses, streaming/server-prefetch/Teleport boundaries, no-JavaScript behavior, and one authoritative complete-project owner.

## 7. Task 6: Apply the Selective-Split Gate

**Files:**
- Audit candidate: `web-fullstack-course/05-react/08-ssr-capstone/03-streaming-rsc-capstone-acceptance.md`
- Audit candidate: `web-fullstack-course/06-vue/08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md`
- Conditional modify: this plan before creating or deleting lesson paths

- [ ] **Step 1: Measure visible content and responsibilities**

Record visible line count, stable/preview framework material, complete project files, independent topics, exercises, acceptance, and duplication risk for both candidates.

- [ ] **Step 2: Make symmetric but independent decisions**

Do not force equal file counts. Mark each candidate `KEEP-LONG` when it is one authoritative Capstone or inseparable acceptance flow. Mark `SPLIT` only when multiple independent teaching owners can be separated without duplicating the final project.

- [ ] **Step 3: Amend exact paths before splitting**

For a `SPLIT` decision, add exact create/modify/delete paths, responsibility map, complete-project owner, old-to-new heading map, navigation/matrix changes, and content-conservation checks to this plan before editing course structure.

## 8. Task 7: Reconcile Parity, Navigation, and Coverage

**Files:**
- Modify: `web-fullstack-course/05-react/README.md`
- Modify: `web-fullstack-course/05-react/REACT-COVERAGE.md`
- Modify: all 8 React hubs
- Modify: `web-fullstack-course/06-vue/README.md`
- Modify: `web-fullstack-course/06-vue/VUE-COVERAGE.md`
- Modify: all 8 Vue hubs

- [ ] **Step 1: Build a parity ledger**

For every shared scenario in `parity.md`, name the React lesson/heading, Vue lesson/heading, React test, Vue test, and acceptance evidence. A missing side is a blocking gap.

- [ ] **Step 2: Reconcile routes**

Require README → hub → ordered lessons → adjacent lesson/hub → matrix and acceptance links in each volume. Do not make one framework depend on reading the other.

- [ ] **Step 3: Reconcile matrix evidence**

Every lesson must own at least one row. Every row must link all six teaching dimensions to real headings. IDs must be unique within and across both matrices.

- [ ] **Step 4: Record downstream contract changes**

Write exact engineering/backend/full-stack follow-up needs to `/tmp/web-fullstack-modernization/batch-3/downstream-contracts.md`; later batches own those files.

## 9. Task 8: Reconstruct and Verify Both Frameworks

**Files:**
- Test: `web-fullstack-course/05-react/**/*.md`
- Test: `web-fullstack-course/06-vue/**/*.md`
- Temporary fixtures: the two batch directories declared above
- Modify with observed facts: `web-fullstack-course/VALIDATION.md`

- [ ] **Step 1: Verify lesson structure**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

for volume, minimum in (("05-react", 24), ("06-vue", 24)):
    root = Path("web-fullstack-course") / volume
    lessons = sorted(root.glob("[0-9][0-9]-*/*.md"))
    assert len(lessons) >= minimum, (volume, len(lessons))
    for path in lessons:
        text = path.read_text()
        visible = re.sub(r"```.*?```", "", text, flags=re.S)
        assert re.findall(r"^## ([0-9]+)\.", visible, flags=re.M) == [str(i) for i in range(1, 14)], path
        for heading in ("## 任务卡", "## 我现在能做到什么", "## 单元导航"):
            assert heading in visible, (path, heading)
        assert sum(line.startswith("```") for line in text.splitlines()) % 2 == 0, path
    print(f"{volume}: PASS ({len(lessons)})")
PY
```

- [ ] **Step 2: Reconstruct the React project**

Create a fresh temporary workspace from the authoritative lesson blocks. Install the exact lock resolution and run version probes, Lint, typecheck, unit/component/router tests, production build, SSR tests, and representative Chromium E2E.

- [ ] **Step 3: Reconstruct the Vue project**

Create a separate fresh temporary workspace. Run version probes, Lint, `vue-tsc`, unit/store/component/router tests, production build, SSR tests, and the same representative Chromium E2E scenarios.

- [ ] **Step 4: Run shared negative gates**

For each framework, inject and restore one type error, one runtime parser error, one failed publish retaining a draft, one stale session result, one reservation conflict, one route error, one keyboard/focus regression, and one SSR isolation or serialization failure.

- [ ] **Step 5: Compare parity evidence**

Every shared scenario must have equal observable behavior and status semantics. Framework-specific APIs may differ. A missing test or state on either side blocks completion.

- [ ] **Step 6: Run final scans**

Run:

```bash
rg -n -f /tmp/web-fullstack-modernization/batch-3/obsolete-patterns.txt \
  web-fullstack-course || true
git diff --check
git diff --name-status
git status --short
```

Expected: zero obsolete hits, zero whitespace errors, and no Batch 3 changes outside the two volumes, an evidence-backed version baseline correction, and `VALIDATION.md`.

- [ ] **Step 7: Obtain independent review and update evidence**

Require separate React, Vue, and parity findings with file/line evidence. Fix blocking version, behavior, SSR, accessibility, security-boundary, test, matrix, and split-decision findings; rerun affected gates until `PROCEED`. Update `VALIDATION.md` with exact current evidence and remove temporary fixtures.
