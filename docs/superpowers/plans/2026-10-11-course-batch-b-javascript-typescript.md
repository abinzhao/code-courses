# Course Batch B JavaScript and TypeScript Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the nine JavaScript and TypeScript chapters into 27 detailed textbook lessons with stable chapter hubs, a complete Neighbor Market learning path, and an auditable coverage matrix.

**Architecture:** Preserve every existing numbered Markdown path as a concise chapter hub and add exactly three detailed lessons under its same-named directory. Keep executable JavaScript, browser DOM, TypeScript, and test fixtures embedded in Markdown; extract them only to `/tmp/full-course-verification/batch-b/` for verification. Use TypeScript 7.0.2 as the language mainline and keep the verified TypeScript 6 compatibility toolchain explicitly separate.

**Tech Stack:** Markdown, JavaScript, ECMAScript modules, browser DOM and Fetch APIs, Node.js 24 LTS, `node:test`, TypeScript 7.0.2, TypeScript 6 compatibility compiler/API 6.0.3, pnpm 12.10.1, Chromium.

---

## 1. Governing Contract

Read and enforce these documents before editing:

- `docs/superpowers/specs/2026-10-11-full-course-textbook-expansion-design.md`
- `docs/superpowers/plans/2026-10-11-full-course-textbook-expansion.md`
- `web-fullstack-course/00-guide/02-version-baseline.md`
- `web-fullstack-course/00-guide/05-project-assessment.md`
- all current files under `web-fullstack-course/04-javascript-typescript/`

Every detailed lesson must use the 13 numbered sections and the three additional headings defined by the master design. Every lesson must include a runnable minimum case, a progressively expanded Neighbor Market case, an explicit incorrect case, a five-part diagnosis record, basic/advanced/failure-injection exercises, assessable answers, acceptance evidence, and official references with a snapshot date.

The nine current numbered files remain stable links. Each is rewritten as a hub containing the chapter task and output, prerequisites, an ordered route to exactly three detailed lessons, dependencies and estimated study time, one chapter-level Neighbor Market integration task, observable acceptance evidence, and previous/next chapter navigation.

Do not add a repository source project, `labs/`, package manifests, lock files, installed dependencies, build output, browser profiles, or downloaded assets. Reader-created `js-lab/` and `ts-lab/` paths remain instructions inside Markdown. Temporary extracted projects and generated lock files belong only under `/tmp/full-course-verification/batch-b/`.

## 2. Audit Decisions to Preserve

- Store and transport money as non-negative safe integer cents. Parse yuan text strictly before conversion and never repair malformed input with `parseFloat`, truthiness, or final formatting.
- Treat plain records and explicit functions as the default. Teach prototypes, `this`, and classes without converting API DTOs into a class hierarchy.
- Keep DOM state, rendered nodes, authentication, object authorization, and server persistence as separate concerns. The in-memory page must state that refresh loses data and client buttons grant no permission.
- Handle Fetch in protocol layers: network failure, HTTP status, body decoding, runtime contract validation, cancellation, freshness, and UI state. Cancellation does not roll back a server transaction.
- Use both `AbortController` and a generation guard for search. Test stale responses with controllable Promises rather than timing sleeps.
- Teach TypeScript 7.0.2 as the mainline compiler. When a lesson demonstrates old compiler APIs, use the verified compatibility package 6.0.2 and record the actual `tsc6` and API output as 6.0.3; never merge both into one invented compiler version.
- Keep `unknown` at external boundaries until runtime parsing succeeds. `any`, double assertions, and unjustified non-null assertions are not accepted fixes.
- Keep form drafts, API DTOs, valid domain values, view state, optimistic versioning, backend authorization, and database uniqueness as separate guarantees.
- Use Node's built-in test runner for this volume. Vitest, Playwright, workspace setup, and full quality pipelines remain owned by the engineering volume.
- State algorithm prerequisites and costs. Binary search requires matching sort order; Map and Set do not replace API validation, backend pagination, or database constraints.

