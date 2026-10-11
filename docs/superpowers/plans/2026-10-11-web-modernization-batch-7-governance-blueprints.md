# Web Modernization Batch 7 Governance and Blueprints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the completed Web course as one internally consistent 50-week book, obtain whole-book `PROCEED`, and then create four review-only follow-up curriculum blueprints.

**Architecture:** Batch 7 consumes the completed evidence and cross-volume issue ledgers from Batches 1-6. It recalculates structure and statistics from disk, fixes only cross-book governance and exact HTML exceptions, runs whole-book static and representative regression checks, and dispatches non-overlapping independent reviews. The four blueprints are created only after the Web course passes every gate.

**Tech Stack:** Markdown, Python 3, ripgrep, Git read-only inspection, whole-book link/anchor/structure/coverage validators, representative Node/browser/config checks.

---

## 1. Entry Gate

**Files:**
- Read: all six modernization batch plans
- Read: `web-fullstack-course/VALIDATION.md`
- Read: batch evidence under `/tmp/web-fullstack-modernization/`

- [ ] **Step 1: Verify Batches 1-6 are complete**

For each batch, require:

```text
owned file audit complete
obsolete scan zero hits
static checks passing
runtime passes and environment blocks recorded
diff ownership passing
independent review PROCEED
```

Do not begin governance edits while any content batch has an unresolved blocking finding.

- [ ] **Step 2: Record the final pre-governance worktree**

Run:

```bash
mkdir -p /tmp/web-fullstack-modernization/batch-7
git branch --show-current
git status --short
git diff --name-status
git diff --stat
```

Expected: all existing changes are visible; no reset, restore, commit, push, or deployment occurs.

## 2. Scope and Ownership

**Files:**
- Modify: `web-fullstack-course/README.md`
- Modify: `web-fullstack-course/VALIDATION.md`
- Modify: `web-fullstack-course/00-guide/README.md`
- Modify: `web-fullstack-course/00-guide/01-learning-path.md`
- Modify: `web-fullstack-course/00-guide/02-version-baseline.md`
- Modify: `web-fullstack-course/00-guide/05-project-assessment.md`
- Modify: `web-fullstack-course/00-guide/06-coverage-map.md`
- Modify: `web-fullstack-course/00-guide/07-course-structure.md`
- Modify: `web-fullstack-course/00-guide/08-unit-writing-template.md`
- Modify: `web-fullstack-course/01-html/README.md`
- Modify: `web-fullstack-course/01-html/HTML-COVERAGE.md`
- Modify when exact cross-link or deterministic-error evidence exists: the 8 HTML chapter hubs
- Rename for the confirmed zero-retention exception:
  `web-fullstack-course/01-html/08-html-element-reference/03-deprecated-history-migration.md`
  to `web-fullstack-course/01-html/08-html-element-reference/03-current-selection-correction.md`
- Modify for that rename: `web-fullstack-course/01-html/08-html-element-reference.md`,
  `web-fullstack-course/01-html/README.md`, `web-fullstack-course/01-html/HTML-COVERAGE.md`,
  and adjacent lesson navigation in `02-attributes-dom-apis-default-behavior.md`
- Modify: `web-fullstack-course/02-css/README.md`
- Modify: `web-fullstack-course/02-css/CSS-COVERAGE.md`
- Modify: `web-fullstack-course/03-browser/README.md`
- Modify: `web-fullstack-course/03-browser/BROWSER-COVERAGE.md`
- Modify: `web-fullstack-course/04-javascript-typescript/README.md`
- Modify: `web-fullstack-course/04-javascript-typescript/JS-TS-COVERAGE.md`
- Modify: `web-fullstack-course/05-react/README.md`
- Modify: `web-fullstack-course/05-react/REACT-COVERAGE.md`
- Modify: `web-fullstack-course/06-vue/README.md`
- Modify: `web-fullstack-course/06-vue/VUE-COVERAGE.md`
- Modify: `web-fullstack-course/07-engineering/README.md`
- Modify: `web-fullstack-course/07-engineering/ENGINEERING-COVERAGE.md`
- Modify: `web-fullstack-course/08-backend/README.md`
- Modify: `web-fullstack-course/08-backend/BACKEND-COVERAGE.md`
- Modify: `web-fullstack-course/09-fullstack/README.md`
- Modify: `web-fullstack-course/09-fullstack/FULLSTACK-COVERAGE.md`
- Conditional modify: exact non-HTML hubs/lessons named by a cross-volume issue ledger
- Create after the Web gate passes: four blueprint files listed in Task 8

