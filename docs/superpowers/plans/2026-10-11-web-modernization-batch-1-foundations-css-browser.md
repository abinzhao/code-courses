# Web Modernization Batch 1 Foundations, CSS, and Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the course foundation, CSS, and browser volumes while preserving the 50-week route, removing obsolete platform guidance, and proving representative behavior in Chromium.

**Architecture:** Audit the guide first because it owns versions, domain boundaries, structure, and learning order. Then audit CSS and browser lessons chapter by chapter, update their matrices and navigation, apply the selective-split gate to the CSS reference candidate, and finish with static and Chromium evidence. Cross-book statistics remain provisional until Batch 7.

**Tech Stack:** Markdown, Python 3, ripgrep, WHATWG/MDN/W3C primary references, Node.js LTS, HTML/CSS/JavaScript, browser DOM and Web APIs, Chromium DevTools.

---

## 1. Scope and Ownership

**Files:**
- Modify: `web-fullstack-course/00-guide/README.md`
- Modify: `web-fullstack-course/00-guide/01-learning-path.md`
- Modify: `web-fullstack-course/00-guide/02-version-baseline.md`
- Modify: `web-fullstack-course/00-guide/03-computer-first-page.md`
- Modify: every existing Markdown lesson in `web-fullstack-course/00-guide/03-computer-first-page/`
- Modify: `web-fullstack-course/00-guide/04-terminal-git-debugging.md`
- Modify: every existing Markdown lesson in `web-fullstack-course/00-guide/04-terminal-git-debugging/`
- Modify: `web-fullstack-course/00-guide/05-project-assessment.md`
- Modify: `web-fullstack-course/00-guide/06-coverage-map.md`
- Modify: `web-fullstack-course/00-guide/07-course-structure.md`
- Modify: `web-fullstack-course/00-guide/08-unit-writing-template.md`
- Modify: `web-fullstack-course/00-guide/09-w01-checkpoint.md`
- Modify: all current Markdown files under `web-fullstack-course/02-css/`
- Modify: all current Markdown files under `web-fullstack-course/03-browser/`
- Modify with observed evidence only: `web-fullstack-course/VALIDATION.md`
- Temporary only: `/tmp/web-fullstack-modernization/batch-1/`

Do not modify `web-fullstack-course/01-html/` in this batch. Record cross-volume HTML issues for Batch 7 with exact source and target paths.

## 2. Required Inventory

- [ ] **Step 1: Record the worktree and exact file list**

Run:

```bash
mkdir -p /tmp/web-fullstack-modernization/batch-1
git status --short
rg --files \
  web-fullstack-course/00-guide \
  web-fullstack-course/02-css \
  web-fullstack-course/03-browser \
  -g '*.md' | sort \
  | tee /tmp/web-fullstack-modernization/batch-1/inventory.txt
```

Expected: 16 guide Markdown files, 42 CSS Markdown files, and 26 browser Markdown files.

- [ ] **Step 2: Verify the existing detailed-lesson arithmetic**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