## 3. Task 1: Values, Operators, and Control Flow

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/01-values-control-flow.md`
- Create: `web-fullstack-course/04-javascript-typescript/01-values-control-flow/01-values-variables-types-conversion.md`
- Create: `web-fullstack-course/04-javascript-typescript/01-values-control-flow/02-operators-conditions-short-circuit.md`
- Create: `web-fullstack-course/04-javascript-typescript/01-values-control-flow/03-loops-iteration-state-tracing.md`

- [x] Write `01-values-variables-types-conversion.md`: execution order; statements and expressions; `const` and `let`; identifiers; string, number, boolean, `undefined`, `null`, `bigint`, and symbol orientation; `typeof` limits; `NaN`; explicit conversion; binary floating-point; safe integer cents; and wrong-file/unsaved-file diagnosis.
- [x] Write `02-operators-conditions-short-circuit.md`: arithmetic and precedence, strict equality, comparison, template strings, truthy/falsy values, `if`/`else`, ternaries, `&&`/`||`/`??`, short-circuit effects, zero-price handling, discount validation, and a case where syntactically valid code violates a business rule.
- [x] Write `03-loops-iteration-state-tracing.md`: `for`, `while`, `break`, `continue`, termination conditions, off-by-one errors, accumulators, total overflow checks, paper state tables, safe interruption of an infinite loop, and a Neighbor Market multi-item total.
- [x] Rewrite `01-values-control-flow.md` as the route from observable values to validated branches and terminating iteration. The chapter project must calculate a cents-based cart total, reject invalid discounts, and retain a trace showing each state transition.
- [x] Verify all three lessons with Node 24 syntax checks and exact output predictions before execution.

## 4. Task 2: Functions, Scope, and Errors

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/02-functions-scope-errors.md`
- Create: `web-fullstack-course/04-javascript-typescript/02-functions-scope-errors/01-function-contracts-parameters-returns.md`
- Create: `web-fullstack-course/04-javascript-typescript/02-functions-scope-errors/02-scope-closures-lifetime.md`
- Create: `web-fullstack-course/04-javascript-typescript/02-functions-scope-errors/03-errors-stacks-cleanup-boundaries.md`

- [x] Write `01-function-contracts-parameters-returns.md`: declarations, calls, parameters and arguments, return values versus logging, default parameters, arrow functions, callbacks, pure calculation boundaries, strict yuan-to-cents parsing, cents formatting, and input/output unit contracts.
- [x] Write `02-scope-closures-lifetime.md`: lexical, function, and block scope; shadowing; temporal initialization boundaries; closures; independent retained state; captured bindings rather than snapshots; resource lifetime; and a request-generation counter.
- [x] Write `03-errors-stacks-cleanup-boundaries.md`: `Error`, `TypeError`, and `RangeError`; `throw`; propagation; `try`/`catch`/`finally`; arbitrary thrown values; stack reading; cleanup without return suppression; Node inspector steps; and failure messages that do not convert invalid prices into zero.
- [x] Rewrite `02-functions-scope-errors.md` as the route from reusable calculation contracts to controlled state and explainable failure. The chapter project must expose tested price parsing and discount functions plus one closure-owned counter without hidden global state.
- [x] Verify valid, empty, negative, exponential, trailing-text, three-decimal, unsafe-integer, and zero-price inputs.

