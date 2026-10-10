# Full Course Textbook Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand every non-HTML course volume into the same two-level, evidence-driven textbook structure as the completed HTML volume.

**Architecture:** Preserve all existing numbered Markdown paths as chapter hubs. Add 202 detailed lessons under same-named directories, add eight auditable coverage matrices, then reconcile navigation and validation across the whole book. Code remains embedded in Markdown and is extracted only to `/tmp` for verification.

**Tech Stack:** Markdown, HTML/CSS/JavaScript/TypeScript, React 19.3, Vue 3.5.43, Node.js 24, pnpm, Vite 8, ESLint 10, NestJS 12, PostgreSQL 18, Redis/BullMQ, Docker Compose, Nginx, Chromium.

---

## 1. Governing Documents

- Design: `docs/superpowers/specs/2026-10-11-full-course-textbook-expansion-design.md`
- HTML quality baseline: `web-fullstack-course/01-html/README.md`
- Domain contract: `web-fullstack-course/00-guide/05-project-assessment.md`
- Version baseline: `web-fullstack-course/00-guide/02-version-baseline.md`
- Existing validation evidence: `web-fullstack-course/VALIDATION.md`

The design document is the contract. A lesson is not complete merely because the file exists.

## 2. Working Rules

- Modify only the volume assigned to the active task, plus the plan checkbox for that task.
- Never edit the same file concurrently from two agents.
- Preserve existing numbered paths and cross-links.
- Use `apply_patch` for repository edits.
- Do not add `labs/`, package manifests, lock files, build output, downloaded media, databases, certificates, environment files, or container state.
- Temporary extracted projects belong under `/tmp/full-course-verification/` and must be removed after checks.
- Prices use integer cents. Stored timestamps use UTC ISO 8601.
- Mark mock, static, in-memory, local-only, and unverified infrastructure honestly.
- Do not weaken existing tests or erase documented validation gaps.

## 3. Detailed Lesson Structure Check

Every new detailed lesson must pass:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course")
lesson_roots = [
    root / "00-guide/03-computer-first-page",
    root / "00-guide/04-terminal-git-debugging",
    root / "02-css",
    root / "03-browser",
    root / "04-javascript-typescript",
    root / "05-react",
    root / "06-vue",
    root / "07-engineering",
    root / "08-backend",
    root / "09-fullstack",
]
lessons = []
for lesson_root in lesson_roots:
    if lesson_root.is_dir() and lesson_root.name[:2].isdigit():
        lessons.extend(lesson_root.glob("*.md"))
    elif lesson_root.is_dir():
        lessons.extend(lesson_root.glob("*/*.md"))

expected = [str(index) for index in range(1, 14)]
for lesson in sorted(set(lessons)):
    text = lesson.read_text()
    visible = re.sub(r"```.*?```", "", text, flags=re.S)
    actual = re.findall(r"^## ([0-9]+)\.", visible, flags=re.M)
    assert actual == expected, (lesson, actual)
    for heading in (
        "## 任务卡",
        "## 我现在能做到什么",
        "## 单元导航",
    ):
        assert heading in visible, (lesson, heading)
    assert text.count("```") % 2 == 0, lesson
print(f"Detailed lesson structure: PASS ({len(set(lessons))} lessons)")
PY
```

Final expected result: `Detailed lesson structure: PASS (202 lessons)`.

## 4. Cross-Book Link Check

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course")
errors = []
for file_path in root.rglob("*.md"):
    text = re.sub(r"```.*?```", "", file_path.read_text(), flags=re.S)
    for target in re.findall(r"\[[^\]]+\]\(([^)\s]+)", text):
        if "://" in target or target.startswith(("#", "mailto:", "tel:")):
            continue
        path_part = target.split("#", 1)[0]
        if path_part and not (file_path.parent / path_part).resolve().exists():
            errors.append(f"{file_path}: {target}")
assert not errors, "\n".join(errors)
print("Course relative Markdown links: PASS")
PY
```

## 5. Batch Plans

| Batch | Plan | Deliverables |
| --- | --- | ---: |
| A | `2026-10-11-course-batch-a-foundations-css-browser.md` | 54 lessons |
| B | `2026-10-11-course-batch-b-javascript-typescript.md` | 27 lessons |
| C | `2026-10-11-course-batch-c-react-vue.md` | 48 lessons |
| D | `2026-10-11-course-batch-d-engineering.md` | 22 lessons |
| E | `2026-10-11-course-batch-e-backend.md` | 31 lessons |
| F | `2026-10-11-course-batch-f-fullstack.md` | 20 lessons |
| G | this plan | navigation, validation, final audit |

