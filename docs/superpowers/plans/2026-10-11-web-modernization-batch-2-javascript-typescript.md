# Web Modernization Batch 2 JavaScript and TypeScript Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize all JavaScript and TypeScript lessons around the current production runtime, current module and type-system behavior, runtime data validation, deterministic async logic, and executable tests.

**Architecture:** Audit nine stable chapter hubs and their 27 detailed lessons without changing the volume boundary. Establish the supported Node/TypeScript/tool compatibility combination first, then modernize language, DOM, async, type, domain, test, and algorithm teaching in dependency order. Use Node and Chromium fixtures reconstructed under `/tmp`.

**Tech Stack:** Markdown, JavaScript, ECMAScript modules, browser DOM and Fetch APIs, Node.js LTS, `node:test`, TypeScript stable toolchains, pnpm, Chromium.

---

## 1. Scope and File Map

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/README.md`
- Modify: `web-fullstack-course/04-javascript-typescript/JS-TS-COVERAGE.md`
- Modify: `web-fullstack-course/04-javascript-typescript/01-values-control-flow.md`
- Modify: every lesson in `web-fullstack-course/04-javascript-typescript/01-values-control-flow/`
- Modify: `web-fullstack-course/04-javascript-typescript/02-functions-scope-errors.md`
- Modify: every lesson in `web-fullstack-course/04-javascript-typescript/02-functions-scope-errors/`
- Modify: `web-fullstack-course/04-javascript-typescript/03-objects-arrays-data.md`
- Modify: every lesson in `web-fullstack-course/04-javascript-typescript/03-objects-arrays-data/`
- Modify: `web-fullstack-course/04-javascript-typescript/04-prototypes-modules.md`
- Modify: every lesson in `web-fullstack-course/04-javascript-typescript/04-prototypes-modules/`
- Modify: `web-fullstack-course/04-javascript-typescript/05-dom-events.md`
- Modify: every lesson in `web-fullstack-course/04-javascript-typescript/05-dom-events/`
- Modify: `web-fullstack-course/04-javascript-typescript/06-async-fetch-event-loop.md`
- Modify: every lesson in `web-fullstack-course/04-javascript-typescript/06-async-fetch-event-loop/`
- Modify: `web-fullstack-course/04-javascript-typescript/07-typescript-core.md`
- Modify: every lesson in `web-fullstack-course/04-javascript-typescript/07-typescript-core/`
- Modify: `web-fullstack-course/04-javascript-typescript/08-typescript-domain-design.md`
- Modify: every lesson in `web-fullstack-course/04-javascript-typescript/08-typescript-domain-design/`
- Modify: `web-fullstack-course/04-javascript-typescript/09-testing-debugging-algorithms.md`
- Modify: every lesson in `web-fullstack-course/04-javascript-typescript/09-testing-debugging-algorithms/`
- Modify when the verified stack changes: `web-fullstack-course/00-guide/02-version-baseline.md`
- Modify with observed evidence only: `web-fullstack-course/VALIDATION.md`
- Temporary only: `/tmp/web-fullstack-modernization/batch-2/`

## 2. Task 1: Freeze Inventory and Toolchain Evidence

- [ ] **Step 1: Record the exact volume shape**

Run:

```bash
mkdir -p /tmp/web-fullstack-modernization/batch-2
git status --short
rg --files web-fullstack-course/04-javascript-typescript -g '*.md' \
  | sort \
  | tee /tmp/web-fullstack-modernization/batch-2/inventory.txt
```

Expected: 38 Markdown files, including 9 hubs, 27 detailed lessons, one README, and one coverage matrix.

- [ ] **Step 2: Verify the lesson distribution**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

root = Path("web-fullstack-course/04-javascript-typescript")
counts = {
    path.name: len(list(path.glob("*.md")))
    for path in sorted(root.glob("[0-9][0-9]-*"))
    if path.is_dir()
}
assert len(counts) == 9, counts
assert set(counts.values()) == {3}, counts
print("Batch 2 lesson inventory: PASS (9 x 3 = 27)")
PY
```

Expected: `Batch 2 lesson inventory: PASS (9 x 3 = 27)`.

- [ ] **Step 3: Verify the current compatible JavaScript/TypeScript stack**

From official Node.js, TypeScript, package registry, and tool release/support sources, record:

```text
Node production LTS and supported ESM behavior
current TypeScript stable compiler and CLI
current compiler-API compatibility required by ESLint/Vue or other downstream tools
moduleResolution choices for browser bundlers and native Node execution
standard library target and runtime API availability
test runner behavior used by this volume
```

Keep a compatibility compiler only when a current supported downstream tool demonstrably requires it. If no current tool requires it, remove the parallel compiler path rather than preserving it as history.