## 5. Task 3: Objects, Arrays, and Data Boundaries

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/03-objects-arrays-data.md`
- Create: `web-fullstack-course/04-javascript-typescript/03-objects-arrays-data/01-objects-references-immutable-updates.md`
- Create: `web-fullstack-course/04-javascript-typescript/03-objects-arrays-data/02-arrays-collections-pagination.md`
- Create: `web-fullstack-course/04-javascript-typescript/03-objects-arrays-data/03-json-serialization-data-boundaries.md`

- [x] Write `01-objects-references-immutable-updates.md`: object literals, fixed and computed property access, stable IDs versus indexes, aliases, identity, shallow copying, nested sharing, `Object.hasOwn`, `Object.freeze`, `structuredClone`, targeted immutable updates, and a price change that preserves the old listing.
- [x] Write `02-arrays-collections-pagination.md`: indexes and absence, `find`, `some`, `filter`, `map`, `reduce`, `slice`, `sort` versus `toSorted`, empty collections, safe totals, filter-before-count pagination, legal empty pages, locale-aware text matching, and stable identity across filtering and sorting.
- [x] Write `03-json-serialization-data-boundaries.md`: JSON text versus JavaScript values, parse and stringify loss boundaries, `null` and array rejection, known-field mapping, UTC strings, prototype-pollution avoidance, malformed record evidence, and the distinction among a complete Listing, an algorithm projection, and an external API response.
- [x] Rewrite `03-objects-arrays-data.md` as the route from record identity to collection transforms and external-data admission. The chapter project must return `{ items, page, pageSize, total }`, reject contradictory input, and update one listing without mutating the source collection.
- [x] Verify reference identity, original ordering, filtered totals, out-of-range pages, string prices, `null`, and malformed JSON separately.

## 6. Task 4: Prototypes, Classes, and Modules

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/04-prototypes-modules.md`
- Create: `web-fullstack-course/04-javascript-typescript/04-prototypes-modules/01-prototype-chain-this-classes.md`
- Create: `web-fullstack-course/04-javascript-typescript/04-prototypes-modules/02-esm-import-export-resolution.md`
- Create: `web-fullstack-course/04-javascript-typescript/04-prototypes-modules/03-module-graphs-state-dynamic-import.md`

- [x] Write `01-prototype-chain-this-classes.md`: own and inherited properties, prototype traversal, method sharing, shadowing, dynamic `this`, detached methods, `bind`, arrow lexical capture, class syntax, private fields, `instanceof` limits, and the decision between plain records, functions, and stateful classes.
- [x] Write `02-esm-import-export-resolution.md`: module scope, named and default exports, aliases, static imports, explicit relative paths and extensions, Node `.mjs`, browser `type="module"` over HTTP, source-relative resolution, missing-export evidence, and a three-file money/catalog/main Neighbor Market example.
- [x] Write `03-module-graphs-state-dynamic-import.md`: one-time module evaluation, live bindings, shared mutable exports, side-effect ownership, dependency direction, dynamic `import()`, top-level await boundaries, circular initialization hazards, and a lazy notice module with observable load count.
- [x] Rewrite `04-prototypes-modules.md` as the route from property lookup to explicit dependency graphs. The chapter project must separate pure money formatting, catalog reading, summary calculation, and the entry module without modifying built-in prototypes or importing the page from a utility.
- [x] Verify direct method calls, detached calls, module path failures, export-name failures, dynamic import identity, and dependency direction.

## 7. Task 5: DOM, Events, and Accessible State

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/05-dom-events.md`
- Create: `web-fullstack-course/04-javascript-typescript/05-dom-events/01-dom-query-create-safe-rendering.md`
- Create: `web-fullstack-course/04-javascript-typescript/05-dom-events/02-events-forms-delegation.md`
- Create: `web-fullstack-course/04-javascript-typescript/05-dom-events/03-state-focus-accessible-interactions.md`

- [x] Write `01-dom-query-create-safe-rendering.md`: DOM tree orientation, nullable queries, node creation, fragments, `append`, `replaceChildren`, `textContent` versus `innerHTML`, state-to-view rendering, authoritative data ownership, safe title rendering, and a visible XSS error experiment.
- [x] Write `02-events-forms-delegation.md`: listener registration, event phases, `target` and `currentTarget`, `preventDefault`, propagation, `closest`, containment checks, submit semantics, `FormData`, HTML validation versus program validation, one-time event delegation, and duplicate-listener diagnosis.
- [x] Write `03-state-focus-accessible-interactions.md`: complete in-memory add/favorite/remove flow, Set-backed favorites, status feedback, `aria-pressed`, live regions, keyboard activation, focus restoration after rerender or deletion, filtered views without destroying source state, and refresh/persistence/authorization boundaries.
- [x] Rewrite `05-dom-events.md` as the route from safe nodes to event-driven state and accessible interaction recovery. The chapter project must retain the current complete HTML/script/server flow and distribute its concepts without duplicating two authoritative copies of the full application.
- [x] Run a Chromium keyboard smoke path for initial render, valid publish, invalid publish, favorite toggle, favorite removal, filter recovery, refresh reset, focus position, and zero unhandled console errors.

## 8. Task 6: Async, Fetch, and Event Loop

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/06-async-fetch-event-loop.md`
- Create: `web-fullstack-course/04-javascript-typescript/06-async-fetch-event-loop/01-promises-async-event-loop.md`
- Create: `web-fullstack-course/04-javascript-typescript/06-async-fetch-event-loop/02-fetch-http-errors-runtime-validation.md`
- Create: `web-fullstack-course/04-javascript-typescript/06-async-fetch-event-loop/03-cancellation-races-concurrency.md`