Each batch plan must exist and pass placeholder and whitespace checks before its implementation starts.

## 6. Task 1: Freeze Design and Plans

**Files:**
- Create: `docs/superpowers/specs/2026-10-11-full-course-textbook-expansion-design.md`
- Create: `docs/superpowers/plans/2026-10-11-full-course-textbook-expansion.md`
- Create: six batch plans listed in Section 5

- [x] **Step 1: Audit all existing non-HTML volumes**

Record file counts, line counts, runnable examples, historical validation, version risks, and proposed lesson boundaries.

- [x] **Step 2: Commit the approved design**

Expected commit: `docs: design full course textbook expansion`.

- [x] **Step 3: Write all six batch plans**

Each plan must list every new lesson path, its responsibility, affected hub, coverage matrix, verification, and commit boundary.

- [x] **Step 4: Verify plan arithmetic**

Run:

```bash
python3 - <<'PY'
counts = {
    "guide": 6,
    "css": 30,
    "browser": 18,
    "javascript-typescript": 27,
    "react": 24,
    "vue": 24,
    "engineering": 22,
    "backend": 31,
    "fullstack": 20,
}
assert sum(counts.values()) == 202
assert 106 + 202 + 8 == 316
print("Plan arithmetic: PASS")
PY
```

- [x] **Step 5: Commit all implementation plans**

```bash
git add docs/superpowers/plans/2026-10-11-course-batch-*.md \
  docs/superpowers/plans/2026-10-11-full-course-textbook-expansion.md
git commit -m "docs: plan full course textbook expansion"
```

## 7. Task 2: Execute Batch A

**Files:**
- Modify: `web-fullstack-course/00-guide/03-computer-first-page.md`
- Modify: `web-fullstack-course/00-guide/04-terminal-git-debugging.md`
- Modify: `web-fullstack-course/02-css/**/*.md`
- Modify: `web-fullstack-course/03-browser/**/*.md`

- [x] Follow every task in `2026-10-11-course-batch-a-foundations-css-browser.md`.
- [x] Verify exactly 54 new detailed lessons.
- [x] Verify CSS and browser coverage matrices.
- [x] Extract and validate representative HTML, CSS, JavaScript, server, Worker, Service Worker, stream, storage, and DevTools examples.
- [x] Commit only Batch A paths.