- [ ] **Step 4: Freeze the batch obsolete-pattern file**

Create `/tmp/web-fullstack-modernization/batch-2/obsolete-patterns.txt` from source-backed findings. At minimum inspect old TypeScript config keys, obsolete Node majors, unsupported module loaders, removed APIs, historical polyfill instructions, deprecated DOM APIs, and legacy test commands.

## 3. Task 2: Audit JavaScript Language Foundations

**Files:**
- Modify: Chapters 01-04 hubs and all 12 detailed lessons below them

- [ ] **Step 1: Audit values and control flow**

Verify primitive semantics, explicit conversion, `NaN`, safe integer cents, nullish behavior, strict equality, short-circuiting, iteration termination, and failure cases. Remove examples that silently repair malformed price input.

- [ ] **Step 2: Audit functions, scope, and errors**

Verify function contracts, return versus log, closure lifetime, captured bindings, error causes, stack evidence, cleanup, arbitrary thrown values, and resource ownership. Every cleanup example must preserve the original error.

- [ ] **Step 3: Audit objects, arrays, and serialization**

Verify reference identity, shallow-copy boundaries, immutable update paths, non-mutating collection methods where appropriate, stable IDs, sorting/pagination invariants, JSON loss, prototype-pollution boundaries, and explicit external-data admission.

- [ ] **Step 4: Audit prototypes, classes, and modules**

Teach the prototype chain and `this` accurately without forcing DTOs into class hierarchies. Verify current ESM import/export, explicit paths, package/module boundaries, dynamic import, top-level await constraints, cycles, and one-time module evaluation.

## 4. Task 3: Audit DOM and Async Behavior

**Files:**
- Modify: Chapters 05-06 hubs and all 6 detailed lessons below them

- [ ] **Step 1: Audit DOM rendering and events**

Verify nullable queries, safe text rendering, fragments, state-to-view ownership, event propagation, form submit semantics, delegation containment, focus restoration, accessible state, live feedback, and refresh/persistence boundaries.

- [ ] **Step 2: Audit Promise and event-loop explanations**

Verify synchronous stack, Promise settlement, microtasks, timers, rendering opportunities, browser-versus-Node boundaries, rejection cleanup, and starvation. Output-order examples must have executable assertions rather than prose-only predictions.

- [ ] **Step 3: Audit Fetch and runtime validation**

Separate network rejection, HTTP status, body decoding, runtime contract validation, cancellation, stale-response prevention, server transaction boundaries, retry safety, and visible UI states.

- [ ] **Step 4: Verify deterministic race examples**

Use manually controlled Promises or an equivalent deterministic harness. Do not use arbitrary timing sleeps to prove freshness, cancellation, disposal, or concurrent ordering.

## 5. Task 4: Audit TypeScript and Domain Design

**Files:**
- Modify: Chapters 07-08 hubs and all 6 detailed lessons below them

- [ ] **Step 1: Audit strict compiler configuration**

Verify exact current option names and interactions for strictness, indexed access, exact optional properties, module resolution, emit, declaration libraries, and skipped library checking. Separate browser bundler configuration from native Node configuration.

- [ ] **Step 2: Audit inference, narrowing, generics, and soundness**

Keep local inference and boundary annotations distinct. Preserve `unknown` at external boundaries, discriminated unions, exhaustive checks, relationship-preserving generics, readonly contracts, and explicit limits of assertions, utility types, and erased types.

- [ ] **Step 3: Audit domain contracts**

Verify full listing/page/error/reservation contracts, integer cents, UTC strings, branded-value admission, draft/command/DTO/domain separation, server-owned fields, status state machines, optimistic conflicts, object authorization, and database-owned uniqueness.

- [ ] **Step 4: Audit runtime parsers**

Every external value must follow `unknown -> parser -> domain`. Add exact error paths and negative cases for missing fields, malformed values, duplicate IDs, contradictory pagination, invalid timestamps, unsafe cents, and unknown statuses.

- [ ] **Step 5: Reconcile current compiler compatibility**

Update all commands, manifests shown in Markdown, scripts, expected versions, and failure messages to the single verified compatibility combination. Remove unsupported compiler versions and historical migration prose completely.