- [x] Write `01-promises-async-event-loop.md`: Promise states, settlement, chaining, rejection, `finally`, async return values, await suspension, synchronous stack, microtasks, timers, rendering opportunities, Node/browser ordering boundaries, starvation, and an observable order log.
- [x] Write `02-fetch-http-errors-runtime-validation.md`: URLSearchParams, Request/Response, body consumption, network rejection versus HTTP failure, `response.ok`, JSON decoding failure, error-body/requestId handling, page-shape checks, same-origin cookies, CORS/CSRF distinctions, 401 and 409 handling, and a self-closing local Node teaching API.
- [x] Write `03-cancellation-races-concurrency.md`: AbortController and signals, generation freshness, disposal, stale-success and stale-error suppression, debouncing, cleanup ownership, `Promise.all`, `allSettled`, serial dependency, retry and idempotency boundaries, and deterministic late-response demonstrations.
- [x] Rewrite `06-async-fetch-event-loop.md` as the route from scheduling to protocol handling and race-safe UI state. The chapter project must search twice, show only the newest valid page, classify 500 separately from network failure, and prevent disposed controllers from rendering.
- [x] Verify event-loop output, 200/400/404/500 behavior, malformed success data, explicit cancellation, ignored-signal stale completion, current-request failure, and cleanup after server shutdown.

## 9. Task 7: TypeScript Core

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/07-typescript-core.md`
- Create: `web-fullstack-course/04-javascript-typescript/07-typescript-core/01-inference-annotations-strict-config.md`
- Create: `web-fullstack-course/04-javascript-typescript/07-typescript-core/02-unions-narrowing-state-modeling.md`
- Create: `web-fullstack-course/04-javascript-typescript/07-typescript-core/03-generics-utility-types-soundness.md`

- [x] Write `01-inference-annotations-strict-config.md`: type erasure, inference versus boundary annotations, structural typing, arrays and optional properties, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noEmitOnError`, `skipLibCheck` scope, typecheck versus emit versus execution, and a complete temporary project using the recorded Node/pnpm/TypeScript versions.
- [x] Write `02-unions-narrowing-state-modeling.md`: `unknown`, `typeof`, literal unions, discriminated results, control-flow narrowing, exhaustive `never`, optional versus absent values, UI phase modeling, and explicit handling of empty lists and `NaN`.
- [x] Write `03-generics-utility-types-soundness.md`: type parameters that preserve relationships, `readonly`, generic Page mapping, interface/type trade-offs, indexed access and `as const`, `Pick`, `Omit`, `Partial` limits, unsafe `fetchJson<T>`, `any`, assertions, non-null assertions, and compile-time versus runtime guarantees.
- [x] Rewrite `07-typescript-core.md` as the route from inferred local values to strict contracts and reusable type relations. The chapter project must typecheck the same valid examples on TS 7.0.2 and the declared TS 6 compatibility path while documenting which command owns each compiler.
- [x] Verify `pnpm exec tsc --version` reports 7.0.2, `pnpm exec tsc6 --version` and the imported old compiler API report 6.0.3 in the verified lock resolution, then run both typecheck commands without presenting TS 6 as current.

