# Web Full-Stack Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the non-HTML Web full-stack course, remove obsolete technology completely, preserve valid teaching assets, and close the book with verified navigation, evidence, and four review-only follow-up blueprints.

**Architecture:** Execute seven isolated batches in dependency order. Each content batch audits current files before editing, verifies versions from primary sources, applies the smallest complete replacement, uses a gated selective-split process, and passes static, runtime, diff, and independent-review gates before the next batch starts. Batch 7 alone reconciles whole-book governance and creates the four follow-up blueprints.

**Tech Stack:** Markdown, Python 3 validation scripts, ripgrep, Git read-only inspection, Node.js LTS, pnpm, browser platform APIs, React, Vue, Vite, TypeScript, ESLint, Vitest, Playwright, NestJS, PostgreSQL, Redis, BullMQ, Docker Compose, Nginx, Chromium.

---

## 1. Governing Contract

- Approved design: `docs/superpowers/specs/2026-10-11-web-fullstack-modernization-design.md`
- Version owner: `web-fullstack-course/00-guide/02-version-baseline.md`
- Domain owner: `web-fullstack-course/00-guide/05-project-assessment.md`
- Structure owner: `web-fullstack-course/00-guide/07-course-structure.md`
- Writing contract: `web-fullstack-course/00-guide/08-unit-writing-template.md`
- Whole-book evidence owner: `web-fullstack-course/VALIDATION.md`

The approved design is the requirements contract. The older expansion design and Batch A-F plans document completed historical work; they do not authorize retaining an obsolete technique, forcing a fixed lesson count, or mechanically splitting a long lesson.

## 2. Non-Negotiable Boundaries

- Modify `web-fullstack-course/00-guide/` and `web-fullstack-course/02-css/` through `web-fullstack-course/09-fullstack/` only in their assigned batches.
- Modify `web-fullstack-course/01-html/` only for confirmed cross-volume links, terminology, deterministic errors, and final statistics.
- Do not reset, restore, overwrite, or reformat the existing Batch 0 and HTML worktree changes.
- Do not add application source trees, package manifests, lock files, dependencies, build output, databases, certificates, dumps, screenshots, browser profiles, or caches to the course repository.
- Put all extracted examples and generated validation artifacts under `/tmp/web-fullstack-modernization/`.
- Do not commit, push, deploy, publish, migrate a shared database, or write to an external system. A later explicit authorization is required for those actions.
- Do not report Safari, Firefox, assistive technology, hosted CI, container runtime, PostgreSQL 18, public TLS, production capacity, backup recovery, or deployment as passing unless that exact environment was exercised.

## 3. Batch Dependency Graph

```text
Batch 1: guide + CSS + browser
    ↓
Batch 2: JavaScript / TypeScript
    ↓
Batch 3: React + Vue parity
    ↓
Batch 4: engineering toolchain
    ↓
Batch 5: backend
    ↓
Batch 6: full-stack delivery
    ↓
Batch 7: whole-book governance + independent review + four blueprints
```

Framework and engineering plans may be revised after an earlier batch changes a shared version or contract. Such a revision must preserve the approved design and receive the same plan self-check before execution continues.

## 4. Batch Plans

| Batch | Plan | Exclusive content ownership |
| --- | --- | --- |
| 1 | `docs/superpowers/plans/2026-10-11-web-modernization-batch-1-foundations-css-browser.md` | `00-guide`, `02-css`, `03-browser` |
| 2 | `docs/superpowers/plans/2026-10-11-web-modernization-batch-2-javascript-typescript.md` | `04-javascript-typescript` |
| 3 | `docs/superpowers/plans/2026-10-11-web-modernization-batch-3-react-vue.md` | `05-react`, `06-vue` |
| 4 | `docs/superpowers/plans/2026-10-11-web-modernization-batch-4-engineering.md` | `07-engineering` |
| 5 | `docs/superpowers/plans/2026-10-11-web-modernization-batch-5-backend.md` | `08-backend` |
| 6 | `docs/superpowers/plans/2026-10-11-web-modernization-batch-6-fullstack.md` | `09-fullstack` |
| 7 | `docs/superpowers/plans/2026-10-11-web-modernization-batch-7-governance-blueprints.md` | root governance, final cross-book corrections, four blueprints |

## 5. Shared Execution Protocol

Every batch must perform these actions in order.

### Task 1: Freeze the Worktree Baseline

**Files:**
- Read: `.git/` state through non-mutating Git commands
- Read: the batch-owned Markdown paths
- Write temporary inventory: the exact Batch 1-7 path declared by the active batch plan

- [ ] **Step 1: Record branch, status, and pre-existing changes**

Run the branch, status, inventory, and diff commands in the active batch plan.

Expected: the active branch and all existing Batch 0/HTML changes are visible; the repository remains unchanged.

- [ ] **Step 2: Record the exact batch inventory**

Use the inventory command from the active batch plan and save its sorted output under that batch's `/tmp` directory.