## 6. Task 5: Audit Tests, Debugging, Algorithms, and Data Structures

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/09-testing-debugging-algorithms.md`
- Modify: all three detailed lessons in its directory

- [ ] **Step 1: Audit test contracts**

Verify current `node:test` APIs, strict assertions, synchronous throws, async rejection, table-driven boundary cases, mutation checks, meaningful red/green evidence, and behavior-focused assertions.

- [ ] **Step 2: Audit deterministic debugging**

Require reproduce, minimize, hypothesize, instrument, fix, and regress evidence. Keep sensitive values out of logs and separate browser Network/Sources evidence from Node inspector evidence.

- [ ] **Step 3: Audit algorithms and data structures**

State preconditions, mutation behavior, time/space costs, stable identity, index maintenance cost, binary-search ordering, and database/API boundaries. Remove algorithm examples whose accepted inputs or failure behavior are ambiguous.

## 7. Task 6: Apply the Selective-Split Gate

**Files:**
- Audit: all 27 detailed lessons
- Conditional modify: this plan before creating or deleting a lesson path

- [ ] **Step 1: Measure visible lines**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/04-javascript-typescript")
for path in sorted(root.glob("[0-9][0-9]-*/*.md")):
    visible = re.sub(r"```.*?```", "", path.read_text(), flags=re.S)
    count = len(visible.splitlines())
    if count > 900:
        print(count, path)
PY
```

Expected: an exact candidate list, which may be empty.

- [ ] **Step 2: Apply all split conditions**

For each candidate, record independent topics, exercises, acceptance, complete-project ownership, and duplication risk. Mark `KEEP-LONG` unless every split condition in the design is satisfied.

- [ ] **Step 3: Add exact split paths before changing structure**

If any candidate qualifies, amend this plan with exact new filenames, responsibilities, heading migration, link/matrix changes, and content-conservation checks; rerun the plan self-check before content edits.

## 8. Task 7: Reconcile Navigation and Coverage

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/README.md`
- Modify: all 9 chapter hubs
- Modify: `web-fullstack-course/04-javascript-typescript/JS-TS-COVERAGE.md`

- [ ] **Step 1: Verify route continuity**

Require README → hub → ordered lessons → adjacent lesson/hub → matrix and acceptance links. Preserve stable hub paths.

- [ ] **Step 2: Verify matrix ownership**

Every detailed lesson must own at least one row. Every row must link to real theory, minimum case, project case, diagnosis, exercise, and acceptance headings. IDs must be unique.

- [ ] **Step 3: Verify cross-volume prerequisites**

Check links to browser, React, Vue, engineering, backend, and guide contracts. Record any out-of-scope target correction for Batch 7 rather than editing another volume.

## 9. Task 8: Static and Runtime Verification

**Files:**
- Test: `web-fullstack-course/04-javascript-typescript/**/*.md`
- Temporary extraction: `/tmp/web-fullstack-modernization/batch-2/extracted/`
- Modify with observed facts: `web-fullstack-course/VALIDATION.md`

- [ ] **Step 1: Verify structure and fences**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/04-javascript-typescript")
lessons = sorted(root.glob("[0-9][0-9]-*/*.md"))
assert len(lessons) >= 27, len(lessons)
for path in lessons:
    text = path.read_text()
    visible = re.sub(r"```.*?```", "", text, flags=re.S)
    assert re.findall(r"^## ([0-9]+)\.", visible, flags=re.M) == [str(i) for i in range(1, 14)], path
    for heading in ("## 任务卡", "## 我现在能做到什么", "## 单元导航"):
        assert heading in visible, (path, heading)
    assert sum(line.startswith("```") for line in text.splitlines()) % 2 == 0, path
print(f"Batch 2 lesson structure: PASS ({len(lessons)})")
PY
```

- [ ] **Step 2: Verify JavaScript**

Extract complete JavaScript/ESM examples. Run `node --check`, declared `node --test` suites, exact-output assertions, price boundaries, serialization errors, module failures, cancellation, stale-response, disposal, and algorithm preconditions.

- [ ] **Step 3: Verify TypeScript**

Reconstruct the documented temporary projects, install the exact verified lock resolution, probe compiler versions, and run every declared strict typecheck. Verify negative fixtures fail for the intended diagnostic and restore them before the final pass.

- [ ] **Step 4: Verify browser paths**

In Chromium, run safe rendering, form submission, delegation, keyboard/focus recovery, Fetch failure classes, rapid-search freshness, and zero unhandled console errors.

- [ ] **Step 5: Run final gates**

Run:

```bash
rg -n -f /tmp/web-fullstack-modernization/batch-2/obsolete-patterns.txt \
  web-fullstack-course || true
git diff --check
git diff --name-status
git status --short
```

Expected: zero obsolete hits, zero whitespace errors, and no Batch 2 changes outside this volume, an evidence-backed version baseline correction, and `VALIDATION.md`.

- [ ] **Step 6: Obtain independent review and update evidence**

Require review of language correctness, runtime/type boundary claims, money/time rules, async determinism, DOM security/accessibility, tests, algorithms, navigation, and zero-retention compliance. Fix blockers, rerun affected checks until `PROCEED`, update `VALIDATION.md`, and remove temporary extraction files.