## 10. Task 8: TypeScript Domain Design

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/08-typescript-domain-design.md`
- Create: `web-fullstack-course/04-javascript-typescript/08-typescript-domain-design/01-domain-contracts-branded-values-dtos.md`
- Create: `web-fullstack-course/04-javascript-typescript/08-typescript-domain-design/02-unknown-runtime-parsers-errors.md`
- Create: `web-fullstack-course/04-javascript-typescript/08-typescript-domain-design/03-state-machines-conflicts-authorization.md`

- [x] Write `01-domain-contracts-branded-values-dtos.md`: complete Listing, ListingStatus, Page, ApiErrorBody, Reservation, ListingPatch, Cents brand construction, form draft versus valid command, server-owned fields, query projections, editable-field allowlists, and when branding reduces unit confusion.
- [x] Write `02-unknown-runtime-parsers-errors.md`: reusable record/text/integer/status/time parsers, ContractError paths, known-field reconstruction, valid UTC normalization, invalid calendar round trips, page metadata consistency, duplicate IDs, extra fields, optional error details, and `unknown -> parser -> domain` as the only admission path.
- [x] Write `03-state-machines-conflicts-authorization.md`: editing/saving/saved/conflict states, typed client return boundaries, 201 success, versioned PATCH, 409 recovery, stale reads, same-origin identity, object authorization, reservation uniqueness, transactional ownership, and the limits of disabled buttons and frontend types.
- [x] Rewrite `08-typescript-domain-design.md` as the route from contracts to trusted parsing and cross-layer guarantees. The chapter project must parse a complete page, preserve an exact error path, normalize a valid UTC timestamp, reject contradictory metadata, and explain who owns version, permission, and uniqueness checks.
- [x] Verify every Listing field missing or malformed, zero and unsafe cents, all status values, valid and invalid UTC dates, empty and overfull pages, duplicate IDs, missing request IDs, and a documented 409 state transition.

## 11. Task 9: Testing, Debugging, and Algorithms

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/09-testing-debugging-algorithms.md`
- Create: `web-fullstack-course/04-javascript-typescript/09-testing-debugging-algorithms/01-node-test-assertions-tdd-boundaries.md`
- Create: `web-fullstack-course/04-javascript-typescript/09-testing-debugging-algorithms/02-deterministic-async-testing-debugging.md`
- Create: `web-fullstack-course/04-javascript-typescript/09-testing-debugging-algorithms/03-data-structures-complexity-search-sort.md`

- [x] Write `01-node-test-assertions-tdd-boundaries.md`: `node:test`, strict assertions, scalar and structural equality, synchronous throws, asynchronous rejection, mutation checks, table-driven price cases, test-first failure evidence, coverage limits, and the difference between testing behavior and spying on implementation. Its complete fixture owns `js-lab/testing/money.mjs` and `js-lab/testing/money.test.mjs`.
- [x] Write `02-deterministic-async-testing-debugging.md`: manually controlled Promises, stale-result and disposal tests, shared-state cleanup, why timing sleeps are unstable, Node inspector, browser Sources and Network evidence, reproduce/minimize/hypothesize/instrument/fix/regress records, and sensitive-log boundaries. Its complete fixture owns `js-lab/search-controller.mjs` and `js-lab/search-controller.test.mjs`.
- [x] Write `03-data-structures-complexity-search-sort.md`: Big O interpretation, array scans, Map and Set semantics, index build/maintenance cost, insertion sort as a teaching algorithm, binary-search invariants, stable IDs versus sorted indexes, input preservation, measurement boundaries, and why backend pagination remains necessary. Its complete fixtures are `js-lab/algorithms.mjs` and `js-lab/unique.test.mjs`.
- [x] Rewrite `09-testing-debugging-algorithms.md` as the route from executable rules to deterministic diagnosis and justified data structures. The chapter project must pass three money tests, two race/disposal tests, and one unique-ID test, then run search/sort examples without mutating the source.
- [x] Deliberately demonstrate one failing money test, one stale-response regression, one unsorted-binary-search precondition violation, and one accidental in-place sort; restore each implementation and retain the before/after evidence in its lesson.

## 12. Task 10: Volume Navigation and Coverage Matrix

**Files:**
- Modify: `web-fullstack-course/04-javascript-typescript/README.md`
- Create: `web-fullstack-course/04-javascript-typescript/JS-TS-COVERAGE.md`

