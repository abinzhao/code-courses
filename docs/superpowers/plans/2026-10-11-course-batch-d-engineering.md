# Course Batch D Engineering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Convert the seven engineering chapters into 22 detailed, independently runnable textbook lessons with stable chapter hubs, an auditable engineering coverage matrix, and evidence-based self-check results.

**Architecture:** Keep every existing numbered Markdown file as a stable chapter hub and add a same-named directory containing three detailed lessons for Chapters 01-06 and four detailed lessons for Chapter 07. Preserve one cumulative `market-engineering-capstone` contract across the volume, place executable examples only in Markdown, reconstruct them under `/tmp/full-course-verification/batch-d/` for verification, and record only observed results.

**Tech Stack:** Markdown, Node.js 24.21.0, pnpm 12.10.1, Vite 8.3.0, TypeScript 7.0.2, TypeScript 6 compatibility compiler/API, ESLint 10.12.0, Prettier 3.8.0, Vitest 5.0.0, Playwright 1.64.0, Chromium.

---

## 1. Governing Contract

Read these files before changing the engineering volume:

- `docs/superpowers/specs/2026-10-11-full-course-textbook-expansion-design.md`
- `docs/superpowers/plans/2026-10-11-full-course-textbook-expansion.md`
- `web-fullstack-course/00-guide/02-version-baseline.md`
- `web-fullstack-course/00-guide/05-project-assessment.md`
- every existing file under `web-fullstack-course/07-engineering/`

Every new lesson must use this exact top-level sequence:

```text
# 教程标题
## 任务卡
## 1. 任务背景
## 2. 学习目标
## 3. 预备知识
## 4. 核心理论
## 5. 元素、属性、API 或配置清单
## 6. 最小可运行案例
## 7. 邻里集市集成案例
## 8. 常见错误与排查路径
## 9. 课后题
## 10. 实践练习
## 11. 阶段验收
## 12. 常见问题
## 13. 扩展阅读
## 我现在能做到什么
## 单元导航
```

Each lesson must provide:

- exact file locations, creation commands, run commands, expected output, and failure evidence;
- commands, configuration keys, file roles, and tool versions in Section 5;
- one observable minimal case and one cumulative Neighbor Market case;
- one deliberately incorrect case and a record using “现象、证据、原因、修复、复验”;
- basic, advanced, and failure-injection exercises with answers or deterministic acceptance criteria;
- official references with a `2026-10-11` snapshot date;
- links to its chapter hub, previous lesson, and next lesson;
- explicit labels for local-only, mock, static, in-memory, or environment-blocked behavior.

The lessons must preserve these boundaries:

- Prices are non-negative safe integer cents; persisted timestamps are UTC ISO 8601.
- External JSON remains `unknown` until runtime parsing succeeds.
- TS 7.0.2 is the primary CLI; the `typescript` package name remains the TS 6 compatibility API used by old-API tooling.
- Vite transpilation does not replace type checking; build success does not replace Lint, tests, browser behavior, or deployment verification.
- Public client variables, browser bundles, and Source Maps cannot contain secrets.
- A mock API, route interception, or local preview does not prove authentication, authorization, transactions, production caching, or rollback.
- No package manifest, lock file, dependency directory, build output, browser download, or `labs/` directory may be added to the repository.
- A complete capstone file appears once in the four Chapter 07 lessons; later lessons refer to its path and show only the exact changed block, command, or assertion.

## 2. Task 1: Split pnpm, Vite, and ESM

**Files:**
- Modify: `web-fullstack-course/07-engineering/01-pnpm-vite-esm.md`
- Create: `web-fullstack-course/07-engineering/01-pnpm-vite-esm/01-node-pnpm-manifests-lockfiles.md`
- Create: `web-fullstack-course/07-engineering/01-pnpm-vite-esm/02-vite-esm-dev-build-preview.md`
- Create: `web-fullstack-course/07-engineering/01-pnpm-vite-esm/03-ts7-ts6-parallel-typecheck.md`

- [x] **Step 1: Write `01-node-pnpm-manifests-lockfiles.md`**

Explain Node versus pnpm responsibilities, `package.json`, `packageManager`, `engines`, direct and transitive versions, generated `pnpm-lock.yaml`, pnpm’s content-addressed store, `node_modules`, clean installation, frozen installation, current-directory mistakes, and permission-safe recovery. Build the first Neighbor Market shell with integer-cent data, prove that removing installation output is recoverable, and prove that a manifest/lock mismatch fails without weakening the frozen gate.

- [x] **Step 2: Write `02-vite-esm-dev-build-preview.md`**

Explain browser ESM, Node package ESM, Vite’s HTML entry, source graph, development server, Vite 8 production build, Rolldown terminology, production preview, CSS imports, module resolution, development-versus-production differences, `base`, strict ports, and unresolved-import diagnosis. The minimal case must show an ESM dependency graph; the integrated case must render a Neighbor Market listing and distinguish `dev`, `build`, and `preview` evidence.

- [x] **Step 3: Write `03-ts7-ts6-parallel-typecheck.md`**

Define the official parallel aliases exactly: `@typescript/native` as `npm:typescript@7.0.2`, `typescript` as `npm:@typescript/typescript6@6.0.2`, `tsc` for TS 7, and `tsc6` for the compatibility compiler. Include the three version probes, shared compiler options, supported-intersection policy, divergent-diagnostic capture, old compiler API consumer boundary, Vue SFC exclusion, and a failure experiment that proves deleting the compatibility package can break Lint even when TS 7 CLI succeeds.