root = Path("web-fullstack-course")
counts = {
    "guide": sum(1 for p in (root / "00-guide").glob("[0-9][0-9]-*/*.md")),
    "css": sum(1 for p in (root / "02-css").glob("[0-9][0-9]-*/*.md")),
    "browser": sum(1 for p in (root / "03-browser").glob("[0-9][0-9]-*/*.md")),
}
assert counts == {"guide": 6, "css": 30, "browser": 18}, counts
print("Batch 1 detailed lessons: PASS", counts)
PY
```

Expected: `Batch 1 detailed lessons: PASS {'guide': 6, 'css': 30, 'browser': 18}`.

## 3. Task 1: Verify Versions and Remove Obsolete Guidance

**Files:**
- Modify: `web-fullstack-course/00-guide/02-version-baseline.md`
- Audit: every path in `/tmp/web-fullstack-modernization/batch-1/inventory.txt`
- Create temporary evidence: `/tmp/web-fullstack-modernization/batch-1/version-audit.md`
- Create temporary denylist: `/tmp/web-fullstack-modernization/batch-1/obsolete-patterns.txt`

- [ ] **Step 1: Verify platform and runtime facts from primary sources**

Record current production LTS Node.js, stable browser mechanisms, CSS support status, and any guide-owned framework/tool baseline needed by later batches. For every exact version, record release date, support status, compatibility constraint, official URL, and affected course paths.

- [ ] **Step 2: Seed and expand the obsolete-term ledger**

The initial audit must explicitly inspect:

```text
unsupported Node.js major versions
Create React App and react-scripts
.eslintrc and .eslintignore
removed ESLint configuration paths
old Vite production configuration names
unsupported framework/database version numbers
non-standard or removed browser APIs
deprecated CSS features presented as production defaults
historical migration sections that retain an obsolete path
```

Add only source-backed regex patterns to `obsolete-patterns.txt`, one per line, and record each replacement in `version-audit.md`.

- [ ] **Step 3: Rewrite version teaching as a current compatible stack**

Remove historical comparison tables and old-version commands from `02-version-baseline.md`. Keep current stability definitions, exact primary evidence, compatibility combinations, lockfile guidance, and honest validation boundaries.

- [ ] **Step 4: Scan the batch before content edits**

Run:

```bash
rg -n -f /tmp/web-fullstack-modernization/batch-1/obsolete-patterns.txt \
  web-fullstack-course/00-guide \
  web-fullstack-course/02-css \
  web-fullstack-course/03-browser \
  | tee /tmp/web-fullstack-modernization/batch-1/obsolete-before.txt || true