- [x] Rewrite the volume README with all nine chapter hubs, all 27 detailed lessons, the coverage matrix, runtime conventions, TS 7/TS 6 separation, shared Neighbor Market constraints, final outputs, and volume-level acceptance.
- [x] Build `JS-TS-COVERAGE.md` with columns `ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收`.
- [x] Give every row a unique `JS-TS-###` ID, link every primary tutorial, and make every one of the 27 detailed lessons the primary tutorial for at least one row.
- [x] Cover values/types, operators/control flow, iteration, functions, scope/closures, errors, objects/references, arrays/pagination, JSON boundaries, prototypes/`this`/classes, ESM/module graphs, DOM rendering, events/forms, focus/accessibility, Promise/event loop, Fetch/protocol errors, cancellation/races, TypeScript strictness, unions/narrowing, generics/soundness, domain DTOs, runtime parsers, conflicts/authorization, Node tests, deterministic debugging, and complexity/data structures as separate auditable rows.
- [x] Add separate matrix rows for integer cents, UTC ISO 8601, full Listing/page contracts, browser-versus-Node APIs, TS 7 mainline versus TS 6 compatibility, XSS/CSRF/CORS/cookie/authorization boundaries, version and reservation consistency, Chromium evidence, and unverified Safari/Firefox/assistive-technology gaps.
- [x] Verify each matrix evidence cell points to a concrete heading in the linked lesson rather than using a status word or repeating the lesson title.

## 13. Task 11: Structure and Link Verification

- [x] Verify the exact 27-file inventory:

```bash
python3 - <<'PY'
from pathlib import Path

root = Path("web-fullstack-course/04-javascript-typescript")
expected = {
    "01-values-control-flow/01-values-variables-types-conversion.md",
    "01-values-control-flow/02-operators-conditions-short-circuit.md",
    "01-values-control-flow/03-loops-iteration-state-tracing.md",
    "02-functions-scope-errors/01-function-contracts-parameters-returns.md",
    "02-functions-scope-errors/02-scope-closures-lifetime.md",
    "02-functions-scope-errors/03-errors-stacks-cleanup-boundaries.md",
    "03-objects-arrays-data/01-objects-references-immutable-updates.md",
    "03-objects-arrays-data/02-arrays-collections-pagination.md",
    "03-objects-arrays-data/03-json-serialization-data-boundaries.md",
    "04-prototypes-modules/01-prototype-chain-this-classes.md",
    "04-prototypes-modules/02-esm-import-export-resolution.md",
    "04-prototypes-modules/03-module-graphs-state-dynamic-import.md",
    "05-dom-events/01-dom-query-create-safe-rendering.md",
    "05-dom-events/02-events-forms-delegation.md",
    "05-dom-events/03-state-focus-accessible-interactions.md",
    "06-async-fetch-event-loop/01-promises-async-event-loop.md",
    "06-async-fetch-event-loop/02-fetch-http-errors-runtime-validation.md",
    "06-async-fetch-event-loop/03-cancellation-races-concurrency.md",
    "07-typescript-core/01-inference-annotations-strict-config.md",
    "07-typescript-core/02-unions-narrowing-state-modeling.md",
    "07-typescript-core/03-generics-utility-types-soundness.md",
    "08-typescript-domain-design/01-domain-contracts-branded-values-dtos.md",
    "08-typescript-domain-design/02-unknown-runtime-parsers-errors.md",
    "08-typescript-domain-design/03-state-machines-conflicts-authorization.md",
    "09-testing-debugging-algorithms/01-node-test-assertions-tdd-boundaries.md",
    "09-testing-debugging-algorithms/02-deterministic-async-testing-debugging.md",
    "09-testing-debugging-algorithms/03-data-structures-complexity-search-sort.md",
}
actual = {
    str(path.relative_to(root))
    for path in root.glob("[0-9][0-9]-*/*.md")
}
assert actual == expected, (
    f"missing={sorted(expected - actual)}\n"
    f"unexpected={sorted(actual - expected)}"
)
print("Batch B lesson inventory: PASS (27)")
PY
```