An HTML detailed lesson may be modified only after this plan is amended with its exact path, issue evidence, and verification command. Rewriting or re-splitting HTML is out of scope.

## 3. Task 1: Recalculate the Book from Disk

- [ ] **Step 1: Produce the physical inventory**

Run:

```bash
rg --files web-fullstack-course -g '*.md' \
  | sort \
  | tee /tmp/web-fullstack-modernization/batch-7/all-markdown.txt
wc -l /tmp/web-fullstack-modernization/batch-7/all-markdown.txt
```

Expected: one sorted record per current Markdown file. Use this result rather than any pre-modernization count.

- [ ] **Step 2: Classify current document types**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

root = Path("web-fullstack-course")
files = sorted(root.rglob("*.md"))
readmes = [p for p in files if p.name == "README.md"]
matrices = [p for p in files if p.name.endswith("-COVERAGE.md")]
details = [
    p for p in files
    if p.parent.name[:2].isdigit()
    and p.parent.parent != root
    and p.name[:2].isdigit()
]
print({
    "physical": len(files),
    "readmes": len(readmes),
    "coverage_matrices": len(matrices),
    "detail_candidates": len(details),
})
PY
```

Expected: actual current values are captured. Adjust the detailed-lesson classifier during execution only when inspection proves a path category is misclassified; document the final rule in `VALIDATION.md`.

- [ ] **Step 3: Recalculate per-volume hubs, lessons, matrices, and governance files**

Write `/tmp/web-fullstack-modernization/batch-7/counts.json` from the current tree. Every number published in root or validation documents must derive from this file and its documented classification rule.

## 4. Task 2: Reconcile the 50-Week Route, Domain, and Version Owners

**Files:**
- Modify: the listed `00-guide` governance files
- Modify: `web-fullstack-course/README.md`

- [ ] **Step 1: Verify 50 unique continuous weeks**

Parse the week table in `00-guide/01-learning-path.md`. Require exactly Weeks 01-50, no duplicate, no gap, valid linked volume, achievable prerequisites, and a concrete output/acceptance statement for every week.

- [ ] **Step 2: Verify ownership boundaries**

Ensure the version baseline owns exact version facts, project assessment owns business/security/domain rules, course structure owns document roles and counting rules, writing template owns lesson requirements, and validation owns observed evidence. Remove duplicated drifting tables from READMEs.

- [ ] **Step 3: Reconcile cross-volume contracts**

Check integer cents, UTC, listing/page/error fields, status values, same-origin session, CSRF, object authorization, reservation concurrency, idempotency, conflict behavior, test scenario names, and cleanup rules across all volume introductions and matrices.

- [ ] **Step 4: Apply exact cross-volume fixes**

Consume the issue ledgers from Batches 1-6. For each item, verify the source and target still exist, apply the smallest correction, and mark the ledger item resolved with the verification command.

## 5. Task 3: Reconcile HTML Exceptions

**Files:**
- Modify: `web-fullstack-course/01-html/README.md`
- Modify: `web-fullstack-course/01-html/HTML-COVERAGE.md`
- Modify when needed: the 8 stable HTML chapter hubs
- Conditional modify: exact HTML detailed lessons added to this plan before editing

- [ ] **Step 1: Check cross-volume HTML links**

Fix only links changed by modernized volume paths or anchors.

- [ ] **Step 2: Check shared terminology**

Update only current global terms, domain contracts, and version boundaries. Do not reopen HTML teaching structure.

- [ ] **Step 3: Check deterministic errors**

When a whole-book test proves a factual HTML error, add the exact lesson path and failing evidence to this plan, apply the minimal correction, and rerun the relevant HTML check.

The confirmed zero-retention exception is already authorized: rename
`08-html-element-reference/03-deprecated-history-migration.md` to
`08-html-element-reference/03-current-selection-correction.md`. Preserve its position as the third
lesson and its current element/attribute/API selection and deterministic correction workflow, but
remove obsolete technology names and historical migration teaching. Update every inbound link,
matrix row, hub entry, README route, and adjacent navigation. Verify the HTML lesson count remains
67 and the whole-book obsolete-pattern scan has no content or path hit.

- [ ] **Step 4: Recalculate HTML statistics**

Update README/matrix/root validation counts from the current tree. Preserve the existing 67-lesson split unless an exact deterministic error requires a content correction.

## 6. Task 4: Reconcile Every Volume README and Matrix

**Files:**
- Modify: the 9 volume README files from `01-html` through `09-fullstack`
- Modify: the 9 coverage matrices

- [ ] **Step 1: Enforce the common README skeleton**

Each volume README must contain:

```text
volume purpose and boundaries
chapter/lesson route
learning and run prerequisites
Neighbor Market progression
stage acceptance
current validation scope and explicit gaps
official references and cross-volume navigation
```

Framework or engineering-specific sections may remain, but exact whole-book counts and global version tables stay out of volume READMEs.

- [ ] **Step 2: Verify matrix uniqueness and evidence**

Every matrix row must have a globally unique ID, one valid primary lesson link, and links to real headings for theory, minimum case, project case, error diagnosis, exercise, and acceptance.

- [ ] **Step 3: Verify bidirectional ownership**

Every detailed lesson owns at least one matrix row. Every matrix primary lesson exists. Every row describes content actually present in that lesson; a status word is not evidence.

- [ ] **Step 4: Reconcile root coverage map**

Update `00-guide/06-coverage-map.md` to point to current matrix owners and summarize capability boundaries without duplicating matrix statistics.

## 7. Task 5: Run Whole-Book Static Verification

**Files:**
- Test: all Markdown under `web-fullstack-course/`
- Temporary reports: `/tmp/web-fullstack-modernization/batch-7/`

- [ ] **Step 1: Verify detailed-lesson structure and fences**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course")
lessons = [
    path
    for path in root.rglob("*.md")
    if path.name[:2].isdigit()
    and path.parent.name[:2].isdigit()
    and path.parent.parent != root
]
for path in lessons:
    text = path.read_text()
    visible = re.sub(r"```.*?```", "", text, flags=re.S)
    numbered = re.findall(r"^## ([0-9]+)\.", visible, flags=re.M)
    assert numbered == [str(i) for i in range(1, 14)], (path, numbered)
    for heading in ("## 任务卡", "## 我现在能做到什么", "## 单元导航"):
        assert heading in visible, (path, heading)
    assert sum(line.startswith("```") for line in text.splitlines()) % 2 == 0, path