## 8. Task 3: Execute Batch B

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/**/*.md`

- [x] Follow every task in `2026-10-11-course-batch-b-javascript-typescript.md`.
- [x] Verify exactly 27 new detailed lessons.
- [x] Run Node syntax and `node:test` checks on extracted examples.
- [x] Compile TypeScript examples using their declared TS 7 or TS 6 path.
- [x] Commit only JavaScript / TypeScript paths.

## 9. Task 4: Execute Batch C

**Files:**
- Modify: `web-fullstack-course/05-react/**/*.md`
- Modify: `web-fullstack-course/06-vue/**/*.md`

- [x] Follow every task in `2026-10-11-course-batch-c-react-vue.md`.
- [x] Verify exactly 24 React and 24 Vue detailed lessons.
- [x] Preserve equal business scope and shared API contracts.
- [x] Run extracted type checks, unit tests, builds, SSR checks, and representative Chromium E2E.
- [x] Commit React and Vue separately.

## 10. Task 5: Execute Batch D

**Files:**
- Modify: `web-fullstack-course/07-engineering/**/*.md`

- [ ] Follow every task in `2026-10-11-course-batch-d-engineering.md`.
- [ ] Verify exactly 22 detailed lessons.
- [ ] Rebuild the capstone in a fresh `/tmp` directory.
- [ ] Run format, lint, TS 7, TS 6 compatibility, unit, integration, build, budget, and E2E gates.
- [ ] Update `SELF-CHECK.md` using observed results only.
- [ ] Commit only engineering paths.

## 11. Task 6: Execute Batch E

**Files:**
- Modify: `web-fullstack-course/08-backend/**/*.md`

- [ ] Follow every task in `2026-10-11-course-batch-e-backend.md`.
- [ ] Verify exactly 31 detailed lessons.
- [ ] Statically validate TypeScript, SQL, JSON, environment templates, OpenAPI, Redis and queue examples.
- [ ] Run real HTTP/database tests only when the declared PostgreSQL environment is available.
- [ ] Preserve the exact reason and evidence for every environment-blocked check.
- [ ] Commit only backend paths.

## 12. Task 7: Execute Batch F

**Files:**
- Modify: `web-fullstack-course/09-fullstack/**/*.md`

- [ ] Follow every task in `2026-10-11-course-batch-f-fullstack.md`.
- [ ] Verify exactly 20 detailed lessons.
- [ ] Validate Dockerfile, Compose, Nginx, CI, shell, backup and restore examples with available local tools.
- [ ] Do not claim hosted CI, production TLS, registry, rollout or disaster recovery without actual evidence.
- [ ] Commit only full-stack paths.

## 13. Task 8: Reconcile Navigation and Counts

**Files:**
- Modify: `web-fullstack-course/README.md`
- Modify: `web-fullstack-course/VALIDATION.md`
- Modify: `web-fullstack-course/00-guide/01-learning-path.md`
- Modify: `web-fullstack-course/00-guide/05-project-assessment.md`
- Modify: `web-fullstack-course/00-guide/06-coverage-map.md`
- Modify: every non-HTML volume `README.md`

- [ ] Route every volume README to all chapter hubs, detailed lessons, coverage matrix, and final acceptance.
- [ ] Recalculate the root count using the current exclusion rule.
- [ ] Expected count: 316 content and coverage documents.
- [ ] Replace the stale 81-document statement in `VALIDATION.md`.
- [ ] Preserve historical validation dates and distinguish new verification from old evidence.
- [ ] Run the repository-wide link check.

## 14. Task 9: Static Verification

- [ ] Verify 202 detailed lesson files.
- [ ] Verify 8 coverage matrices and unique IDs.
- [ ] Verify all 202 lessons have the 13-section contract.
- [ ] Verify no unfinished markers:

```bash
rg -n '\b(TO[D]O|TB[D]|FIX[M]E|WI[P])\b|待完[善]|自行补[充]|占位[符]' \
  web-fullstack-course || true
```

- [ ] Verify no repository artifacts:

```bash
find web-fullstack-course -type d \
  \( -name node_modules -o -name dist -o -name coverage -o -name labs \) -print
find web-fullstack-course -type f \
  \( -name package.json -o -name pnpm-lock.yaml -o -name yarn.lock -o -name .env \) -print
```

- [ ] Run `git diff --check`.

## 15. Task 10: Example Verification

- [ ] Extract all complete-file blocks to `/tmp/full-course-verification/`.
- [ ] Parse every structured configuration with the appropriate available parser.
- [ ] Run JavaScript syntax checks.
- [ ] Run declared TypeScript and framework checks in isolated temporary projects.
- [ ] Run pure domain assertions for cents, UTC, pagination, conflicts, authorization and transaction state.
- [ ] Run representative browser flows for every frontend-oriented volume.
- [ ] Record tool absence or environment failure as a gap, not a pass.
- [ ] Remove temporary verification directories.

## 16. Task 11: Independent Review

- [ ] Dispatch independent reviewers by non-overlapping volume groups.
- [ ] Require file and line references for every finding.
- [ ] Fix all blocking correctness, safety, structure, navigation and evidence issues.
- [ ] Re-run affected checks after every fix.
- [ ] Obtain `PROCEED` from all reviewers.

## 17. Task 12: Final Audit and Commit

- [ ] Compare every design requirement with current files and verification evidence.
- [ ] Sample at least one coverage row from every prefix in every matrix.
- [ ] Review `git diff --stat`, `git diff --check`, commit scope, and worktree status.
- [ ] Confirm user files outside the task were not staged.
- [ ] Commit final navigation and validation corrections.
- [ ] Confirm the task branch is kept locally and not pushed.

## 18. Completion Evidence

Retain these final results:

```text
202 new detailed lessons
8 new coverage matrices
66 stable chapter hubs
316 content/reference/coverage documents under the current root count rule
0 broken relative links
0 unfinished markers
0 whitespace errors
0 repository labs/package/lock/build artifacts
all statically verifiable examples passing
representative runtime/browser paths recorded
environment and manual gaps explicitly documented
independent reviewers: PROCEED
task-scope worktree: clean
```