- [x] Verify the detailed-lesson heading contract and closed code fences:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/04-javascript-typescript")
lessons = sorted(root.glob("[0-9][0-9]-*/*.md"))
assert len(lessons) == 27, len(lessons)
for lesson in lessons:
    text = lesson.read_text()
    visible = re.sub(r"```.*?```", "", text, flags=re.S)
    numbered = re.findall(r"^## ([0-9]+)\.", visible, flags=re.M)
    assert numbered == [str(value) for value in range(1, 14)], (lesson, numbered)
    for heading in ("## 任务卡", "## 我现在能做到什么", "## 单元导航"):
        assert heading in visible, (lesson, heading)
    assert sum(line.startswith("```") for line in text.splitlines()) % 2 == 0, lesson
print("Batch B lesson structure: PASS (27)")
PY
```

- [x] Verify every hub links exactly its three local lessons, the README reaches all nine hubs and 27 lessons, `JS-TS-COVERAGE.md` reaches every lesson, and every relative Markdown link in the volume resolves.
- [x] Run unfinished-marker, artifact, and whitespace checks:

```bash
rg -n '\b(TO[D]O|TB[D]|FIX[M]E|WI[P])\b|待完[善]|自行补[充]|占位[符]' \
  web-fullstack-course/04-javascript-typescript || true
find web-fullstack-course/04-javascript-typescript -type d \
  \( -name node_modules -o -name dist -o -name coverage -o -name labs \) -print
find web-fullstack-course/04-javascript-typescript -type f \
  \( -name package.json -o -name pnpm-lock.yaml -o -name yarn.lock -o -name .env \) -print
git diff --check -- web-fullstack-course/04-javascript-typescript
```

Expected: no marker matches, no repository artifacts, and no whitespace errors.

## 14. Task 12: Example and Runtime Verification

- [x] Recreate every block labeled as a complete file under `/tmp/full-course-verification/batch-b/<chapter>/<lesson>/`, preserving its declared `js-lab/` or `ts-lab/` relative path. Incorrect snippets remain explicitly labeled and are not substituted for valid fixture files.
- [x] Record the actual environment before execution:

```bash
node --version
pnpm --version
```

Expected: Node output starts with `v24.` and pnpm output is `12.10.1`; otherwise record the mismatch and do not claim the target baseline passed.

- [x] Syntax-check every extracted JavaScript module:

```bash
find /tmp/full-course-verification/batch-b -type f -name '*.mjs' -print0 |
  while IFS= read -r -d '' file; do node --check "$file" || exit 1; done
```

Expected: every file exits zero.

- [x] Execute each lesson's declared Node entry command and compare complete observable output. Run the self-closing local API fixtures, verify their declared status/error paths, and confirm no process or listening port remains after completion.
- [x] Run the extracted Node tests:

```bash
node --test \
  /tmp/full-course-verification/batch-b/09-testing-debugging-algorithms/01-node-test-assertions-tdd-boundaries/js-lab/testing/money.test.mjs \
  /tmp/full-course-verification/batch-b/09-testing-debugging-algorithms/02-deterministic-async-testing-debugging/js-lab/search-controller.test.mjs \
  /tmp/full-course-verification/batch-b/09-testing-debugging-algorithms/03-data-structures-complexity-search-sort/js-lab/unique.test.mjs
```

Expected: six tests pass and zero fail: three money tests, two race/disposal tests, and one unique-ID test.

- [x] In each extracted TypeScript fixture, install only its declared fixed dependencies, retain the generated lock file under `/tmp`, run frozen installation, then run `pnpm typecheck`, `pnpm typecheck:compat` where declared, `pnpm build`, and the documented generated JavaScript entry points.
- [x] For the dual-compiler fixture, run:

```bash
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec node --input-type=module -e \
  'import ts from "typescript"; console.log(ts.version)'