- [x] **Step 4: Rewrite the Chapter 01 hub**

Keep only the chapter mission, prerequisites, the ordered three-lesson route, dependency and time guidance, one cumulative Neighbor Market task, evidence required for clean install/development/build/preview/dual type checks, and navigation to Chapters 00 and 02. Remove duplicated tutorial prose after all retained facts have a detailed-lesson destination.

- [x] **Step 5: Verify the Chapter 01 route**

Run the structure and relative-link checks from Tasks 10 and 11. Expected result: three detailed lessons, one stable hub, no broken local links, and both compiler paths named consistently.

## 3. Task 2: Split Lint, Format, and Quality Gates

**Files:**
- Modify: `web-fullstack-course/07-engineering/02-lint-format-quality.md`
- Create: `web-fullstack-course/07-engineering/02-lint-format-quality/01-prettier-format-scope.md`
- Create: `web-fullstack-course/07-engineering/02-lint-format-quality/02-eslint-flat-config-typescript.md`
- Create: `web-fullstack-course/07-engineering/02-lint-format-quality/03-quality-gates-failure-diagnostics.md`

- [x] **Step 1: Write `01-prettier-format-scope.md`**

Separate formatting from correctness, define Prettier 3.8.0 configuration and ignore roles, protect lock files and generated output, distinguish `--write` from `--check`, and require diff review before formatting. The incorrect case must demonstrate that formatting can pass while an integer-cent algorithm remains wrong.

- [x] **Step 2: Write `02-eslint-flat-config-typescript.md`**

Build an ESLint 10 flat config with global ignores, browser and Node file scopes, `@eslint/js`, `typescript-eslint`, `globals`, and `eslint-config-prettier` ordering. Explain why the parser/tooling consumes the TS 6 compatibility API, when type-aware rules need project services, how `--print-config` diagnoses matching, and why whole-file disables or broad globals are not acceptable repairs.

- [x] **Step 3: Write `03-quality-gates-failure-diagnostics.md`**

Define separate `format:check`, `lint`, `typecheck`, `typecheck:compat`, and `typecheck:all` scripts, then compose a fail-fast `quality` gate. Map every failure to tool name, exit code, file/line, rule or diagnostic, root cause, minimal repair, and rerun command; include real red/green experiments for unused code, `debugger`, type mismatch, and formatting drift without changing assertions or disabling checks.

- [x] **Step 4: Rewrite the Chapter 02 hub**

Route readers through format scope, flat-config semantics, and gate diagnosis. The chapter acceptance must require a deliberate failure from each relevant layer, restored green output, and an explanation of what remains outside automated static checks.

- [x] **Step 5: Verify the Chapter 02 route**

Run the structure, links, placeholder, and code-fence checks. Expected result: three lessons and a hub that never treats the generic word “check” as a substitute for named gates.

## 4. Task 3: Split Build, Assets, Cache, and Performance Budgets

**Files:**
- Modify: `web-fullstack-course/07-engineering/03-build-assets-performance.md`
- Create: `web-fullstack-course/07-engineering/03-build-assets-performance/01-vite-build-graph-chunks-dynamic-import.md`
- Create: `web-fullstack-course/07-engineering/03-build-assets-performance/02-client-env-sourcemaps-cache-release.md`
- Create: `web-fullstack-course/07-engineering/03-build-assets-performance/03-asset-budget-production-preview.md`

- [x] **Step 1: Write `01-vite-build-graph-chunks-dynamic-import.md`**

Explain Vite 8 entry discovery, module graphs, transformed assets, chunk boundaries, content hashes, tree shaking, dynamic `import()`, build targets, polyfill limits, and current `build.rolldownOptions` terminology. Verify in production preview that the report chunk is not requested before interaction and is requested after the button action.

- [x] **Step 2: Write `02-client-env-sourcemaps-cache-release.md`**

Define `VITE_` exposure, typed `import.meta.env`, mode versus authorization, Source Map publication risks, root/subpath `base`, hashed-resource caching, HTML revalidation, upload-before-entry release order, old-asset retention, and rollback limits. The failure path must diagnose a wrong `base`, a missing lazy chunk, and an intentionally public demonstration value without using a real secret.

- [x] **Step 3: Write `03-asset-budget-production-preview.md`**

Create a Node-only recursive asset budget script that measures raw and per-file gzip bytes, fails above 80 KiB per JavaScript file or 180 KiB total, and rejects a missing build. Distinguish total JavaScript from first-load requests and transfer compression from actual server headers; verify normal thresholds pass and a one-byte threshold fails.

- [x] **Step 4: Rewrite the Chapter 03 hub**

Route readers from build graph to release semantics to executable budget. Chapter acceptance must include the built file list, a production Network observation, a public-variable observation, normal and injected budget results, and explicit production-cache gaps.

- [x] **Step 5: Verify the Chapter 03 route**

Run the structure and link checks, then execute the Vite and budget gates in the reconstructed capstone during Task 11. Expected result: three lessons, one stable hub, and no claim that a warning threshold or local gzip calculation proves production performance.

## 5. Task 4: Split Workspace, Package Boundaries, and Design Tokens