```

Expected: every hit is assigned to an exact replacement task below.

## 4. Task 2: Modernize the Foundation Contract

**Files:**
- Modify: all `web-fullstack-course/00-guide/*.md`
- Modify: all detailed lessons under the two guide lesson directories

- [ ] **Step 1: Audit the 50-week route and prerequisites**

Check each week for a unique number, valid destination, achievable prerequisite, observable output, and no dependency on an obsolete tool. Keep HTML at Weeks 2-6 and keep the total at 50 weeks.

- [ ] **Step 2: Audit first-page, terminal, Git, and debugging lessons**

Verify file/process/port concepts, safe commands, non-destructive Git recovery, evidence-driven diagnosis, cleanup instructions, and current Node/browser behavior. Replace old commands or screenshots-in-prose with current reproducible evidence.

- [ ] **Step 3: Reconcile the Neighbor Market domain contract**

Verify integer cents, UTC storage, listing ownership, reservation concurrency, same-origin session, CSRF, object authorization, error statuses, and project-stage boundaries. A guide change that alters behavior must list every downstream volume affected.

- [ ] **Step 4: Reconcile course structure and writing rules**

Ensure `07-course-structure.md` and `08-unit-writing-template.md` require exact paths, creation/run/cleanup commands, expected and failing outcomes, evidence locations, unverified boundaries, and the fixed detailed-lesson headings.

- [ ] **Step 5: Verify the W1 checkpoint**

Run the documented first-page and 404 path in an isolated `/tmp` fixture. Confirm the checkpoint distinguishes file content, HTTP response, DOM observation, Git evidence, and process cleanup.

## 5. Task 3: Modernize CSS

**Files:**
- Modify: `web-fullstack-course/02-css/README.md`
- Modify: `web-fullstack-course/02-css/CSS-COVERAGE.md`
- Modify: the ten CSS chapter hubs and every existing detailed lesson in their same-named directories

- [ ] **Step 1: Audit Chapters 01-03**

Verify parsing, cascade origins and layers, specificity, inheritance, modern selectors, value stages, units, color, intrinsic sizing, overflow, formatting contexts, containing blocks, positioning, top layer, and stacking contexts. Replace unsupported syntax and examples that depend on accidental browser behavior.

- [ ] **Step 2: Audit Chapters 04-07**

Verify font loading and fallback metrics, international line breaking, decoration boundaries, Flexbox automatic minimum sizes, Grid/Subgrid, media/container queries, logical properties, zoom, pointer/hover, print, forced colors, and content-driven breakpoints.

- [ ] **Step 3: Audit Chapters 08-09**

Verify transform/compositing effects, interruption-safe transitions, current animation timelines, WAAPI cancellation, reduced motion, custom properties, `@property`, layers, native nesting, scope, forms, scroll behavior, and progressive enhancement.

- [ ] **Step 4: Audit the Chapter 10 reference**

For every indexed property, at-rule, function, descriptor, limited feature, and compatibility statement, verify current status and its teaching owner. Delete obsolete and non-standard items completely; do not retain a historical register.

- [ ] **Step 5: Reconcile CSS accessibility and acceptance**

Every chapter-level path must include long content, empty data, narrow width, 200% zoom, keyboard focus, reduced motion, forced-color or contrast boundary where applicable, and an objective observation.

## 6. Task 4: Modernize Browser and Web Platform Content

**Files:**
- Modify: `web-fullstack-course/03-browser/README.md`
- Modify: `web-fullstack-course/03-browser/BROWSER-COVERAGE.md`
- Modify: the six browser chapter hubs and every existing detailed lesson in their same-named directories

- [ ] **Step 1: Audit network, HTTP, cache, and rendering**

Verify URL processing, DNS/TLS boundaries, request/response semantics, negotiation, cache validation, connection reuse, DOM/CSSOM/layout/paint/composite language, tasks, microtasks, rendering opportunities, long tasks, and layout thrashing.

- [ ] **Step 2: Audit storage and browser security**

Verify memory/storage/IndexedDB transaction boundaries, origin/site distinction, Cookie attributes, CORS, CSRF, XSS, CSP, authorization, quota failure, cross-tab conflicts, and private-data handling.

- [ ] **Step 3: Audit Fetch, Streams, and realtime communication**

Verify transport versus HTTP failure, body decoding, runtime validation, timeout, cancellation, freshness guards, stream framing/backpressure, SSE/WebSocket/polling recovery, duplicate suppression, and bounded retry.

- [ ] **Step 4: Audit Workers, offline behavior, and platform APIs**

Verify Worker transfer/cancellation, Service Worker lifecycle and cache versioning, update recovery, offline consistency, observer lifecycles, permission denial, feature detection, and a non-JavaScript fallback where applicable.

- [ ] **Step 5: Audit DevTools and performance evidence**

Verify Network, Performance, Memory, Application, Coverage, Accessibility, Core Web Vitals, resource budgets, before/after evidence, and causal-claim boundaries.

## 7. Task 5: Apply the Selective-Split Gate

**Files:**
- Audit candidate: `web-fullstack-course/02-css/10-property-reference/01-stable-properties-module-index.md`
- Delete after content replacement: `web-fullstack-course/02-css/10-property-reference/03-limited-experimental-fallback-register.md`
- Create: `web-fullstack-course/02-css/10-property-reference/03-stable-compatibility-progressive-enhancement.md`
- Conditional modify: this plan before any split file is created

- [ ] **Step 1: Measure the current candidate**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

path = Path("web-fullstack-course/02-css/10-property-reference/01-stable-properties-module-index.md")
text = path.read_text()
visible = re.sub(r"```.*?```", "", text, flags=re.S)
print(path, len(visible.splitlines()))
PY
```

Expected: a recorded visible-line count near the selective-split threshold.

- [ ] **Step 2: Decide `KEEP-LONG` or `SPLIT`**

Keep the file when it remains one stable searchable index or splitting would weaken discoverability. Split only when current audit finds multiple independently teachable references with independent exercises and acceptance and no duplicated index ownership.

- [ ] **Step 3: Amend this plan before a split**

If the decision is `SPLIT`, add exact child filenames, responsibility boundaries, old-heading destinations, CSS matrix changes, hub/README links, and content-conservation checks to this task, then rerun the plan self-check. No content split may precede that amendment.

- [ ] **Step 4: Replace the experimental/deprecated register**

The current third reference lesson conflicts with the approved zero-retention rule. Replace it with
`03-stable-compatibility-progressive-enhancement.md`, which teaches target-browser definition,
stable feature detection, base-first enhancement, keyboard/zoom/preference checks, evidence
classification, and rollback without naming or demonstrating obsolete, deprecated, non-standard,
preview-only, or draft-only technology. Update the Chapter 10 hub, README, matrix, adjacent lesson
navigation, and all other inbound links in the Batch 1 scope.

## 8. Task 6: Reconcile Navigation and Matrices

**Files:**
- Modify: `web-fullstack-course/00-guide/README.md`
- Modify: `web-fullstack-course/00-guide/06-coverage-map.md`
- Modify: `web-fullstack-course/02-css/README.md`
- Modify: `web-fullstack-course/02-css/CSS-COVERAGE.md`
- Modify: `web-fullstack-course/03-browser/README.md`
- Modify: `web-fullstack-course/03-browser/BROWSER-COVERAGE.md`

- [ ] **Step 1: Verify every README and hub route**

Require README → hub → lesson → adjacent lesson/hub links, plus matrix entry and chapter acceptance. Do not place whole-book counts in volume READMEs.

- [ ] **Step 2: Reconcile matrix evidence**

Require unique IDs and real links for theory, minimum case, project case, error diagnosis, exercise, and acceptance. Delete matrix claims whose linked lesson does not teach and verify the concept.

- [ ] **Step 3: Record cross-volume issues for Batch 7**

Write exact source path, link text, current target, required target, and reason to `/tmp/web-fullstack-modernization/batch-1/cross-volume-fixes.md`. Do not edit HTML in this batch.

## 9. Task 7: Static and Runtime Verification

**Files:**
- Test: all batch-owned Markdown
- Temporary extraction: `/tmp/web-fullstack-modernization/batch-1/extracted/`
- Modify with observed facts: `web-fullstack-course/VALIDATION.md`

- [ ] **Step 1: Verify detailed-lesson structure and fences**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course")
lessons = []
for directory in (
    root / "00-guide/03-computer-first-page",
    root / "00-guide/04-terminal-git-debugging",
):
    lessons.extend(directory.glob("*.md"))
for volume in ("02-css", "03-browser"):
    lessons.extend((root / volume).glob("[0-9][0-9]-*/*.md"))