print(f"Whole-book detailed lesson structure: PASS ({len(lessons)})")
PY
```

Expected: the count equals the recalculated detailed-lesson count and every Markdown fence is paired.

- [ ] **Step 2: Verify relative links and anchors**

Run:

```bash
python3 - <<'PY'
from collections import Counter
from pathlib import Path
from urllib.parse import unquote
import re

root = Path("web-fullstack-course")

def visible(text):
    return re.sub(r"```.*?```", "", text, flags=re.S)

def slug(text):
    text = re.sub(r"<[^>]+>", "", text).strip().lower()
    text = re.sub(r"[^\w\u4e00-\u9fff -]", "", text)
    return re.sub(r"\s+", "-", text)

anchors = {}
for path in root.rglob("*.md"):
    counts = Counter()
    values = set()
    for heading in re.findall(r"^#{1,6}\s+(.+?)\s*$", visible(path.read_text()), flags=re.M):
        base = slug(heading)
        index = counts[base]
        counts[base] += 1
        values.add(base if index == 0 else f"{base}-{index}")
    anchors[path.resolve()] = values

errors = []
for source in root.rglob("*.md"):
    text = visible(source.read_text())
    for target in re.findall(r"!?\[[^\]]*\]\(([^)\s]+)", text):
        if "://" in target or target.startswith(("mailto:", "tel:")):
            continue
        decoded = unquote(target)
        file_part, marker, anchor = decoded.partition("#")
        destination = (source.parent / file_part).resolve() if file_part else source.resolve()
        if file_part and not destination.exists():
            errors.append(f"{source}: missing file {target}")
            continue
        if marker and anchor and destination.suffix == ".md":
            if anchor not in anchors.get(destination, set()):
                errors.append(f"{source}: missing anchor {target}")