**Files:**
- Modify: `web-fullstack-course/07-engineering/04-workspace-component-library.md`
- Create: `web-fullstack-course/07-engineering/04-workspace-component-library/01-pnpm-workspace-dependency-graph.md`
- Create: `web-fullstack-course/07-engineering/04-workspace-component-library/02-package-exports-contracts-publishing.md`
- Create: `web-fullstack-course/07-engineering/04-workspace-component-library/03-design-tokens-cross-framework-boundaries.md`

- [x] **Step 1: Write `01-pnpm-workspace-dependency-graph.md`**

Define workspace membership, root versus package manifests, `workspace:*`, package-name filters, one generated root lock file, explicit dependencies, dependency direction, and cycle prevention. Build `apps/lab-web`, `packages/contracts`, and `packages/ui`; prove that a missing member or undeclared dependency is a package-graph error rather than a reason to install everything at the root.

- [x] **Step 2: Write `02-package-exports-contracts-publishing.md`**

Explain public `exports`, forbidden deep imports, shared types plus runtime parsers, environment-neutral contracts, source-consumed private packages, compiled publishable packages, declaration and CSS outputs, peer dependency decisions, and clean-consumer verification. Keep database access, sessions, DOM construction, and secrets out of `packages/contracts`.

- [x] **Step 3: Write `03-design-tokens-cross-framework-boundaries.md`**

Define semantic CSS tokens, theming, contrast and forced-color responsibilities, local-versus-shared decisions, DOM factory limits, and equal-business-scope consumption by React and Vue without forcing shared lifecycle code. The failure case must show that a token can compile while producing unreadable contrast, requiring browser evidence rather than a build-only repair.

- [x] **Step 4: Rewrite the Chapter 04 hub**

Route readers through package graph, public package contract, and cross-framework visual primitives. Chapter acceptance must require public-entry imports, complete dependency declarations, dual type checks, a successful app build, visible `19.90` and `0.00` outputs, and a written source-package versus publishable-package distinction.

- [x] **Step 5: Verify the Chapter 04 route**

Run structure and relative-link checks. Expected result: three detailed lessons and no implication that TypeScript `paths`, repository co-location, or shared types provide runtime installation, trust, or authorization.

## 6. Task 5: Split Unit, Integration, and End-to-End Testing

**Files:**
- Modify: `web-fullstack-course/07-engineering/05-unit-integration-e2e.md`
- Create: `web-fullstack-course/07-engineering/05-unit-integration-e2e/01-vitest-unit-domain-boundaries.md`
- Create: `web-fullstack-course/07-engineering/05-unit-integration-e2e/02-vitest-integration-http-races.md`
- Create: `web-fullstack-course/07-engineering/05-unit-integration-e2e/03-playwright-built-page-e2e.md`

- [x] **Step 1: Write `01-vitest-unit-domain-boundaries.md`**

Use Vitest 5 in Node mode to test integer-cent formatting, zero, unsafe/fractional/negative values, UTC normalization, impossible dates, pagination contradictions, duplicate IDs, and input immutability. Derive expected values independently from the implementation and demonstrate a red result by changing the cents divisor.

- [x] **Step 2: Write `02-vitest-integration-http-races.md`**

Connect a real `Response`, HTTP status handling, query encoding, same-origin credentials, `AbortSignal`, runtime parsing, state publication, generation guards, disposal, and deterministic deferred promises. Prove separately that an old request is aborted and that its result cannot publish even when the injected reader ignores cancellation; do not use arbitrary sleeps.

- [x] **Step 3: Write `03-playwright-built-page-e2e.md`**

Use Playwright 1.64.0 against a strict-port Vite production preview. Exercise valid `19.90`, free `0.00`, HTTP 500, string-price rejection, empty success, stale-result prevention, and recovery; use role/name locators, automatic assertions, matching Chromium installation, and retained-on-failure traces with privacy and evidence limits.

- [x] **Step 4: Rewrite the Chapter 05 hub**

Route readers by evidence layer, not by tool popularity. Chapter acceptance must map each product rule to the smallest sufficient test layer, include red/green failure injections, and state that route mocks and local teaching APIs cannot prove a real backend transaction.

- [x] **Step 5: Verify the Chapter 05 route**

Run structure and links immediately; run `pnpm test` and `pnpm test:e2e` in Task 11. Expected result: three lessons, deterministic async tests, and browser assertions that fail when behavior is removed.

## 7. Task 6: Split Git, CI, Artifacts, and Release

**Files:**
- Modify: `web-fullstack-course/07-engineering/06-ci-git-release.md`
- Create: `web-fullstack-course/07-engineering/06-ci-git-release/01-git-scope-reviewable-commits.md`
- Create: `web-fullstack-course/07-engineering/06-ci-git-release/02-ci-reproducible-quality-pipeline.md`
- Create: `web-fullstack-course/07-engineering/06-ci-git-release/03-artifacts-release-cache-rollback.md`

- [x] **Step 1: Write `01-git-scope-reviewable-commits.md`**

Explain working tree, index, commit, branch, worktree and external-resource boundaries; use status and staged/unstaged diffs to select exact paths; define reviewable commit scope, generated-file exclusions, conflict understanding, and non-destructive recovery. All Git mutation examples must target a disposable reader-owned exercise repository.

- [x] **Step 2: Write `02-ci-reproducible-quality-pipeline.md`**