Expected: every chapter hub, detailed lesson, README, matrix, and batch-specific evidence file appears once.

- [ ] **Step 3: Enforce ownership before every edit**

Compare changed paths with the active batch allowlist. Stop and repair the plan when a required path falls outside the allowlist; do not silently broaden scope.

### Task 2: Build Version and Obsolescence Evidence

**Files:**
- Modify when evidence changes: `web-fullstack-course/00-guide/02-version-baseline.md`
- Write temporary evidence: the exact version-audit path declared by the active batch plan
- Write temporary denylist: the exact obsolete-pattern path declared by the active batch plan

- [ ] **Step 1: Query primary sources in the order defined by the design**

For each runtime, framework, tool, database, browser mechanism, and configuration system owned by the batch, record:

```text
technology | stable/LTS choice | support date | compatibility constraints
primary URL | release/support evidence | course files affected
obsolete name/config/API | current replacement | removal proof
```

Expected: every version or deprecation decision has a primary source and an affected-file list. Search snippets and third-party articles are not sufficient evidence.

- [ ] **Step 2: Freeze a batch denylist**

Seed the denylist with known obsolete course paths relevant to the batch, then add every officially removed, unsupported, or superseded item found during research. Each line is a ripgrep-compatible pattern.

Expected: every denylist entry has a replacement and primary-source rationale in `version-audit.md`.

- [ ] **Step 3: Update the centralized version baseline before dependent prose**

Change `web-fullstack-course/00-guide/02-version-baseline.md` only when the verified fact differs from the current statement. Remove old-version history and migration teaching rather than retaining it as comparison material.

Expected: one current compatible stack is stated; preview channels and unsupported versions are absent.

### Task 3: Audit and Modernize Content

**Files:**
- Modify: only the files listed in the active batch plan

- [ ] **Step 1: Classify every owned lesson**

Record one or more actions for every file:

```text
KEEP | CORRECT | REPLACE | ADD-CLOSURE | SPLIT-CANDIDATE
```

The record must name the exact heading and the observable reason. A file cannot disappear from the ledger.

- [ ] **Step 2: Apply replacements as complete teaching changes**

For each obsolete or incorrect path, update theory, APIs/configuration, runnable code, failure case, exercises, expected evidence, cleanup, official references, matrix ownership, and navigation.

Expected: the old name, command, configuration, architecture, and historical explanation have zero course hits.

- [ ] **Step 3: Close missing knowledge loops**

Add only requirements named by the approved design or exposed by a concrete matrix/content mismatch. Each addition must include theory, minimum case, Neighbor Market case, diagnosis, exercise, and acceptance.

Expected: no standalone glossary row or matrix row is used to claim a teaching loop that the lesson does not contain.

### Task 4: Apply the Selective-Split Gate

**Files:**
- Audit: every owned lesson over 900 visible Markdown lines
- Conditional plan update: the active batch plan
- Conditional content changes: exact paths added to the active batch plan before splitting

- [ ] **Step 1: Measure visible lines and topic ownership**

Strip fenced code only for the visible-line measurement, then record:

```text
path | visible lines | independent topics | independent exercises
independent acceptance | complete-project owners | duplication risk
```

- [ ] **Step 2: Decide with all four required conditions**

Mark `SPLIT` only when the lesson is over the normal threshold, owns at least two independently learnable topics, supports separate practice and acceptance, and can be split without copying a complete project. Otherwise mark `KEEP-LONG` with the applicable Capstone, runbook, index, or inseparability reason.

- [ ] **Step 3: Add exact child paths before creating them**

When the decision is `SPLIT`, amend the active batch plan with every exact create/modify/delete path, content ownership, old-to-new heading map, link updates, and verification commands. Run the plan checks in Section 8 before creating content.

Expected: no unplanned split file is created and no long file is split only because of line count.

### Task 5: Verify the Batch

**Files:**
- Modify with observed evidence only: `web-fullstack-course/VALIDATION.md`
- Write temporary extraction: the exact extraction path declared by the active batch plan

- [ ] **Step 1: Run batch structural and link checks**

Run the exact scripts in the active batch plan.

Expected: fixed lesson structure, closed fences, resolvable relative links and anchors, unique matrix IDs, and complete navigation.

- [ ] **Step 2: Run obsolescence and unfinished-marker scans**

Run the exact obsolete-pattern command in the active batch plan, then run:

```bash
rg -n '\b(TO[D]O|TB[D]|FIX[M]E|WI[P])\b|待完[善]|自行补[充]|待编[写]' \
  web-fullstack-course || true
```

Expected: zero course hits. A justified current use must be removed from the denylist and documented; it cannot be ignored inline.

- [ ] **Step 3: Run representative code and runtime checks**

Extract complete examples to the batch `/tmp` directory. Run the declared parser, compiler, test, build, browser, database, or configuration checks. Capture exact environment blocks without converting them to passes.