assert not errors, "\n".join(errors)
print("Whole-book relative links and anchors: PASS")
PY
```

Expected: `Whole-book relative links and anchors: PASS`.

- [ ] **Step 3: Verify coverage IDs**

Run:

```bash
python3 - <<'PY'
from collections import Counter
from pathlib import Path
import re

files = sorted(Path("web-fullstack-course").glob("[0-9][0-9]-*/*-COVERAGE.md"))
ids = []
for path in files:
    for line in path.read_text().splitlines():
        match = re.match(r"\|\s*([^|]+?)\s*\|", line)
        if not match:
            continue
        value = match.group(1).strip()
        if re.fullmatch(r"[A-Z][A-Z0-9-]*\d+", value) and value != "SHA-256":
            ids.append(value)
duplicates = [key for key, count in Counter(ids).items() if count > 1]
assert len(files) == 9, len(files)
assert not duplicates, duplicates
print(f"Whole-book coverage IDs: PASS ({len(ids)} unique)")
PY
```

- [ ] **Step 4: Build and run a final obsolete-pattern list**

Revisit every batch version audit, verify the rationale still holds, and create `/tmp/web-fullstack-modernization/batch-7/obsolete-patterns.txt`. Run:

```bash
rg -n -f /tmp/web-fullstack-modernization/batch-7/obsolete-patterns.txt \
  web-fullstack-course || true
```

Expected: zero hits, including historical, migration, FAQ, failure, and comparison prose.

- [ ] **Step 5: Verify unfinished markers and repository artifacts**

Run:

```bash
rg -n '\b(TO[D]O|TB[D]|FIX[M]E|WI[P])\b|待完[善]|自行补[充]|待编[写]' \
  web-fullstack-course || true
find web-fullstack-course -type d \
  \( -name node_modules -o -name dist -o -name coverage -o -name labs \) -print
find web-fullstack-course -type f \
  \( -name package.json -o -name pnpm-lock.yaml -o -name yarn.lock -o -name .env -o -name '*.key' -o -name '*.crt' -o -name '*.dump' \) -print