Build a GitHub Actions teaching workflow with Node 24.21.0, pnpm 12.10.1, frozen install, compiler version probes, matching Chromium, `pnpm verify`, least permissions, timeout, concurrency, commit-linked artifacts, and short-lived failure evidence. Explain untrusted pull-request boundaries, lifecycle scripts, moving action tags versus reviewed SHAs, and why CI checks submitted source instead of auto-fixing it.

- [x] **Step 3: Write `03-artifacts-release-cache-rollback.md`**

Distinguish checks, artifacts, deployment, and release; bind the artifact to a commit; define cache keys and fallback behavior; upload assets before HTML; retain old hashed assets; validate post-release entry and read paths; and explain why frontend rollback cannot undo database writes. Mark hosted CI, production TLS, CDN headers, secrets, deployment, and database recovery as unverified until observed.

- [x] **Step 4: Rewrite the Chapter 06 hub**

Route readers from local change scope to CI evidence to release boundaries. Chapter acceptance must include an exact staged-path review, local CI-equivalent commands, workflow static review, artifact-path failure injection, and a list of external operations that require separate authorization.

- [x] **Step 5: Verify the Chapter 06 route**

Run structure and links. Expected result: three lessons, no remote write during textbook implementation, and no statement that workflow YAML alone proves hosted or production success.

## 8. Task 7: Split the Engineering Capstone

**Files:**
- Modify: `web-fullstack-course/07-engineering/07-engineering-capstone.md`
- Create: `web-fullstack-course/07-engineering/07-engineering-capstone/01-capstone-contract-scaffold.md`
- Create: `web-fullstack-course/07-engineering/07-engineering-capstone/02-capstone-domain-app-teaching-api.md`
- Create: `web-fullstack-course/07-engineering/07-engineering-capstone/03-capstone-tests-build-budget-browser.md`
- Create: `web-fullstack-course/07-engineering/07-engineering-capstone/04-clean-room-verification-evidence.md`

- [x] **Step 1: Write `01-capstone-contract-scaffold.md`**

Define the capstone’s business acceptance, non-production boundary, exact file tree, Node/pnpm pins, workspace membership, root scripts, TS 7/TS 6 aliases, tsconfig, ESLint flat config, Prettier, and ignore files. Assign each complete file to one lesson owner and define the cumulative command order without duplicating later source files.

- [x] **Step 2: Write `02-capstone-domain-app-teaching-api.md`**

Provide the complete contracts parser, integer-cent formatter, tokens, app manifest, HTML, Vite config, read-only teaching API, search controller, and DOM entry. The API must expose valid, delayed, empty, 500, and invalid-price paths; the UI must distinguish loading, success, empty, error, and recovery while cancellation plus generation checks prevent stale publication.

- [x] **Step 3: Write `03-capstone-tests-build-budget-browser.md`**

Provide complete Vitest configuration and domain/search/HTTP tests, Playwright configuration and browser scenario, and recursive gzip budget script. Connect `quality`, `build`, `budget`, `test:e2e`, and `verify` so format, Lint, both compilers, unit/integration tests, Vite production build, Chromium behavior, and budget all produce independent failure evidence.

- [x] **Step 4: Write `04-clean-room-verification-evidence.md`**

Reconstruct the capstone under `/tmp/full-course-verification/batch-d/market-engineering-capstone`, generate and review the lock file, repeat with frozen installation, record exact tool versions and exit codes, inject and restore one failure per gate, rerun `pnpm verify`, remove temporary services and files, and classify each result as observed pass, observed failure/recovery, environment block, or manual gap.

- [x] **Step 5: Rewrite the Chapter 07 hub**

Keep only the capstone mission, prerequisites, four-lesson order, responsibility map, estimated time, cumulative Neighbor Market acceptance, required command/evidence table, production exclusions, and navigation back to Chapter 06 and the volume README.

- [x] **Step 6: Verify the Chapter 07 route**

Run all checks in Tasks 10 and 11. Expected result: four detailed lessons, no duplicated complete capstone file, one reconstructable temporary project, and a full local verification chain whose claims match the recorded commands.

## 9. Task 8: Build the Engineering Coverage Matrix

**Files:**
- Create: `web-fullstack-course/07-engineering/ENGINEERING-COVERAGE.md`

- [x] **Step 1: Create the matrix schema and evidence rules**

Use the exact columns:

```text
ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收
```

Every ID must be unique; every primary lesson must be a relative link to one of the 22 detailed lessons; every evidence cell must name a section or anchor that exists. Do not use a status word in place of evidence.
The six evidence cells must link directly to `#4-核心理论`, `#6-最小可运行案例`, `#7-邻里集市集成案例`, `#8-常见错误与排查路径`, `#10-实践练习`, and `#11-阶段验收` in the primary lesson.

- [x] **Step 2: Add package and toolchain rows**

Use `ENG-PKG-*` IDs for Node/pnpm responsibilities, manifests, version ranges, package manager pinning, lock generation, frozen installation, pnpm store/link layout, ESM boundaries, Vite development/build/preview, module resolution, TS 7 primary CLI, TS 6 compatibility compiler/API, and clean-install diagnostics.

- [x] **Step 3: Add quality and build rows**