- [ ] **Step 4: Review the final batch diff**

Run:

```bash
git diff --check
git diff --stat
git diff --name-status
git status --short
```

Expected: zero whitespace errors, no generated repository artifacts, and no changed path outside the batch allowlist plus explicitly permitted shared governance files.

- [ ] **Step 5: Obtain independent review**

The reviewer checks correctness, current-version claims, zero-retention compliance, teaching closure, split decisions, links, code evidence, security boundaries, and overclaims. Fix every blocking finding and rerun affected checks until the reviewer returns `PROCEED`.

- [ ] **Step 6: Update observed validation facts**

Append or revise only facts from commands actually run in the current batch. Preserve environment blocks and manual gaps. Do not copy expected output into `VALIDATION.md` as observed output.

## 6. Cross-Batch Quality Gates

A batch is complete only when all are true:

- Every owned Markdown file appears in the audit ledger.
- Every version statement is current, compatible, and source-backed.
- The batch denylist has zero course hits.
- Every replacement preserves or improves the original learning objective.
- Every detailed lesson retains the fixed task card, sections `1..13`, capability summary, and unit navigation.
- Coverage IDs are unique and point to real evidence headings.
- Relative links and anchors resolve.
- Extracted examples pass their declared checks or carry an explicit environment block.
- `git diff --check` passes.
- No task-external path changed.
- Independent review returns `PROCEED`.

## 7. Batch 7 Release Condition

Batch 7 must not create follow-up blueprints until Batches 1-6 each have:

```text
content audit: complete
obsolete-term scan: zero hits
static verification: pass
declared runtime verification: pass or explicit environment block
diff review: pass
independent review: PROCEED
```

Only after that gate may Batch 7 create:

- `docs/superpowers/specs/2026-10-11-mobile-development-blueprint.md`
- `docs/superpowers/specs/2026-10-11-mini-program-development-blueprint.md`
- `docs/superpowers/specs/2026-10-11-ai-agent-development-blueprint.md`
- `docs/superpowers/specs/2026-10-11-browser-extension-development-blueprint.md`

These files are proposals for user review. They do not authorize tutorial implementation.

## 8. Plan-Set Self-Check

- [ ] **Step 1: Verify all plan files exist**

Run:

```bash
for file in \
  docs/superpowers/plans/2026-10-11-web-fullstack-modernization.md \
  docs/superpowers/plans/2026-10-11-web-modernization-batch-1-foundations-css-browser.md \
  docs/superpowers/plans/2026-10-11-web-modernization-batch-2-javascript-typescript.md \
  docs/superpowers/plans/2026-10-11-web-modernization-batch-3-react-vue.md \
  docs/superpowers/plans/2026-10-11-web-modernization-batch-4-engineering.md \
  docs/superpowers/plans/2026-10-11-web-modernization-batch-5-backend.md \
  docs/superpowers/plans/2026-10-11-web-modernization-batch-6-fullstack.md \
  docs/superpowers/plans/2026-10-11-web-modernization-batch-7-governance-blueprints.md
do
  test -f "$file" || exit 1
done
echo "Modernization plan set: PASS (8 files)"
```

Expected: `Modernization plan set: PASS (8 files)`.

- [ ] **Step 2: Verify required headers and tracking syntax**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

plans = sorted(Path("docs/superpowers/plans").glob("2026-10-11-web-*modernization*.md"))
assert len(plans) == 8, len(plans)
for path in plans:
    text = path.read_text()
    assert "REQUIRED SUB-SKILL:" in text, path
    assert "**Goal:**" in text, path
    assert "**Architecture:**" in text, path
    assert "**Tech Stack:**" in text, path
    assert "- [ ]" in text, path
print("Modernization plan headers: PASS")
PY
```

Expected: `Modernization plan headers: PASS`.

- [ ] **Step 3: Verify forbidden placeholders and whitespace**

Run:

```bash
rg -n '\b(TB[D]|TO[D]O|FIX[M]E|WI[P])\b|fill[ ]in details|implement[ ]later|待补[充]|待编[写]' \
  docs/superpowers/plans/2026-10-11-web-*modernization*.md || true
git diff --check -- docs/superpowers/specs/2026-10-11-web-fullstack-modernization-design.md \
  docs/superpowers/plans/2026-10-11-web-*modernization*.md
```

Expected: both commands produce no findings.

## 9. Completion Evidence

The modernization is complete only when the final record contains:

```text
Batches 1-6 independent review: PROCEED
whole-book independent review: PROCEED
obsolete technology scan: zero hits
unfinished marker scan: zero hits
relative link and anchor failures: zero
coverage ID duplicates and unresolved evidence links: zero
Markdown structure and fence failures: zero
repository artifacts: zero
50-week route: continuous and unique
runtime checks: exact passes and explicit environment blocks
task-external changes: zero
follow-up blueprints: 4 review-only documents
remote writes and deployments: zero
```