```

Expected: all three commands produce no findings.

- [ ] **Step 6: Verify 50 weeks**

Parse the week-number column and assert exactly `01` through `50` once each. Resolve every Markdown target in the week table.

- [ ] **Step 7: Verify whitespace and scope**

Run:

```bash
git diff --check
git diff --stat
git diff --name-status
git status --short
```

Expected: zero whitespace errors, no generated artifacts, and every changed path belongs to the approved modernization scope.

## 8. Task 6: Run Representative Whole-Book Regression

**Files:**
- Read: batch-specific current evidence and authoritative complete examples
- Temporary only: `/tmp/web-fullstack-modernization/batch-7/regression/`
- Modify after observed runs: `web-fullstack-course/VALIDATION.md`

- [ ] **Step 1: Select one risk-based path per volume**

Cover HTML forms/native interaction, CSS responsive/accessibility, browser cancellation/offline, JS/TS runtime parsing/tests, React flow/SSR, Vue flow/SSR, engineering aggregate gate, backend authorization/concurrency, and full-stack config/safety/restore path.

- [ ] **Step 2: Reuse current compatible fixtures, not stale outputs**

Run the smallest current command set that proves cross-volume contracts still align. When infrastructure is unavailable, preserve the content-batch environment block and rerun all available static guards.

- [ ] **Step 3: Verify no evidence inflation**

Check every statement in `VALIDATION.md` against a current command, retained prior dated run, or explicit block. Historical evidence must remain dated and cannot be relabelled as current.

## 9. Task 7: Independent Whole-Book Review

**Files:**
- Review: all modernized course and governance files
- Write temporary findings: `/tmp/web-fullstack-modernization/batch-7/review/`

- [ ] **Step 1: Dispatch non-overlapping read-only reviews**

Use these scopes:

```text
Review A: root governance, 00-guide, 01-html, 02-css, 03-browser
Review B: 04-javascript-typescript, 05-react, 06-vue, 07-engineering
Review C: 08-backend, 09-fullstack, VALIDATION.md, version/security/operations claims
Review D: all coverage matrices, cross-volume links, counts, week route, obsolete scan
```

- [ ] **Step 2: Require actionable findings**

Each finding must include severity, confidence, file, line, violated contract, observable impact, and minimal correction. Reviewers must not edit files.

- [ ] **Step 3: Fix and reverify in the owning scope**

Apply minimal fixes, rerun affected static/runtime checks, then return the correction to the original reviewer.

- [ ] **Step 4: Obtain whole-book `PROCEED`**

All four review scopes must return `PROCEED`. Otherwise the Web course gate remains closed and blueprint creation cannot begin.

## 10. Task 8: Create Four Review-Only Blueprints

**Files:**
- Create: `docs/superpowers/specs/2026-10-11-mobile-development-blueprint.md`
- Create: `docs/superpowers/specs/2026-10-11-mini-program-development-blueprint.md`
- Create: `docs/superpowers/specs/2026-10-11-ai-agent-development-blueprint.md`
- Create: `docs/superpowers/specs/2026-10-11-browser-extension-development-blueprint.md`

- [ ] **Step 1: Create the mobile development blueprint**

Include target learner and capability outcome, reused Web prerequisites, current stable native/cross-platform option comparison, recommended default and rationale, module structure, continuous project, testing/device/release evidence, acceptance, suggested weeks, and implementation order. Do not create mobile tutorials.

- [ ] **Step 2: Create the mini-program blueprint**

Include target ecosystems, reused Web prerequisites, current stable framework/platform option comparison, recommended default, lifecycle/data/network/storage/security boundaries, module structure, continuous project, device/tool verification, acceptance, suggested weeks, and implementation order. Do not create mini-program tutorials.

- [ ] **Step 3: Create the AI Agent blueprint**

Respect local-first privacy, physical isolation, low initial budget, and BYOK. Compare current stable orchestration/tooling options, recommend a minimal local architecture, define model/tool/memory/evaluation/safety/observability modules, continuous project, evidence, acceptance, suggested weeks, and implementation order. Do not create Agent tutorials.

- [ ] **Step 4: Create the browser extension blueprint**

Use current stable extension platform rules. Compare browser support and framework options, recommend a default, define manifest/service-worker/content-script/UI/storage/permissions/security/testing/publishing modules, continuous project, evidence, acceptance, suggested weeks, and implementation order. Do not create extension tutorials.

- [ ] **Step 5: Verify all blueprint contracts**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("docs/superpowers/specs/2026-10-11-mobile-development-blueprint.md"),
    Path("docs/superpowers/specs/2026-10-11-mini-program-development-blueprint.md"),
    Path("docs/superpowers/specs/2026-10-11-ai-agent-development-blueprint.md"),
    Path("docs/superpowers/specs/2026-10-11-browser-extension-development-blueprint.md"),
]
required = [
    "培养目标",
    "前置知识",
    "技术选型",
    "模块结构",
    "连续项目",
    "验收标准",
    "复用关系",
    "建议周数",
    "实施顺序",
]
for path in paths:
    text = path.read_text()
    for heading in required:
        assert heading in text, (path, heading)
print("Follow-up blueprints: PASS (4)")
PY
```

Expected: `Follow-up blueprints: PASS (4)`.

- [ ] **Step 6: Stop for user review**

Deliver the four blueprint links and the final Web validation summary. Do not implement any blueprint until the user explicitly approves its direction and scope.

## 11. Task 9: Final Diff and Completion Record

- [ ] **Step 1: Re-run every whole-book static gate**

Expected: zero broken links/anchors, duplicate coverage IDs, unfinished markers, obsolete hits, fence errors, whitespace errors, or repository artifacts.

- [ ] **Step 2: Recalculate final statistics again**

Update `VALIDATION.md` and any permitted root summary from current disk state after all review fixes and blueprint creation. Do not copy pre-review numbers.

- [ ] **Step 3: Verify the final diff**

Run:

```bash
git diff --check
git diff --stat
git diff --name-status
git status --short
```

Expected: the diff contains only approved course modernization, plan/spec documents, exact HTML exceptions, validation updates, and four blueprints.

- [ ] **Step 4: Record completion without remote actions**

The completion summary must list actual changes, exact verification commands and results, environment/manual gaps, all reviewer outcomes, and the four blueprint paths. Keep the branch local; do not commit, push, deploy, publish, or modify external systems.