Use `ENG-QLT-*` IDs for Prettier scope, ignore files, ESLint flat config, file matching, globals, TypeScript parser/API compatibility, warning policy, suppression boundaries, fail-fast composition, and failure diagnosis. Use `ENG-BLD-*` IDs for build graphs, Rolldown configuration, chunks, dynamic imports, targets/polyfills, public variables, Source Maps, `base`, hashes, HTTP caching, release order, production preview, gzip budgets, and runtime performance limits.

- [x] **Step 4: Add workspace and testing rows**

Use `ENG-WSP-*` IDs for workspace members, filters, `workspace:*`, dependency direction, public exports, deep-import rejection, runtime contracts, source versus publishable packages, peer dependencies, design tokens, and React/Vue consumption boundaries. Use `ENG-TST-*` IDs for test layers, domain boundaries, HTTP failures, runtime parsing, cancellation, stale-result guards, deterministic async control, built-page E2E, accessible locators, trace handling, and mock evidence limits.

- [x] **Step 5: Add Git, CI, release, and capstone rows**

Use `ENG-CI-*` IDs for working tree/index/commit scope, frozen CI installation, tool probes, least permissions, concurrency, untrusted contributions, lifecycle scripts, cache policy, commit-linked artifacts, failure evidence, release order, rollback, and database boundaries. Use `ENG-CAP-*` IDs for capstone structure, teaching API, state model, parser, amount formatting, format gate, Lint, TS 7, TS 6, Vitest, Vite build, Playwright, budget, clean-room reconstruction, and evidence classification.

- [x] **Step 6: Add explicit compatibility, security, and manual-gap rows**

Create separate rows for the TS 7/TS 6 split, Vite 8/Rolldown terminology, browser-exposed configuration, Source Map exposure, CI permission/supply-chain boundaries, mock-versus-production APIs, Firefox/WebKit/mobile gaps, hosted CI, public registry installation, production deployment/cache/TLS, real backend authorization/transactions, and production rollback.

- [x] **Step 7: Verify matrix integrity**

Run the matrix-link and unique-ID check in Task 10. Expected result: every row resolves to an existing lesson and all six evidence dimensions are non-empty and locatable.

## 10. Task 9: Update Volume Navigation and Self-Check Evidence

**Files:**
- Modify: `web-fullstack-course/07-engineering/README.md`
- Modify: `web-fullstack-course/07-engineering/SELF-CHECK.md`

- [x] **Step 1: Update `README.md`**

Retain the volume mission, version table, project boundaries, and official references. Link all seven stable chapter hubs, all 22 detailed lessons in learning order, `ENGINEERING-COVERAGE.md`, and `SELF-CHECK.md`; explain that detailed lessons live below stable hubs and state the `3/3/3/3/3/3/4` distribution.

- [x] **Step 2: Preserve historical evidence in `SELF-CHECK.md`**

Do not rewrite the 2026-10-10 JS/TS and engineering evidence as if it were newly executed. Add a dated 2026-10-11 Batch D section that distinguishes inherited evidence from new textbook-expansion verification.

- [x] **Step 3: Record structural evidence**

Record the observed counts for seven hubs, 22 detailed lessons, one coverage matrix, heading-contract results, links, fences, placeholders, whitespace, and repository-artifact scans. Include the exact command and output summary for each count; do not predeclare success before the command runs.

- [x] **Step 4: Record runtime evidence**

Add a command/result table for Node, pnpm, TS 7 CLI, TS 6 compatibility CLI, TS 6 imported API, Prettier check, ESLint, both type checks, Vitest, Vite build, Playwright Chromium, budget, and the aggregate verify command. Record actual versions, test counts, output paths, gzip bytes, browser build, and exit status from Task 11.

- [x] **Step 5: Record failure and recovery evidence**

For manifest/lock mismatch, formatting drift, Lint violation, TS error, Vitest behavior error, occupied preview port, invalid API data, one-byte budget, and browser behavior removal, record the injected change, failing command, observed failure, restoration, and passing rerun.

- [x] **Step 6: Record remaining risks**

Keep public-registry installation, hosted CI, Firefox, WebKit, real mobile devices, production cache headers, TLS, deployment, real authentication/authorization, database transactions, and production rollback in the unverified section unless Task 11 actually observes them. Local teaching API evidence must remain labeled local and read-only.

## 11. Task 10: Static Structure and Scope Verification

- [x] **Step 1: Verify the exact 22-lesson file set**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