pnpm typecheck:all
```

Expected for the verified lock resolution: `tsc` 7.0.2, `tsc6` 6.0.3, old compiler API 6.0.3, and a zero exit from both type checks.

- [x] Run the DOM lesson through its fixed local server in Chromium. Complete the keyboard path for publish, validation failure, favorite, remove, filter, focus recovery, and refresh reset; inspect Console and Network and record only observed behavior.
- [x] Remove `/tmp/full-course-verification/batch-b/` after retaining command summaries and manual evidence in the appropriate lessons or volume acceptance record.

## 15. Task 13: Commit Boundaries

The implementation uses four local commits. Creating this plan does not stage or commit any file. Do not push, deploy, amend unrelated commits, or stage any path outside `web-fullstack-course/04-javascript-typescript/`.

- [x] After Tasks 1-3 pass their focused checks, stage only chapter hubs and directories 01-03:

```bash
git add \
  web-fullstack-course/04-javascript-typescript/01-values-control-flow.md \
  web-fullstack-course/04-javascript-typescript/01-values-control-flow \
  web-fullstack-course/04-javascript-typescript/02-functions-scope-errors.md \
  web-fullstack-course/04-javascript-typescript/02-functions-scope-errors \
  web-fullstack-course/04-javascript-typescript/03-objects-arrays-data.md \
  web-fullstack-course/04-javascript-typescript/03-objects-arrays-data
git commit -m "docs: expand JavaScript language foundations"
```

- [x] After Tasks 4-6 pass Node and Chromium checks, stage only chapter hubs and directories 04-06:

```bash
git add \
  web-fullstack-course/04-javascript-typescript/04-prototypes-modules.md \
  web-fullstack-course/04-javascript-typescript/04-prototypes-modules \
  web-fullstack-course/04-javascript-typescript/05-dom-events.md \
  web-fullstack-course/04-javascript-typescript/05-dom-events \
  web-fullstack-course/04-javascript-typescript/06-async-fetch-event-loop.md \
  web-fullstack-course/04-javascript-typescript/06-async-fetch-event-loop
git commit -m "docs: expand native JavaScript applications"
```

- [x] After Tasks 7-9 pass dual-compiler and Node test checks, stage only chapter hubs and directories 07-09:

```bash
git add \
  web-fullstack-course/04-javascript-typescript/07-typescript-core.md \
  web-fullstack-course/04-javascript-typescript/07-typescript-core \
  web-fullstack-course/04-javascript-typescript/08-typescript-domain-design.md \
  web-fullstack-course/04-javascript-typescript/08-typescript-domain-design \
  web-fullstack-course/04-javascript-typescript/09-testing-debugging-algorithms.md \
  web-fullstack-course/04-javascript-typescript/09-testing-debugging-algorithms
git commit -m "docs: expand TypeScript reliability lessons"
```

- [x] After Tasks 10-12 and the final diff review pass, stage only navigation, coverage, and any verified Batch B corrections:

```bash
git add \
  web-fullstack-course/04-javascript-typescript/README.md \
  web-fullstack-course/04-javascript-typescript/JS-TS-COVERAGE.md
git add -u -- web-fullstack-course/04-javascript-typescript
git diff --cached --name-only
git commit -m "docs: complete JavaScript TypeScript coverage"
```

Before each commit, inspect `git diff --cached --name-only` and `git diff --cached --check`. If any file falls outside the declared boundary, unstage that path without deleting the user's work. The final Batch B state must contain exactly nine hubs, 27 detailed lessons, one volume README, and one coverage matrix, with no staged file from another volume.

## 16. Completion Evidence

Batch B is complete only when all of the following are observed:

```text
9 stable chapter hubs rewritten
27 detailed lessons present, exactly 3 per chapter
1 JS-TS-COVERAGE.md with unique IDs and concrete evidence links
27 lessons passing the 13-section contract
0 broken relative links
0 unfinished markers
0 unclosed code fences
0 whitespace errors
0 repository labs, package, lock, dependency, build, or browser-profile artifacts
all extracted JavaScript files passing Node syntax checks
all declared Node examples matching documented output
6 Node tests passing and 0 failing
TS 7 mainline and TS 6 compatibility checks recorded separately
Chromium DOM and race-sensitive paths recorded from actual execution
Safari, Firefox, assistive technology, and real backend integration left as explicit gaps unless executed
only web-fullstack-course/04-javascript-typescript paths included in Batch B commits
no remote push or deployment
```