assert len(lessons) >= 54, len(lessons)
for path in sorted(lessons):
    text = path.read_text()
    visible = re.sub(r"```.*?```", "", text, flags=re.S)
    assert re.findall(r"^## ([0-9]+)\.", visible, flags=re.M) == [str(i) for i in range(1, 14)], path
    for heading in ("## 任务卡", "## 我现在能做到什么", "## 单元导航"):
        assert heading in visible, (path, heading)
    assert sum(line.startswith("```") for line in text.splitlines()) % 2 == 0, path
print(f"Batch 1 lesson structure: PASS ({len(lessons)})")
PY
```

- [ ] **Step 2: Verify relative links and anchors**

Run the whole-book link-and-anchor script from Batch 7, filtered to failures originating in the three owned directories.

Expected: zero failures.

- [ ] **Step 3: Extract and parse representative examples**

Cover at least one complete example for CSS parsing, responsive/container behavior, reduced motion, HTTP cache validation, event-loop ordering, IndexedDB, Fetch cancellation, stream framing, Worker messaging, Service Worker update, offline fallback, and Web Vitals observation.

- [ ] **Step 4: Run Chromium paths**

Verify keyboard-only operation, focus visibility and recovery, 200% zoom, 320px viewport, reduced motion, forced colors where Chromium supports it, stale-request suppression, Worker recovery, offline restoration, and zero unhandled console errors.

- [ ] **Step 5: Run final batch gates**

Run:

```bash
rg -n -f /tmp/web-fullstack-modernization/batch-1/obsolete-patterns.txt \
  web-fullstack-course/00-guide/02-version-baseline.md \
  web-fullstack-course/02-css \
  web-fullstack-course/03-browser || true
git diff --check
git diff --name-status
git status --short
```

Expected: zero obsolete hits in the Batch 1-owned content and centralized version baseline, zero
whitespace errors, and no Batch 1 edit outside the declared scope plus `VALIDATION.md`. Record exact
hits in later volumes for their owning batches; the whole-book zero-hit gate remains owned by Batch 7.

- [ ] **Step 6: Obtain independent review**

Require file-and-line findings. Fix all blocking version, CSS correctness, browser security, accessibility, evidence, navigation, and split-decision findings; rerun affected checks until `PROCEED`.

- [ ] **Step 7: Record observed evidence and clean temporary files**

Update `VALIDATION.md` with exact commands, environments, passes, blocks, and manual gaps. Remove `/tmp/web-fullstack-modernization/batch-1/extracted/` after retaining only the summarized evidence in the course.