root = Path("web-fullstack-course/07-engineering")
expected = {
    "01-pnpm-vite-esm/01-node-pnpm-manifests-lockfiles.md",
    "01-pnpm-vite-esm/02-vite-esm-dev-build-preview.md",
    "01-pnpm-vite-esm/03-ts7-ts6-parallel-typecheck.md",
    "02-lint-format-quality/01-prettier-format-scope.md",
    "02-lint-format-quality/02-eslint-flat-config-typescript.md",
    "02-lint-format-quality/03-quality-gates-failure-diagnostics.md",
    "03-build-assets-performance/01-vite-build-graph-chunks-dynamic-import.md",
    "03-build-assets-performance/02-client-env-sourcemaps-cache-release.md",
    "03-build-assets-performance/03-asset-budget-production-preview.md",
    "04-workspace-component-library/01-pnpm-workspace-dependency-graph.md",
    "04-workspace-component-library/02-package-exports-contracts-publishing.md",
    "04-workspace-component-library/03-design-tokens-cross-framework-boundaries.md",
    "05-unit-integration-e2e/01-vitest-unit-domain-boundaries.md",
    "05-unit-integration-e2e/02-vitest-integration-http-races.md",
    "05-unit-integration-e2e/03-playwright-built-page-e2e.md",
    "06-ci-git-release/01-git-scope-reviewable-commits.md",
    "06-ci-git-release/02-ci-reproducible-quality-pipeline.md",
    "06-ci-git-release/03-artifacts-release-cache-rollback.md",
    "07-engineering-capstone/01-capstone-contract-scaffold.md",
    "07-engineering-capstone/02-capstone-domain-app-teaching-api.md",
    "07-engineering-capstone/03-capstone-tests-build-budget-browser.md",
    "07-engineering-capstone/04-clean-room-verification-evidence.md",
}
actual = {
    str(path.relative_to(root))
    for directory in root.iterdir()
    if directory.is_dir() and directory.name[:2].isdigit()
    for path in directory.glob("*.md")
}
assert actual == expected, (
    f"missing={sorted(expected - actual)}\n"
    f"unexpected={sorted(actual - expected)}"
)
counts = {}
for path in actual:
    chapter = path.split("/", 1)[0]
    counts[chapter] = counts.get(chapter, 0) + 1
chapters = sorted(counts)
assert chapters == [
    "01-pnpm-vite-esm",
    "02-lint-format-quality",
    "03-build-assets-performance",
    "04-workspace-component-library",
    "05-unit-integration-e2e",
    "06-ci-git-release",
    "07-engineering-capstone",
], chapters
assert [counts[chapter] for chapter in chapters] == [3, 3, 3, 3, 3, 3, 4], counts
print("Engineering detailed lesson set: PASS (22; 3/3/3/3/3/3/4)")
PY
```

Expected: `Engineering detailed lesson set: PASS (22; 3/3/3/3/3/3/4)`.

- [x] **Step 2: Verify the heading contract and code fences**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/07-engineering")
lessons = sorted(path for directory in root.iterdir() if directory.is_dir()
                 for path in directory.glob("*.md"))
expected_numbers = [str(number) for number in range(1, 14)]
for lesson in lessons:
    text = lesson.read_text()
    visible = re.sub(r"```.*?```", "", text, flags=re.S)
    actual_numbers = re.findall(r"^## ([0-9]+)\.", visible, flags=re.M)
    assert actual_numbers == expected_numbers, (lesson, actual_numbers)
    for heading in ("## 任务卡", "## 我现在能做到什么", "## 单元导航"):
        assert heading in visible, (lesson, heading)
    assert text.count("```") % 2 == 0, lesson
print(f"Engineering lesson structure: PASS ({len(lessons)})")
PY
```

Expected: `Engineering lesson structure: PASS (22)`.

- [x] **Step 3: Verify all engineering relative links**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/07-engineering")
errors = []
for source in root.rglob("*.md"):
    visible = re.sub(r"```.*?```", "", source.read_text(), flags=re.S)
    for target in re.findall(r"\[[^\]]+\]\(([^)\s]+)", visible):
        if "://" in target or target.startswith(("#", "mailto:", "tel:")):
            continue
        path = target.split("#", 1)[0]
        if path and not (source.parent / path).resolve().exists():
            errors.append(f"{source}: {target}")
assert not errors, "\n".join(errors)
print("Engineering relative links: PASS")
PY
```

Expected: `Engineering relative links: PASS`.

- [x] **Step 4: Verify coverage IDs, links, and evidence cells**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

path = Path("web-fullstack-course/07-engineering/ENGINEERING-COVERAGE.md")
rows = []
for line in path.read_text().splitlines():
    if re.match(r"^\| ENG-[A-Z]+-[0-9]+ \|", line):
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        assert len(cells) == 9, (line, len(cells))
        assert all(cells), line
        rows.append(cells)
ids = [row[0] for row in rows]
assert rows, "no engineering coverage rows"
assert len(ids) == len(set(ids)), "duplicate engineering coverage ID"
for row in rows:
    primary = re.fullmatch(r"\[[^\]]+\]\(([^)#]+)\)", row[2])
    assert primary, (row[0], row[2])
    primary_path = (path.parent / primary.group(1)).resolve()
    assert primary_path.exists(), (row[0], primary.group(1))
    expected = (
        ("#4-核心理论", "## 4. 核心理论"),
        ("#6-最小可运行案例", "## 6. 最小可运行案例"),
        ("#7-邻里集市集成案例", "## 7. 邻里集市集成案例"),
        ("#8-常见错误与排查路径", "## 8. 常见错误与排查路径"),
        ("#10-实践练习", "## 10. 实践练习"),
        ("#11-阶段验收", "## 11. 阶段验收"),
    )
    lesson_text = primary_path.read_text()
    for cell, (anchor, heading) in zip(row[3:], expected, strict=True):
        evidence = re.fullmatch(r"\[[^\]]+\]\(([^)#]+)(#[^)]+)\)", cell)
        assert evidence, (row[0], cell)
        evidence_path = (path.parent / evidence.group(1)).resolve()
        assert evidence_path == primary_path, (row[0], cell)
        assert evidence.group(2) == anchor, (row[0], cell)
        assert heading in lesson_text, (row[0], heading)
print(f"Engineering coverage matrix: PASS ({len(rows)} unique rows)")
PY
```

Expected: a positive unique row count and no assertion failure.

- [x] **Step 5: Scan placeholders, repository artifacts, and whitespace**

Run:

```bash
rg -n '\b(TO[D]O|TB[D]|FIX[M]E|WI[P])\b|待完[善]|自行补[充]|占位[符]|类似前[文]' \
  web-fullstack-course/07-engineering
find web-fullstack-course/07-engineering -type d \
  \( -name node_modules -o -name dist -o -name coverage -o -name labs \) -print
find web-fullstack-course/07-engineering -type f \
  \( -name package.json -o -name pnpm-lock.yaml -o -name yarn.lock -o -name .env \) -print
python3 - <<'PY'
from pathlib import Path

errors = []
for path in Path("web-fullstack-course/07-engineering").rglob("*.md"):
    for number, line in enumerate(path.read_text().splitlines(), 1):
        if line.endswith((" ", "\t")):
            errors.append(f"{path}:{number}")
assert not errors, "\n".join(errors)
print("Engineering Markdown trailing whitespace: PASS")
PY
git diff --check -- web-fullstack-course/07-engineering
```

Expected: both `find` commands produce no paths, the Python check prints `Engineering Markdown trailing whitespace: PASS`, `git diff --check` produces no findings, and `rg` exits 1 to mean no match.

## 12. Task 11: Reconstruct and Run the Engineering Toolchain

All commands in this task run in `/tmp/full-course-verification/batch-d/market-engineering-capstone`, never in the documentation tree.

- [x] **Step 1: Reconstruct and inspect the capstone**

Mechanically extract each complete-file block owned by the four capstone lessons into its declared path. Compare the resulting file tree with `01-capstone-contract-scaffold.md`; reject missing, duplicate, or undeclared files before installation.

- [x] **Step 2: Verify runtime and package-manager pins**

Run:

```bash
node --version
pnpm --version
pnpm install
pnpm install --frozen-lockfile
```

Expected: Node reports `v24.21.0`, pnpm reports `12.10.1`, initial install generates the lock file in `/tmp`, and the frozen reinstall exits 0 without changing it.

- [x] **Step 3: Verify TS 7, TS 6 CLI, and TS 6 API**

Run:

```bash
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec node --input-type=module -e 'import ts from "typescript"; console.log(ts.version)'
pnpm typecheck
pnpm typecheck:compat
pnpm typecheck:all
```

Expected: `tsc` reports `7.0.2`; `tsc6` and imported `typescript` report the same observed 6.0-series compiler version; all three type-check scripts exit 0. Record the compatibility compiler output separately from the compatibility package’s `6.0.2` manifest version.

- [x] **Step 4: Verify Prettier and ESLint independently**

Run:

```bash
pnpm format
pnpm format:check
pnpm lint
```

Expected: formatting changes are reviewed only in `/tmp`, the check exits 0, and ESLint 10.12.0 exits 0 with zero warnings. Inject one formatting drift and one `debugger` statement, observe each owning gate fail, restore both, and rerun the commands.

- [x] **Step 5: Verify Vitest unit and integration behavior**

Run:

```bash
pnpm test
```

Expected: every declared Vitest file and test passes; output proves integer-cent, UTC, invalid-domain, HTTP, cancellation, stale-result, disposal, and recovery assertions actually execute. Change the cents divisor and remove the stale-result guard one at a time, observe targeted failures, restore each implementation, and rerun to green.

- [x] **Step 6: Verify the Vite production build**

Run:

```bash
pnpm exec vite --version
pnpm build
find apps/lab-web/dist -type f -print | sort
```

Expected: Vite reports `8.3.0`, quality gates run before the build, the command exits 0, and the built HTML/assets exist only under the temporary app’s `dist`.

- [x] **Step 7: Verify the asset budget**

Run:

```bash
pnpm budget
```

Expected: every JavaScript file is at most `81920` gzip bytes, the total is at most `184320` gzip bytes, and the command exits 0. Temporarily set the threshold to one byte, confirm non-zero exit, restore the declared thresholds, and rerun successfully.

- [x] **Step 8: Verify Playwright against the built page**

Run:

```bash
pnpm exec playwright --version
pnpm exec playwright install chromium
pnpm test:e2e
```

Expected: Playwright reports `1.64.0`; Chromium exercises valid price, zero price, HTTP 500, invalid string price, empty result, stale-result protection, and recovery; preview starts on strict port 4173 and stops after tests. Occupy port 4173 once to prove startup fails visibly, then release the port and rerun.

- [x] **Step 9: Verify the aggregate gate**

Run:

```bash
pnpm verify
```

Expected: format check, ESLint, TS 7, TS 6 compatibility, Vitest, Vite build, Playwright, and budget all run in the documented order and the aggregate command exits 0.

- [x] **Step 10: Clean temporary state**

Stop processes started by this task, preserve only summarized evidence in `SELF-CHECK.md`, then remove `/tmp/full-course-verification/batch-d/`. Confirm no `node_modules`, `dist`, lock file, browser binary, report, trace, or generated source appears under `web-fullstack-course/07-engineering/`.

## 13. Task 12: Future Commit Boundaries

Do not run these commit commands while authoring this plan. During Batch D implementation, commit only after the named lessons, hubs, and relevant checks pass; inspect `git diff --cached --name-only` before every commit.

- [x] **Commit 1: Chapters 01-02**

```bash
git add \
  web-fullstack-course/07-engineering/01-pnpm-vite-esm.md \
  web-fullstack-course/07-engineering/01-pnpm-vite-esm/ \
  web-fullstack-course/07-engineering/02-lint-format-quality.md \
  web-fullstack-course/07-engineering/02-lint-format-quality/
git diff --cached --name-only
git commit -m "docs: expand engineering toolchain foundations"
```

Boundary: exactly two hubs and six detailed lessons; no other volume, matrix, self-check, or plan file.

- [x] **Commit 2: Chapters 03-04**

```bash
git add \
  web-fullstack-course/07-engineering/03-build-assets-performance.md \
  web-fullstack-course/07-engineering/03-build-assets-performance/ \
  web-fullstack-course/07-engineering/04-workspace-component-library.md \
  web-fullstack-course/07-engineering/04-workspace-component-library/
git diff --cached --name-only
git commit -m "docs: expand engineering build and workspace lessons"
```

Boundary: exactly two hubs and six detailed lessons; no Chapter 05-07 or volume governance files.

- [x] **Commit 3: Chapters 05-06**

```bash
git add \
  web-fullstack-course/07-engineering/05-unit-integration-e2e.md \
  web-fullstack-course/07-engineering/05-unit-integration-e2e/ \
  web-fullstack-course/07-engineering/06-ci-git-release.md \
  web-fullstack-course/07-engineering/06-ci-git-release/
git diff --cached --name-only
git commit -m "docs: expand engineering test and delivery lessons"
```

Boundary: exactly two hubs and six detailed lessons; no capstone or navigation evidence files.

- [x] **Commit 4: Independent review fixes for Chapters 01-06**

Independent review after the first three commits found cross-chapter navigation, cumulative-path, runnable CI,
Git exercise, and artifact-construction defects. Keep those repairs in one explicit scoped commit rather than
rewriting local history or hiding them in the capstone evidence commit.

```bash
git add \
  web-fullstack-course/07-engineering/01-pnpm-vite-esm/01-node-pnpm-manifests-lockfiles.md \
  web-fullstack-course/07-engineering/01-pnpm-vite-esm/03-ts7-ts6-parallel-typecheck.md \
  web-fullstack-course/07-engineering/02-lint-format-quality/01-prettier-format-scope.md \
  web-fullstack-course/07-engineering/02-lint-format-quality/02-eslint-flat-config-typescript.md \
  web-fullstack-course/07-engineering/02-lint-format-quality/03-quality-gates-failure-diagnostics.md \
  web-fullstack-course/07-engineering/03-build-assets-performance/01-vite-build-graph-chunks-dynamic-import.md \
  web-fullstack-course/07-engineering/03-build-assets-performance/02-client-env-sourcemaps-cache-release.md \
  web-fullstack-course/07-engineering/03-build-assets-performance/03-asset-budget-production-preview.md \
  web-fullstack-course/07-engineering/04-workspace-component-library/01-pnpm-workspace-dependency-graph.md \
  web-fullstack-course/07-engineering/04-workspace-component-library/03-design-tokens-cross-framework-boundaries.md \
  web-fullstack-course/07-engineering/05-unit-integration-e2e/01-vitest-unit-domain-boundaries.md \
  web-fullstack-course/07-engineering/05-unit-integration-e2e/03-playwright-built-page-e2e.md \
  web-fullstack-course/07-engineering/06-ci-git-release.md \
  web-fullstack-course/07-engineering/06-ci-git-release/
git diff --cached --name-only
git commit -m "docs: fix engineering review findings"
```

Boundary: only reviewed fixes to already committed Chapters 01-06; no capstone, matrix, README, self-check,
another volume, or plan file.

- [x] **Commit 5: Chapter 07 and volume evidence**

```bash
git add \
  web-fullstack-course/07-engineering/07-engineering-capstone.md \
  web-fullstack-course/07-engineering/07-engineering-capstone/ \
  web-fullstack-course/07-engineering/README.md \
  web-fullstack-course/07-engineering/ENGINEERING-COVERAGE.md \
  web-fullstack-course/07-engineering/SELF-CHECK.md
git diff --cached --name-only
git commit -m "docs: complete engineering textbook expansion"
```

Boundary: one hub, four detailed lessons, the volume README, coverage matrix, and observed self-check evidence. Do not stage `web-fullstack-course/README.md`, `web-fullstack-course/VALIDATION.md`, another volume, temporary verification output, or unrelated user changes.

## 14. Completion Evidence

Batch D is complete only when all of these observed results are available:

```text
7 stable engineering chapter hubs
22 detailed lessons distributed 3/3/3/3/3/3/4
1 ENGINEERING-COVERAGE.md with unique IDs and six locatable evidence dimensions
1 README route to every hub, lesson, matrix, and self-check
1 SELF-CHECK update that preserves historical evidence and records new observed results
0 broken engineering relative links
0 unfinished markers
0 unbalanced code fences
0 whitespace errors
0 repository package, lock, dependency, build, browser, or report artifacts
TS 7 primary check: observed
TS 6 compatibility CLI/API check: observed
Prettier and ESLint gates: observed
Vitest unit/integration behavior: observed
Vite production build: observed
Playwright Chromium built-page flow: observed
gzip budget pass and deliberate failure: observed
hosted CI, production deployment, real backend, and cross-browser gaps: explicitly bounded
five commits limited to the declared engineering paths, including one explicit independent-review repair commit
```
