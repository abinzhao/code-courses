# Course Batch C React and Vue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the eight React chapters and eight Vue chapters into 48 detailed textbook lessons, two auditable coverage matrices, and two business-equivalent framework learning routes.

**Architecture:** Preserve every existing numbered Markdown path as a stable chapter hub, add exactly three detailed lessons below each same-named directory, and keep React and Vue independent at the component-model level while reconciling the same Neighbor Market domain, HTTP contract, states, tests, and acceptance evidence. All runnable source remains embedded in Markdown; complete examples are reconstructed only in fresh `/tmp` workspaces for type, test, build, SSR, and Chromium verification.

**Tech Stack:** Markdown, TypeScript strict mode, React 19.3, React Router Data Mode, Vue 3.5.43, Vue Router, Pinia, Vite 8, TypeScript 6 compatibility APIs with the documented TypeScript 7 boundary, ESLint 10 flat config, Vitest, Testing Library or Vue Test Utils, Playwright, Node.js 24, pnpm, and Chromium.

---

## 1. Governing Contract

Read these files before editing:

- Design: `docs/superpowers/specs/2026-10-11-full-course-textbook-expansion-design.md`
- Master plan: `docs/superpowers/plans/2026-10-11-full-course-textbook-expansion.md`
- Version baseline: `web-fullstack-course/00-guide/02-version-baseline.md`
- Domain contract: `web-fullstack-course/00-guide/05-project-assessment.md`
- Existing evidence: `web-fullstack-course/VALIDATION.md`
- React source volume: all nine current files under `web-fullstack-course/05-react/`
- Vue source volume: all nine current files under `web-fullstack-course/06-vue/`

Implementation rules:

- Keep all eight React and eight Vue numbered chapter paths unchanged.
- Add exactly 24 detailed React lessons and 24 detailed Vue lessons.
- Do not create application source, package manifests, lock files, dependencies, build output, screenshots, or verification logs in the repository.
- Keep all temporary projects under a fresh `/tmp/full-course-verification/batch-c-*` directory and remove them after evidence is recorded.
- Keep prices as integer cents and persisted timestamps as UTC ISO 8601 strings.
- Mark local memory, Vite middleware, mock data, teaching cookies, and synthetic performance data as non-production.
- Do not claim that frontend button state provides authorization, reservation uniqueness, CSRF protection, persistence, or transaction safety.
- Do not change `web-fullstack-course/README.md`, `web-fullstack-course/VALIDATION.md`, `00-guide`, or any volume outside `05-react` and `06-vue`; Batch G owns cross-book navigation and final counts.
- The plan-writing session creates only this plan and makes no commit. The commit steps below belong to the later implementation session.

## 2. Detailed Lesson Contract

Every new lesson must use this exact top-level sequence:

```text
# Lesson-specific Chinese title
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

Each lesson must contain:

- one observable minimal case and one progressive extension;
- one Neighbor Market integration case with exact file locations;
- one explicitly incorrect case;
- one diagnosis record ordered as symptom, evidence, cause, fix, and recheck;
- setup or creation steps, exact commands, expected output, and failure evidence;
- basic, advanced, and fault-injection exercises;
- answers or objectively checkable answer criteria;
- an API table covering the lesson's components, Hooks or composables, router APIs, state APIs, and test interfaces;
- official sources and a stated snapshot date for version or compatibility claims;
- links to its chapter hub and adjacent lesson.

Use these code-block ownership markers:

```text
**完整文件：`relative/path`**
**关键片段：`relative/path`**
**命令：在 `relative/directory` 执行**
```

The final capstone lesson in each volume owns that framework's only complete final project snapshot. Earlier lessons contain standalone minimal files and focused project snippets, so two complete snapshots cannot drift.

## 3. Shared Business Parity

React and Vue must implement the same observable business scope without translating framework code line by line.

| Contract | Required value or behavior |
| --- | --- |
| `Listing` | `id/title/description/priceCents/status/ownerId/version/createdAt` |
| Money | `35.10` becomes `3510`; `0` and `1000000.00` are valid; negative, exponent, leading-zero, three-decimal, and over-limit input is rejected |
| Time | stored as UTC ISO 8601; localized only at display time |
| List API | `GET /api/v1/listings?page=1&pageSize=20&q=` returns `{items,page,pageSize,total}` |
| Detail and write APIs | detail GET, listing POST/PATCH with version conflict, reservation POST, favorite PUT/DELETE, auth register/login/me/logout |
| Error body | `{code,message,requestId,details?}` with distinct 401, 403, 404, 409, 422, and 503 meanings |
| Session | same-origin HttpOnly teaching cookie; browser code does not read or persist the credential |
| Page states | initial, loading, empty, error, success, unauthenticated, forbidden, and conflict |
| Core flow | search, pagination, detail, login, publish, reserve, favorite, unfavorite, logout |
| Concurrency | stale reads are cancelled or ignored; late responses cannot cross a session epoch; two-tab reservation yields one success and one 409 |
| Accessibility | labels, keyboard activation, visible focus, status/alert semantics, route focus recovery, reduced-motion boundary |
| SSR | public list HTML, safe initial-data serialization, request isolation, 200/503/404, no-JavaScript search, hydration interaction |

Use the same fixture identities in both volumes:

```text
lamp-1: 九成新台灯, 3500 cents, available, seller-1
desk-1: 折叠桌, 8000 cents, reserved, seller-2
demo-buyer: 演示居民
published fixture: 二手书架, 12000 cents
failing query: __error
missing listing: missing
```

The shared test scenario names are:

```text
price-and-draft-contract
failed-publish-keeps-draft
favorite-target-is-idempotent
late-session-result-is-ignored
search-empty-and-recovery
login-publish-favorite-logout
reservation-conflict-across-tabs
not-found-and-service-failure
keyboard-primary-path
ssr-html-and-hydration
```

Framework-specific implementation remains explicit:

- React teaches render/commit purity, state snapshots, Effects, custom Hooks, Data Router loaders/actions, reducer/Context, Actions, Suspense, Activity, and React SSR.
- Vue teaches SFC compilation, ref/reactive/computed, watchers and lifecycle, composables, navigation-after-fetch, Pinia, provide/inject, Teleport, KeepAlive, and Vue SSR.

## 4. React File Map

| Chapter hub | Detailed lesson path | Single responsibility |
| --- | --- | --- |
| `web-fullstack-course/05-react/01-jsx-components.md` | `web-fullstack-course/05-react/01-jsx-components/01-rendering-jsx-purity.md` | Explain JSX compilation, React elements versus DOM nodes, render/commit phases, text escaping, pure rendering, and Strict Mode evidence. |
| `web-fullstack-course/05-react/01-jsx-components.md` | `web-fullstack-course/05-react/01-jsx-components/02-components-props-composition-list-identity.md` | Teach component boundaries, typed readonly props, `children`, composition, conditional rendering, stable keys, and card/list identity. |
| `web-fullstack-course/05-react/01-jsx-components.md` | `web-fullstack-course/05-react/01-jsx-components/03-vite-typescript-first-market.md` | Build the Vite React TypeScript workspace, fix the TS6-compatible typecheck path, define the domain, and render the first static market. |
| `web-fullstack-course/05-react/02-events-state-forms.md` | `web-fullstack-course/05-react/02-events-state-forms/01-events-state-snapshots-updates.md` | Cover typed events, render snapshots, batching, functional updates, immutable arrays/objects, and derived data. |
| `web-fullstack-course/05-react/02-events-state-forms.md` | `web-fullstack-course/05-react/02-events-state-forms/02-controlled-uncontrolled-form-validation.md` | Compare controlled and uncontrolled inputs, define amount parsing and draft validation, use `useId`, and model pending/error/success. |
| `web-fullstack-course/05-react/02-events-state-forms.md` | `web-fullstack-course/05-react/02-events-state-forms/03-search-publish-state-ownership.md` | Integrate local search, empty state, listing publication, state lifting, reset behavior, and explicit in-memory limits. |
| `web-fullstack-course/05-react/03-effects-reuse.md` | `web-fullstack-course/05-react/03-effects-reuse/01-effects-lifecycle-cleanup-strict-mode.md` | Define Effect ownership, dependencies, cleanup, development remount checks, ref boundaries, layout effects, and external subscriptions. |
| `web-fullstack-course/05-react/03-effects-reuse.md` | `web-fullstack-course/05-react/03-effects-reuse/02-fetch-http-abort-resource-state.md` | Implement the HTTP helper, distinguish fetch transport from HTTP failure, cancel stale reads, and model loading/error/success as a union. |
| `web-fullstack-course/05-react/03-effects-reuse.md` | `web-fullstack-course/05-react/03-effects-reuse/03-custom-hooks-local-api-retry.md` | Build `useListings`, retry and empty-result behavior, and the local Vite teaching API while documenting its security and persistence limits. |
| `web-fullstack-course/05-react/04-routing-data.md` | `web-fullstack-course/05-react/04-routing-data/01-data-router-url-state-navigation.md` | Establish the Data Router tree, URL-owned query/page/id state, link/form navigation, deep-link fallback, and history behavior. |
| `web-fullstack-course/05-react/04-routing-data.md` | `web-fullstack-course/05-react/04-routing-data/02-loaders-actions-errors-revalidation.md` | Teach loaders, actions, request signals, navigation states, error elements, action results, and post-action revalidation. |
| `web-fullstack-course/05-react/04-routing-data.md` | `web-fullstack-course/05-react/04-routing-data/03-auth-publish-reservation-conflicts.md` | Integrate teaching login, server-issued listing IDs, publication, reservation, session expiry, status-specific recovery, and two-tab conflict. |
| `web-fullstack-course/05-react/05-state-architecture.md` | `web-fullstack-course/05-react/05-state-architecture/01-state-ownership-reducer-context.md` | Classify URL, draft, server, and client state; design a pure favorite reducer; and define a non-null Context contract. |
| `web-fullstack-course/05-react/05-state-architecture.md` | `web-fullstack-course/05-react/05-state-architecture/02-session-favorites-concurrency.md` | Implement session and conservative favorite commands with per-ID locks, generation guards, logout cleanup, and recoverable failures. |
| `web-fullstack-course/05-react/05-state-architecture.md` | `web-fullstack-course/05-react/05-state-architecture/03-external-store-context-performance-ssr.md` | Explain Context invalidation, splitting/memoization, `useSyncExternalStore`, stable snapshots, per-request SSR state, and the missing favorite-query boundary. |
| `web-fullstack-course/05-react/06-testing-accessibility.md` | `web-fullstack-course/05-react/06-testing-accessibility/01-pure-component-contract-tests.md` | Write Vitest and Testing Library tests for amount boundaries, reducers, form submission, retained drafts, and user-visible contracts. |
| `web-fullstack-course/05-react/06-testing-accessibility.md` | `web-fullstack-course/05-react/06-testing-accessibility/02-router-browser-accessibility-errors.md` | Add route and render error recovery, Playwright business flows, keyboard/focus checks, accessible names, and status semantics. |
| `web-fullstack-course/05-react/06-testing-accessibility.md` | `web-fullstack-course/05-react/06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md` | Configure ESLint 10 and Hooks rules, define type/test/build/E2E CI gates, and separate frontend evidence from backend/security claims. |
| `web-fullstack-course/05-react/07-performance-modern-react.md` | `web-fullstack-course/05-react/07-performance-modern-react/01-performance-measurement-memo-concurrency.md` | Profile before optimizing; cover `memo`, `useMemo`, `useCallback`, deferred values, transitions, pagination, and virtualization boundaries. |
| `web-fullstack-course/05-react/07-performance-modern-react.md` | `web-fullstack-course/05-react/07-performance-modern-react/02-actions-optimistic-form-status.md` | Teach `useActionState`, `useFormStatus`, `useOptimistic`, pending semantics, rollback, and the difference between client Actions and server authorization. |
| `web-fullstack-course/05-react/07-performance-modern-react.md` | `web-fullstack-course/05-react/07-performance-modern-react/03-modern-hooks-compiler-suspense-activity.md` | Complete the Hook map and demonstrate `use`, Suspense, ref props, imperative handles, Effect Events, lazy loading, Compiler evidence, and Activity lifecycle. |
| `web-fullstack-course/05-react/08-ssr-capstone.md` | `web-fullstack-course/05-react/08-ssr-capstone/01-rendering-modes-hydration-contract.md` | Compare CSR/SSR/SSG/hybrid rendering, define hydration invariants, progressive enhancement, mismatch causes, and interaction timing. |
| `web-fullstack-course/05-react/08-ssr-capstone.md` | `web-fullstack-course/05-react/08-ssr-capstone/02-vite-ssr-serialization-isolation.md` | Build the isolated Vite SSR path, safely serialize public data, enforce trusted API origins/timeouts, and create per-request state. |
| `web-fullstack-course/05-react/08-ssr-capstone.md` | `web-fullstack-course/05-react/08-ssr-capstone/03-streaming-rsc-capstone-acceptance.md` | Explain streaming, RSC/Server Function/Next boundaries, own the single complete React project snapshot, and run the final acceptance matrix. |

## 5. Vue File Map

| Chapter hub | Detailed lesson path | Single responsibility |
| --- | --- | --- |
| `web-fullstack-course/06-vue/01-sfc-templates.md` | `web-fullstack-course/06-vue/01-sfc-templates/01-sfc-template-compiler.md` | Explain SFC structure, template compilation, script setup bindings, expressions, escaping, scoped-style limits, and instance/module scope. |
| `web-fullstack-course/06-vue/01-sfc-templates.md` | `web-fullstack-course/06-vue/01-sfc-templates/02-props-slots-list-identity.md` | Teach typed props, ownership, named/scoped/default slots, directives, conditional rendering, stable keys, and card/list identity. |
| `web-fullstack-course/06-vue/01-sfc-templates.md` | `web-fullstack-course/06-vue/01-sfc-templates/03-vite-typescript-first-market.md` | Build the Vite Vue TypeScript workspace, establish vue-tsc with TS6-compatible APIs, define the domain, and render the static market. |
| `web-fullstack-course/06-vue/02-reactivity-events-forms.md` | `web-fullstack-course/06-vue/02-reactivity-events-forms/01-ref-reactive-computed-updates.md` | Explain ref/reactive/computed tracking, template unwrapping, update queues, `nextTick`, destructuring loss, and pure derivation. |
| `web-fullstack-course/06-vue/02-reactivity-events-forms.md` | `web-fullstack-course/06-vue/02-reactivity-events-forms/02-component-events-v-model-forms.md` | Teach typed emits, `defineModel`, command props versus notifications, amount validation, pending/error/success, and accessible form wiring. |
| `web-fullstack-course/06-vue/02-reactivity-events-forms.md` | `web-fullstack-course/06-vue/02-reactivity-events-forms/03-search-publish-state-ownership.md` | Integrate local search, computed results, empty state, publication, local/global ownership, reset behavior, and in-memory limits. |
| `web-fullstack-course/06-vue/03-lifecycle-composables.md` | `web-fullstack-course/06-vue/03-lifecycle-composables/01-lifecycle-watch-cleanup.md` | Define setup and lifecycle timing, explicit watch versus watchEffect, synchronous cleanup registration, update timing, and external resource disposal. |
| `web-fullstack-course/06-vue/03-lifecycle-composables.md` | `web-fullstack-course/06-vue/03-lifecycle-composables/02-fetch-http-abort-resource-state.md` | Implement the HTTP helper, distinguish HTTP failure, cancel stale reads, use shallow server snapshots, and model loading/error/success. |
| `web-fullstack-course/06-vue/03-lifecycle-composables.md` | `web-fullstack-course/06-vue/03-lifecycle-composables/03-composables-local-api-retry.md` | Build `useListings` with MaybeRef/getter inputs, retry behavior, and the local Vite API while documenting composable instance and security limits. |
| `web-fullstack-course/06-vue/04-router-data.md` | `web-fullstack-course/06-vue/04-router-data/01-router-url-state-navigation.md` | Establish Vue Router, URL-owned query/page/id state, RouterLink/View, history fallback, normalized query objects, and back/forward restoration. |
| `web-fullstack-course/06-vue/04-router-data.md` | `web-fullstack-course/06-vue/04-router-data/02-route-data-fetch-cancellation-errors.md` | Teach navigation-after-fetch, route-specific watchers, cancellation, component reuse on param changes, detail retries, and status-specific errors. |
| `web-fullstack-course/06-vue/04-router-data.md` | `web-fullstack-course/06-vue/04-router-data/03-auth-publish-reservation-conflicts.md` | Integrate teaching login, publication, server IDs, reservation, session failure, 401/403/404/409/422/503 recovery, and two-tab conflict. |
| `web-fullstack-course/06-vue/05-pinia-architecture.md` | `web-fullstack-course/06-vue/05-pinia-architecture/01-state-ownership-pinia-store.md` | Classify state ownership, build a setup store, explain state/getter/action roles, preserve reactivity with `storeToRefs`, and avoid duplicating server pages. |
| `web-fullstack-course/06-vue/05-pinia-architecture.md` | `web-fullstack-course/06-vue/05-pinia-architecture/02-session-favorites-concurrency.md` | Implement session and conservative favorite actions with per-ID busy state, epoch guards, logout semantics, idempotent targets, and recovery. |
| `web-fullstack-course/06-vue/05-pinia-architecture.md` | `web-fullstack-course/06-vue/05-pinia-architecture/03-provide-inject-store-ssr.md` | Use typed provide/inject for display services, define readonly mutation boundaries, create Pinia per SSR request, and document the missing favorite-query contract. |
| `web-fullstack-course/06-vue/06-testing-accessibility.md` | `web-fullstack-course/06-vue/06-testing-accessibility/01-pure-component-store-tests.md` | Write Vitest, Vue Test Utils, and Pinia tests for amount boundaries, form outcomes, idempotent favorites, and stale-session ordering. |
| `web-fullstack-course/06-vue/06-testing-accessibility.md` | `web-fullstack-course/06-vue/06-testing-accessibility/02-router-browser-accessibility-errors.md` | Add `onErrorCaptured` recovery, Playwright route flows, keyboard/focus checks, labels, status semantics, and two-page conflicts. |
| `web-fullstack-course/06-vue/06-testing-accessibility.md` | `web-fullstack-course/06-vue/06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md` | Configure ESLint 10 for TypeScript and SFCs, define vue-tsc/test/build/E2E CI gates, and separate browser evidence from backend/security claims. |
| `web-fullstack-course/06-vue/07-performance-advanced-vue.md` | `web-fullstack-course/06-vue/07-performance-advanced-vue/01-performance-shallow-reactivity-measurement.md` | Profile computation and DOM cost, use computed/shallowRef correctly, require root replacement, and explain pagination/virtualization and stable-prop boundaries. |
| `web-fullstack-course/06-vue/07-performance-advanced-vue.md` | `web-fullstack-course/06-vue/07-performance-advanced-vue/02-teleport-transition-dialog-accessibility.md` | Build a Teleport-backed native dialog, synchronize focus and model state, apply Transition with reduced motion, and diagnose missing targets. |
| `web-fullstack-course/06-vue/07-performance-advanced-vue.md` | `web-fullstack-course/06-vue/07-performance-advanced-vue/03-keepalive-async-components-lifecycle.md` | Teach KeepAlive activation/deactivation, timer cleanup, cache/user boundaries, async component loading/error states, and route code splitting. |
| `web-fullstack-course/06-vue/08-ssr-capstone.md` | `web-fullstack-course/06-vue/08-ssr-capstone/01-rendering-modes-hydration-contract.md` | Compare CSR/SSR/SSG/hybrid rendering, define createSSRApp hydration invariants, progressive enhancement, mismatch causes, and interaction timing. |
| `web-fullstack-course/06-vue/08-ssr-capstone.md` | `web-fullstack-course/06-vue/08-ssr-capstone/02-vite-vue-ssr-serialization-isolation.md` | Build the Vite Vue SSR path with per-request app/router/Pinia, safe serialization, trusted upstreams, lifecycle limits, and cache boundaries. |
| `web-fullstack-course/06-vue/08-ssr-capstone.md` | `web-fullstack-course/06-vue/08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md` | Explain streaming, server prefetch, Teleport SSR and Nuxt boundaries, own the single complete Vue project snapshot, and run final acceptance. |

## 6. Task 1: Freeze the Batch C Baseline

**Files:**
- Read: `web-fullstack-course/05-react/*.md`
- Read: `web-fullstack-course/06-vue/*.md`
- Verify: `docs/superpowers/specs/2026-10-11-full-course-textbook-expansion-design.md`
- Verify: `docs/superpowers/plans/2026-10-11-full-course-textbook-expansion.md`

- [x] **Step 1: Record the existing volume shape**

Run:

```bash
find web-fullstack-course/05-react web-fullstack-course/06-vue \
  -maxdepth 1 -type f -name '*.md' -print | sort
```

Expected: eight numbered chapter files plus one README in each volume, with no detailed lesson directory or coverage matrix yet.

- [x] **Step 2: Confirm the fixed arithmetic**

Run:

```bash
python3 - <<'PY'
react = [3] * 8
vue = [3] * 8
assert sum(react) == 24
assert sum(vue) == 24
assert sum(react + vue) == 48
print("Batch C arithmetic: PASS (React 24, Vue 24, total 48)")
PY
```

Expected: `Batch C arithmetic: PASS (React 24, Vue 24, total 48)`.

- [x] **Step 3: Preserve existing evidence as historical evidence**

Keep the 2026-10-10 Node 22/24, pnpm 10.34.6, dependency, Vitest, E2E, SSR, Compiler, and interaction results in the two READMEs, but label them as the pre-rewrite verification snapshot. Add new execution results only after fresh reconstruction; do not silently convert historical output into current evidence.

## 7. Task 2: React Chapter 1 - JSX, Components, and Setup

**Files:**
- Modify: `web-fullstack-course/05-react/01-jsx-components.md`
- Create: `web-fullstack-course/05-react/01-jsx-components/01-rendering-jsx-purity.md`
- Create: `web-fullstack-course/05-react/01-jsx-components/02-components-props-composition-list-identity.md`
- Create: `web-fullstack-course/05-react/01-jsx-components/03-vite-typescript-first-market.md`

- [x] **Step 1: Write the rendering and JSX lesson**

Cover the React element tree, JSX expressions and attributes, escaped text, component capitalization, render/commit, pure render functions, Strict Mode development probes, invalid conditional expressions, and `dangerouslySetInnerHTML` trust boundaries. The minimal case must show source data becoming a safe card and the failure case must make a render-time side effect observable.

- [x] **Step 2: Write the components and identity lesson**

Cover typed props, readonly ownership, `ReactNode`, `children`, component composition, status mapping with `satisfies`, list mapping, stable keys, index/random key failures, conditional rendering, and `useId` versus data identity. Integrate `ListingCard` and verify focus/state does not migrate after reorder.

- [x] **Step 3: Write the setup and first-market lesson**

Cover the workspace paths, Vite React TypeScript scaffold, React 19.3 install check, Node 24, TS6 compatibility alias, strict `tsconfig`, `typecheck`/`build` scripts, `domain.ts`, integer cents, UTC timestamps, root mounting, CSS, and the first two cards. Include exact `pnpm list`, `tsc6`, typecheck, build, and browser expectations.

- [x] **Step 4: Rewrite the chapter hub**

Replace the current long-form chapter with the chapter task, prerequisites, the three-lesson route, dependency order, recommended study time, a static-catalog capstone, evidence checklist, and previous/next navigation. The hub must link all three detailed lessons and must not repeat their theory or full source.

- [x] **Step 5: Verify Chapter 1**

Check three files, exact heading order, paired fences, relative links, static-card output, 320px layout, and type/build commands in the temporary React workspace.

## 8. Task 3: React Chapter 2 - Events, State, and Forms

**Files:**
- Modify: `web-fullstack-course/05-react/02-events-state-forms.md`
- Create: `web-fullstack-course/05-react/02-events-state-forms/01-events-state-snapshots-updates.md`
- Create: `web-fullstack-course/05-react/02-events-state-forms/02-controlled-uncontrolled-form-validation.md`
- Create: `web-fullstack-course/05-react/02-events-state-forms/03-search-publish-state-ownership.md`

- [x] **Step 1: Write the events and state-snapshot lesson**

Teach typed handlers, setter scheduling, stale closure observations, batching, functional updates, immutable object/array updates, event intent, derived data, and why synchronous formatting is not an Effect. Include a two-increment counterexample and a mutation failure.

- [x] **Step 2: Write the forms and validation lesson**

Teach controlled and uncontrolled fields, current versus default values, `FormData`, `useId`, form submission, Enter behavior, amount-string editing, exact `parsePrice` cases, `validateDraft`, pending/error/success states, failure retention, and success-only reset.

- [x] **Step 3: Write the local market integration lesson**

Integrate search, availability filtering, one-source derived count, empty state, local publish, `crypto.randomUUID()` at event time, state lifting, local form ownership, and explicit refresh loss. Include the failure-injection save command and the hidden-by-filter diagnosis.

- [x] **Step 4: Rewrite the chapter hub**

Route the three lessons into a searchable local-market capstone. State the input/output contract, 02-to-03 dependency, study time, chapter acceptance, in-memory boundary, and navigation.

- [x] **Step 5: Verify Chapter 2**

Run type/build checks and pure amount assertions for valid zero/upper bound and invalid leading-zero/exponent/three-decimal/over-limit inputs.

## 9. Task 4: React Chapter 3 - Effects, HTTP, and Custom Hooks

**Files:**
- Modify: `web-fullstack-course/05-react/03-effects-reuse.md`
- Create: `web-fullstack-course/05-react/03-effects-reuse/01-effects-lifecycle-cleanup-strict-mode.md`
- Create: `web-fullstack-course/05-react/03-effects-reuse/02-fetch-http-abort-resource-state.md`
- Create: `web-fullstack-course/05-react/03-effects-reuse/03-custom-hooks-local-api-retry.md`

- [x] **Step 1: Write the Effect lifecycle lesson**

Define external synchronization, dependency truthfulness, setup/cleanup order, Strict Mode remount behavior, event/listener/timer cleanup, `useRef`, `useLayoutEffect`, and why user writes and derived values do not belong in Effects. Include a leaking subscription and a fixed version.

- [x] **Step 2: Write the HTTP and resource lesson**

Define `ApiError`, `response.ok`, typed-assertion limits, JSON boundary validation requirements, same-origin credentials, CSRF marker limits, `AbortController`, stale-result guards, and a discriminated resource state. Distinguish success-empty from failure and cancellation from server rollback.

- [x] **Step 3: Write the custom Hook and teaching API lesson**

Build `useListings(q, revision)`, loading/error/empty/success rendering, retry, rapid-search cancellation, and the complete local Vite middleware contract. Explicitly mark memory reset, fake login, non-production CSRF, no database transaction, localhost-only binding, and real-backend proxy replacement.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons into a server-backed list capstone with slow-network, `__error`, offline, empty, and normal acceptance paths. Include prerequisites, study time, evidence, and navigation.

- [x] **Step 5: Verify Chapter 3**

Use Chromium Network throttling to confirm stale reads cannot overwrite the latest query. Typecheck the plugin and client files and verify 503 remains an error rather than an empty list.

## 10. Task 5: React Chapter 4 - Data Router and Server Data

**Files:**
- Modify: `web-fullstack-course/05-react/04-routing-data.md`
- Create: `web-fullstack-course/05-react/04-routing-data/01-data-router-url-state-navigation.md`
- Create: `web-fullstack-course/05-react/04-routing-data/02-loaders-actions-errors-revalidation.md`
- Create: `web-fullstack-course/05-react/04-routing-data/03-auth-publish-reservation-conflicts.md`

- [x] **Step 1: Write the URL and router lesson**

Teach `createBrowserRouter`, `RouterProvider`, nested layout/outlet, Link versus button, GET Form, q/page/id ownership, positive page normalization, `URLSearchParams`, draft query versus submitted URL, history restoration, and static-server fallback.

- [x] **Step 2: Write the loader/action lesson**

Teach loader/action browser execution, request signals, navigation state, action data, redirects, revalidation, route errors, fallback phases, stale navigation, and why loader data must not be duplicated into Context. Include 404 and 503 recovery.

- [x] **Step 3: Write the auth/publication/reservation lesson**

Integrate teaching login, cookie session, `POST /listings`, server-issued IDs, `POST /reservations`, success revalidation, 401/403/409/422 distinctions, two-tab conflict, and no client-supplied buyer identity. Include direct `/new`, missing detail, and production deep-link failures.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons into a shareable, refreshable market capstone. Specify URL acceptance, publication and reservation evidence, study time, backend authority boundaries, and navigation.

- [x] **Step 5: Verify Chapter 4**

Typecheck/build, refresh `/listings?q=台灯&page=1`, navigate back/forward, publish after login, reserve in two tabs, and record one 201 plus one 409.

## 11. Task 6: Commit React Chapters 1-4

**Files:**
- Stage only: `web-fullstack-course/05-react/01-jsx-components.md`
- Stage only: `web-fullstack-course/05-react/01-jsx-components/`
- Stage only: `web-fullstack-course/05-react/02-events-state-forms.md`
- Stage only: `web-fullstack-course/05-react/02-events-state-forms/`
- Stage only: `web-fullstack-course/05-react/03-effects-reuse.md`
- Stage only: `web-fullstack-course/05-react/03-effects-reuse/`
- Stage only: `web-fullstack-course/05-react/04-routing-data.md`
- Stage only: `web-fullstack-course/05-react/04-routing-data/`

- [x] **Step 1: Review the first 12 React lessons**

Confirm all lesson responsibilities in the React file map are present, each hub links three lessons, and no Vue or other-volume path appears in the diff.

- [x] **Step 2: Run chapter structure, link, and whitespace checks**

Expected: 12 detailed lessons, four hubs, no broken relative links, no malformed fences, and no whitespace errors.

- [x] **Step 3: Commit the first React half**

```bash
git add \
  web-fullstack-course/05-react/01-jsx-components.md \
  web-fullstack-course/05-react/01-jsx-components \
  web-fullstack-course/05-react/02-events-state-forms.md \
  web-fullstack-course/05-react/02-events-state-forms \
  web-fullstack-course/05-react/03-effects-reuse.md \
  web-fullstack-course/05-react/03-effects-reuse \
  web-fullstack-course/05-react/04-routing-data.md \
  web-fullstack-course/05-react/04-routing-data
git diff --cached --name-only
git commit -m "docs: expand React foundations and data flow tutorials"
```

Expected cached scope: only the eight listed React paths.

## 12. Task 7: React Chapter 5 - State Architecture

**Files:**
- Modify: `web-fullstack-course/05-react/05-state-architecture.md`
- Create: `web-fullstack-course/05-react/05-state-architecture/01-state-ownership-reducer-context.md`
- Create: `web-fullstack-course/05-react/05-state-architecture/02-session-favorites-concurrency.md`
- Create: `web-fullstack-course/05-react/05-state-architecture/03-external-store-context-performance-ssr.md`

- [x] **Step 1: Write the ownership/reducer/Context lesson**

Classify URL, local draft, server facts, and shared client feedback. Build a pure favorite reducer with discriminated actions and immutable results, a null-default Context, and an enforcing `useMarket` Hook. Explain why reducer and Context are not persistence.

- [x] **Step 2: Write the session/favorite concurrency lesson**

Implement initial session read, explicit refresh, conservative PUT/DELETE, per-ID locks, generation guards, logout cleanup, 401 versus infrastructure error, and late-result rejection. Include offline cancel failure and logout-during-write experiments.

- [x] **Step 3: Write the external-store/SSR lesson**

Teach Provider invalidation, Context splitting, meaningful memoization, `useSyncExternalStore` subscribe/getSnapshot/getServerSnapshot contracts, stable snapshots, per-request SSR state, and why the absent GET favorites endpoint prevents refresh restoration claims.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons into a cross-route session/favorite capstone with count, pending, failure, logout, late-response, and refresh-limit acceptance.

- [x] **Step 5: Verify Chapter 5**

Run reducer and session-order tests; verify failed writes preserve the previous selected state and logout prevents old completions from restoring user data.

## 13. Task 8: React Chapter 6 - Testing and Accessibility

**Files:**
- Modify: `web-fullstack-course/05-react/06-testing-accessibility.md`
- Create: `web-fullstack-course/05-react/06-testing-accessibility/01-pure-component-contract-tests.md`
- Create: `web-fullstack-course/05-react/06-testing-accessibility/02-router-browser-accessibility-errors.md`
- Create: `web-fullstack-course/05-react/06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md`

- [x] **Step 1: Write the pure and component test lesson**

Cover Vitest table cases, reducer immutability/idempotency, Testing Library user events, accessible queries, async `findBy`/`waitFor`, retained drafts, integer-cent requests, and why a persistence boundary may be mocked while validation remains real.

- [x] **Step 2: Write the browser/accessibility/error lesson**

Implement top-level render error recovery and preserve route-local errors. Add Playwright scenarios for shared business paths, keyboard-only search/login/publish/reserve, route-title focus, visible focus, labels, alerts/status, narrow width, and reduced-motion boundaries.

- [x] **Step 3: Write the quality-gate lesson**

Define ESLint 10 flat config with TypeScript and Hooks rules, typecheck, unit, build, Playwright, lockfile, isolated port, and CI order. Explain jsdom, Chromium, screen-reader, Safari/Firefox, database, transaction, and security evidence boundaries.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons into a risk-based quality capstone. Include test-layer responsibilities, exact commands, expected counts, keyboard evidence, study time, and navigation.

- [x] **Step 5: Verify Chapter 6**

Run lint, typecheck, unit tests, build, and all React Playwright scenarios from a fresh server using an isolated strict port.

## 14. Task 9: React Chapter 7 - Performance and Modern React

**Files:**
- Modify: `web-fullstack-course/05-react/07-performance-modern-react.md`
- Create: `web-fullstack-course/05-react/07-performance-modern-react/01-performance-measurement-memo-concurrency.md`
- Create: `web-fullstack-course/05-react/07-performance-modern-react/02-actions-optimistic-form-status.md`
- Create: `web-fullstack-course/05-react/07-performance-modern-react/03-modern-hooks-compiler-suspense-activity.md`

- [x] **Step 1: Write the measurement and concurrency lesson**

Separate network, bundle, compute, DOM, layout, and paint costs. Teach production profiling, `memo`, `useMemo`, `useCallback`, dependency failures, `useDeferredValue`, `useTransition`, input urgency, pagination, and virtualization/accessibility limits.

- [x] **Step 2: Write the Actions and optimistic lesson**

Teach `useActionState`, previous state, FormData, `useFormStatus` descendant scope, non-controlled reset behavior, `useOptimistic`, single-flight rollback, transition ordering, and why Actions do not grant backend privileges or transaction guarantees.

- [x] **Step 3: Write the modern Hook/Compiler lesson**

Provide the complete current Hook map; demonstrate `use`, stable Promise resources, Suspense and errors, React 19 ref props, `useImperativeHandle`, `useEffectEvent`, lazy/route code splitting, Compiler setup/evidence, and Activity effect teardown with retained state.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons as isolated performance/modern-API labs, state the main-entry restoration requirement, require measured conditions rather than invented gains, and list interaction acceptance.

- [x] **Step 5: Verify Chapter 7**

Typecheck and build every lab, run representative interactions in Chromium, restore the main app entry, and record unmeasured performance claims as unverified.

## 15. Task 10: React Chapter 8 - SSR and Capstone

**Files:**
- Modify: `web-fullstack-course/05-react/08-ssr-capstone.md`
- Create: `web-fullstack-course/05-react/08-ssr-capstone/01-rendering-modes-hydration-contract.md`
- Create: `web-fullstack-course/05-react/08-ssr-capstone/02-vite-ssr-serialization-isolation.md`
- Create: `web-fullstack-course/05-react/08-ssr-capstone/03-streaming-rsc-capstone-acceptance.md`

- [x] **Step 1: Write the rendering-mode and hydration lesson**

Compare CSR, SSR, SSG, and hybrid costs; explain server render versus hydration, initial-input equality, progressive GET forms, content versus interaction timing, and mismatch experiments for random values, time zones, browser globals, and invalid HTML.

- [x] **Step 2: Write the Vite SSR lesson**

Define the isolated `ssr-lab` tree, server/client entries, `renderToString`, `hydrateRoot`, recoverable errors, 200/503/404, safe JSON escaping, trusted API origins, timeouts, public/private cache rules, and per-request state.

- [x] **Step 3: Write the streaming/RSC/capstone lesson**

Explain `renderToPipeableStream`, shell/error/abort boundaries, RSC versus SSR, client/server module boundaries, Server Function authorization, React cache scope, and Next as an optional framework. Include the only complete final React SPA plus SSR snapshot and the complete shared acceptance matrix.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons into an SSR plus full-project capstone. Include exact source-ownership rules, reconstruction command, SSR HTTP/browser evidence, production exclusions, study time, and navigation.

- [x] **Step 5: Verify Chapter 8**

Reconstruct the canonical snapshot, run type/lint/unit/build, start SSR, verify 200/503/404 and safe initial data, disable JavaScript, then hydrate and change the counter from 0 to 1 without mismatch.

## 16. Task 11: React README, Coverage Matrix, Full Verification, and Second Commit

**Files:**
- Modify: `web-fullstack-course/05-react/README.md`
- Create: `web-fullstack-course/05-react/REACT-COVERAGE.md`
- Verify: `web-fullstack-course/05-react/**/*.md`

- [x] **Step 1: Rewrite the React volume route**

Keep the zero-background audience, workspace boundary, shared HTTP contract, version snapshot, integration boundary, and historical evidence. Add all eight hubs, all 24 detailed lessons, hub-versus-lesson responsibility, the coverage matrix, canonical capstone snapshot, command matrix, current evidence section, and explicit unverified environments.

- [x] **Step 2: Build `REACT-COVERAGE.md`**

Use columns:

```text
ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收
```

Use stable prefixes and complete rows:

```text
RJSX: rendering, JSX, components, props, composition, keys, Vite setup
RSTA: events, snapshots, updates, forms, validation, ownership
REFF: Effects, cleanup, HTTP, cancellation, resource state, custom Hooks
RRTR: Data Router, URL, loaders, actions, errors, auth, conflicts
RARC: reducer, Context, sessions, favorites, external stores, SSR scope
RTST: unit/component/browser tests, errors, accessibility, lint, CI
RPER: profiling, memoization, concurrency, Actions, Hooks, Compiler, Activity
RSSR: rendering modes, hydration, serialization, isolation, streaming, RSC
RCMP: React/Router/Vite/TS compatibility and version evidence
RSEC: XSS, cookie, CSRF, CORS, authorization, conflict and secret boundaries
RMAN: keyboard, screen reader, Safari, Firefox, mobile, performance and production gaps
```

Every row must link to one principal lesson and all six evidence dimensions must be locatable in that lesson. Compatibility, security, and manual-only boundaries must have dedicated rows.

- [x] **Step 3: Run React structural verification**

Use the reusable commands in Task 23. Expected: eight hubs, 24 lessons, one README, one coverage matrix, 34 Markdown files total, paired fences, exact heading order, and no relative-link failure.

- [x] **Step 4: Run the full React application checks**

From the fresh extracted React application:

```bash
pnpm lint
pnpm typecheck
pnpm exec vitest run
pnpm build
pnpm exec playwright test
```

Expected: all commands exit `0`; report actual test counts instead of copying historical counts.

- [x] **Step 5: Commit the second React half**

```bash
git add \
  web-fullstack-course/05-react/README.md \
  web-fullstack-course/05-react/REACT-COVERAGE.md \
  web-fullstack-course/05-react/05-state-architecture.md \
  web-fullstack-course/05-react/05-state-architecture \
  web-fullstack-course/05-react/06-testing-accessibility.md \
  web-fullstack-course/05-react/06-testing-accessibility \
  web-fullstack-course/05-react/07-performance-modern-react.md \
  web-fullstack-course/05-react/07-performance-modern-react \
  web-fullstack-course/05-react/08-ssr-capstone.md \
  web-fullstack-course/05-react/08-ssr-capstone
git diff --cached --name-only
git commit -m "docs: complete React architecture testing and SSR tutorials"
```

Expected cached scope: only `web-fullstack-course/05-react/`.

## 17. Task 12: Vue Chapter 1 - SFC, Templates, and Setup

**Files:**
- Modify: `web-fullstack-course/06-vue/01-sfc-templates.md`
- Create: `web-fullstack-course/06-vue/01-sfc-templates/01-sfc-template-compiler.md`
- Create: `web-fullstack-course/06-vue/01-sfc-templates/02-props-slots-list-identity.md`
- Create: `web-fullstack-course/06-vue/01-sfc-templates/03-vite-typescript-first-market.md`

- [x] **Step 1: Write the SFC and compiler lesson**

Teach SFC sections, Vite compilation, script setup instance execution, module scope, template expressions, bindings, interpolation escaping, directives, scoped-style implementation, DOM responsibility, and `v-html` trust boundaries.

- [x] **Step 2: Write the props/slots/identity lesson**

Teach typed `defineProps`, ownership, named/default/scoped slots, `v-bind`, `v-if` versus `v-show`, `v-for`, stable keys, index/random key failures, and parent-owned actions. Integrate `ListingCard` and verify reorder identity.

- [x] **Step 3: Write the setup and first-market lesson**

Cover the workspace, Vite Vue TypeScript scaffold, Vue 3.5.43, Node 24, TS6-compatible APIs, vue-tsc, strict config, `typecheck`/`build`, domain types, integer cents, UTC time, mount target, CSS, and two static cards.

- [x] **Step 4: Rewrite the chapter hub**

Route the three lessons into a static Vue market capstone with prerequisites, dependency order, study time, evidence, framework boundaries, and navigation.

- [x] **Step 5: Verify Chapter 1**

Run vue-tsc/build in the temporary Vue workspace, inspect prop/binding failures, check 320px layout, and confirm three detailed lessons.

## 18. Task 13: Vue Chapter 2 - Reactivity, Events, and Forms

**Files:**
- Modify: `web-fullstack-course/06-vue/02-reactivity-events-forms.md`
- Create: `web-fullstack-course/06-vue/02-reactivity-events-forms/01-ref-reactive-computed-updates.md`
- Create: `web-fullstack-course/06-vue/02-reactivity-events-forms/02-component-events-v-model-forms.md`
- Create: `web-fullstack-course/06-vue/02-reactivity-events-forms/03-search-publish-state-ownership.md`

- [x] **Step 1: Write the reactivity lesson**

Explain ref, reactive, Proxy tracking, template unwrapping, computed purity/cache, update queues, `nextTick`, `toRef`/`toRefs`, reactive props destructure in Vue 3.5, and failure after ordinary destructuring.

- [x] **Step 2: Write the events/v-model/forms lesson**

Teach DOM events, typed `defineEmits`, non-bubbling component events, `defineModel`, command prop versus notification event, amount-string validation, accessible labels, submit prevention, pending/error/success, retained drafts, and success-only reset.

- [x] **Step 3: Write the local market lesson**

Integrate ref-owned items, computed filtering/count, empty state, local publication, state ownership, one-time UUID creation, filter-hidden diagnosis, and explicit refresh loss.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons into a searchable local Vue market capstone with input/output contract, study time, acceptance, in-memory limit, and navigation.

- [x] **Step 5: Verify Chapter 2**

Run vue-tsc/build and the shared amount assertions; verify Enter, Tab, save failure retention, search reset, and empty state.

## 19. Task 14: Vue Chapter 3 - Lifecycle, HTTP, and Composables

**Files:**
- Modify: `web-fullstack-course/06-vue/03-lifecycle-composables.md`
- Create: `web-fullstack-course/06-vue/03-lifecycle-composables/01-lifecycle-watch-cleanup.md`
- Create: `web-fullstack-course/06-vue/03-lifecycle-composables/02-fetch-http-abort-resource-state.md`
- Create: `web-fullstack-course/06-vue/03-lifecycle-composables/03-composables-local-api-retry.md`

- [x] **Step 1: Write the lifecycle/watch lesson**

Teach synchronous lifecycle registration, mounted/unmounted responsibilities, nextTick, watch sources, immediate/flush, watchEffect synchronous dependency collection, async-await tracking limits, watcher cleanup timing, and leak diagnosis.

- [x] **Step 2: Write the HTTP/resource lesson**

Define `ApiError`, response checks, generic-assertion limits, credentials and CSRF boundaries, `AbortController`, shallow server snapshots, stale-result guards, and success-empty versus error.

- [x] **Step 3: Write the composable/API lesson**

Build `useListings` with `MaybeRefOrGetter`, `toValue`, explicit watch, retry revision, cancellation, and local middleware. Explain per-call state, returned refs, async-created watcher cleanup, localhost-only API, and real proxy replacement.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons into a server-backed Vue list capstone with slow-network, `__error`, offline, empty, normal, and retry acceptance.

- [x] **Step 5: Verify Chapter 3**

Use Chromium throttling to prove the current query owns the final result, and run vue-tsc/build against plugin plus SFC code.

## 20. Task 15: Vue Chapter 4 - Router and Server Data

**Files:**
- Modify: `web-fullstack-course/06-vue/04-router-data.md`
- Create: `web-fullstack-course/06-vue/04-router-data/01-router-url-state-navigation.md`
- Create: `web-fullstack-course/06-vue/04-router-data/02-route-data-fetch-cancellation-errors.md`
- Create: `web-fullstack-course/06-vue/04-router-data/03-auth-publish-reservation-conflicts.md`

- [x] **Step 1: Write the URL/router lesson**

Teach `createRouter`, web history, RouterLink/View, q/page/id ownership, query normalization, input draft synchronization, search reset, pagination preservation, back/forward behavior, and static-server fallback.

- [x] **Step 2: Write the route-data lesson**

Teach navigation-after-fetch, loading/error/empty/success states, route component reuse, precise param/query watchers, cancellation, detail retry, late write-result route checks, and 404/503 recovery.

- [x] **Step 3: Write the auth/publication/reservation lesson**

Integrate teaching login, server listing IDs, publication, reservation, 401/403/404/409/422/503 meanings, no browser-supplied buyer identity, two-tab conflict, and failed-draft retention.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons into a shareable Vue market capstone with URL, publication, reservation, recovery, study-time, backend-authority, and navigation acceptance.

- [x] **Step 5: Verify Chapter 4**

Run vue-tsc/build, refresh deep links, back/forward, publish after login, and record one reservation success plus one 409.

## 21. Task 16: Commit Vue Chapters 1-4

**Files:**
- Stage only: `web-fullstack-course/06-vue/01-sfc-templates.md`
- Stage only: `web-fullstack-course/06-vue/01-sfc-templates/`
- Stage only: `web-fullstack-course/06-vue/02-reactivity-events-forms.md`
- Stage only: `web-fullstack-course/06-vue/02-reactivity-events-forms/`
- Stage only: `web-fullstack-course/06-vue/03-lifecycle-composables.md`
- Stage only: `web-fullstack-course/06-vue/03-lifecycle-composables/`
- Stage only: `web-fullstack-course/06-vue/04-router-data.md`
- Stage only: `web-fullstack-course/06-vue/04-router-data/`

- [x] **Step 1: Review the first 12 Vue lessons**

Confirm every mapped responsibility is present, every hub links exactly three lessons, and no React or other-volume path appears in the diff.

- [x] **Step 2: Run chapter structure, link, and whitespace checks**

Expected: 12 detailed lessons, four hubs, no broken relative links, no malformed fences, and no whitespace errors.

- [x] **Step 3: Commit the first Vue half**

```bash
git add \
  web-fullstack-course/06-vue/01-sfc-templates.md \
  web-fullstack-course/06-vue/01-sfc-templates \
  web-fullstack-course/06-vue/02-reactivity-events-forms.md \
  web-fullstack-course/06-vue/02-reactivity-events-forms \
  web-fullstack-course/06-vue/03-lifecycle-composables.md \
  web-fullstack-course/06-vue/03-lifecycle-composables \
  web-fullstack-course/06-vue/04-router-data.md \
  web-fullstack-course/06-vue/04-router-data
git diff --cached --name-only
git commit -m "docs: expand Vue foundations and data flow tutorials"
```

Expected cached scope: only the eight listed Vue paths.

## 22. Task 17: Vue Chapter 5 - Pinia and State Architecture

**Files:**
- Modify: `web-fullstack-course/06-vue/05-pinia-architecture.md`
- Create: `web-fullstack-course/06-vue/05-pinia-architecture/01-state-ownership-pinia-store.md`
- Create: `web-fullstack-course/06-vue/05-pinia-architecture/02-session-favorites-concurrency.md`
- Create: `web-fullstack-course/06-vue/05-pinia-architecture/03-provide-inject-store-ssr.md`

- [x] **Step 1: Write the ownership/Pinia lesson**

Classify local, URL, server, and shared client state; define a setup store; explain state/getter/action mapping, direct store access, `storeToRefs`, complete state exposure, and why server pages are not copied into Pinia.

- [x] **Step 2: Write the session/favorite lesson**

Implement session load/login/logout, conservative idempotent favorite writes, per-ID busy state, epoch guards, 401 versus network error, failed-write preservation, and stale-response rejection.

- [x] **Step 3: Write the provide/inject/SSR lesson**

Create a typed display service with `InjectionKey`, fail on missing providers, separate services from mutable global state, define readonly command boundaries, create Pinia per SSR request, and document the absent favorite-query limitation.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons into a cross-route Pinia capstone with count, pending, failure, logout, stale response, provider failure, and refresh-limit acceptance.

- [x] **Step 5: Verify Chapter 5**

Run store order tests, provider failure checks, vue-tsc/build, and confirm failed favorite writes retain prior state while logout blocks old completions.

## 23. Task 18: Vue Chapter 6 - Testing and Accessibility

**Files:**
- Modify: `web-fullstack-course/06-vue/06-testing-accessibility.md`
- Create: `web-fullstack-course/06-vue/06-testing-accessibility/01-pure-component-store-tests.md`
- Create: `web-fullstack-course/06-vue/06-testing-accessibility/02-router-browser-accessibility-errors.md`
- Create: `web-fullstack-course/06-vue/06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md`

- [x] **Step 1: Write the pure/component/store test lesson**

Cover Vitest table cases, Vue Test Utils input/submit behavior, `flushPromises`, retained drafts, emitted success, Pinia activation, deferred Promise ordering, idempotent targets, and no arbitrary sleeps.

- [x] **Step 2: Write the browser/accessibility/error lesson**

Implement `onErrorCaptured` fallback/rebuild boundaries and Playwright scenarios for the shared flows, two-page reservation conflict, keyboard-only operation, route focus, labels, alerts/status, narrow width, Escape, and reduced motion.

- [x] **Step 3: Write the quality-gate lesson**

Define ESLint 10 flat config for TypeScript and SFC parsing, vue-tsc, unit, build, Playwright, frozen lockfile, isolated server, CI order, and the limits of jsdom/Chromium versus assistive technology and backend concurrency.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons into a risk-based Vue quality capstone with test-layer ownership, exact commands, expected evidence, keyboard checks, study time, and navigation.

- [x] **Step 5: Verify Chapter 6**

Run lint, vue-tsc, unit tests, build, and all Vue Playwright scenarios from a fresh isolated server.

## 24. Task 19: Vue Chapter 7 - Performance and Advanced Vue

**Files:**
- Modify: `web-fullstack-course/06-vue/07-performance-advanced-vue.md`
- Create: `web-fullstack-course/06-vue/07-performance-advanced-vue/01-performance-shallow-reactivity-measurement.md`
- Create: `web-fullstack-course/06-vue/07-performance-advanced-vue/02-teleport-transition-dialog-accessibility.md`
- Create: `web-fullstack-course/06-vue/07-performance-advanced-vue/03-keepalive-async-components-lifecycle.md`

- [x] **Step 1: Write the measurement/shallow-reactivity lesson**

Separate network, JS, compute, DOM, layout, and paint. Teach production profiling, computed caching, shallowRef root replacement, stable props, `v-once`/`v-memo` risks, pagination, virtualization, nextTick limits, and measured evidence.

- [x] **Step 2: Write the Teleport/Transition lesson**

Build a native modal dialog teleported to a stable target, synchronize `defineModel`, focus restoration, Escape/cancel/close, latest-value checks after nextTick, Transition state, reduced motion, and missing-target diagnosis.

- [x] **Step 3: Write the KeepAlive/async lesson**

Teach activation/deactivation versus unmount, timer/resource pause, cache identity and eviction, user-session cache reset, `defineAsyncComponent` loading/error/timeout, route dynamic imports, stale chunk failures, and Suspense's stated stability boundary.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons as isolated advanced labs, require restoring the main entry, require conditions with every measurement, and define dialog/cache/chunk acceptance.

- [x] **Step 5: Verify Chapter 7**

Run vue-tsc/build and Chromium interactions for dialog focus/Escape, reduced motion, draft preservation, paused timers, async loading/error, shallowRef updates, then restore the main app.

## 25. Task 20: Vue Chapter 8 - SSR and Capstone

**Files:**
- Modify: `web-fullstack-course/06-vue/08-ssr-capstone.md`
- Create: `web-fullstack-course/06-vue/08-ssr-capstone/01-rendering-modes-hydration-contract.md`
- Create: `web-fullstack-course/06-vue/08-ssr-capstone/02-vite-vue-ssr-serialization-isolation.md`
- Create: `web-fullstack-course/06-vue/08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md`

- [x] **Step 1: Write the rendering-mode/hydration lesson**

Compare CSR, SSR, SSG, and hybrid costs; explain createSSRApp hydration, identical initial inputs, progressive GET forms, content versus interaction timing, and mismatch experiments for random values, local storage, invalid HTML, and time zones.

- [x] **Step 2: Write the Vite Vue SSR lesson**

Define the isolated SSR tree, per-request app/router/Pinia factory, memory/web history, router readiness, server renderer, client mount, 200/503/404, safe JSON, trusted upstreams, timeouts, lifecycle limits, and cache isolation.

- [x] **Step 3: Write the streaming/Nuxt/capstone lesson**

Explain server prefetch, streaming/error/abort boundaries, Teleport SSR placement, async-component hydration, Pinia state serialization, Nuxt as an optional integrated framework, and production dual-build exclusions. Include the only complete final Vue SPA plus SSR snapshot and shared acceptance matrix.

- [x] **Step 4: Rewrite the chapter hub**

Route the lessons into a Vue SSR plus full-project capstone with source ownership, reconstruction, SSR HTTP/browser evidence, production gaps, study time, and navigation.

- [x] **Step 5: Verify Chapter 8**

Reconstruct the canonical snapshot, run lint/vue-tsc/unit/build, start SSR, verify 200/503/404 and safe data, disable JavaScript, then hydrate and change 0 to 1 without mismatch.

## 26. Task 21: Vue README, Coverage Matrix, Full Verification, and Second Commit

**Files:**
- Modify: `web-fullstack-course/06-vue/README.md`
- Create: `web-fullstack-course/06-vue/VUE-COVERAGE.md`
- Verify: `web-fullstack-course/06-vue/**/*.md`

- [x] **Step 1: Rewrite the Vue volume route**

Keep the zero-background audience, SFC/Composition API baseline, workspace boundary, shared HTTP contract, version snapshot, integration boundary, and historical evidence. Add all eight hubs, all 24 lessons, hub-versus-lesson responsibility, coverage link, capstone source, command matrix, current evidence, and unverified environments.

- [x] **Step 2: Build `VUE-COVERAGE.md`**

Use the same columns as the React matrix and these stable prefixes:

```text
VSFC: SFCs, templates, compilation, props, slots, directives, keys, Vite setup
VRCT: ref/reactive/computed, events, v-model, forms, validation, ownership
VLIF: lifecycle, watchers, cleanup, HTTP, cancellation, composables
VRTR: Router, URL, data loading, reuse, errors, auth, conflicts
VPIN: Pinia, sessions, favorites, provide/inject, SSR scope
VTST: unit/component/store/browser tests, errors, accessibility, lint, CI
VPER: profiling, shallow reactivity, Teleport, Transition, KeepAlive, async loading
VSSR: rendering modes, hydration, serialization, isolation, streaming, Nuxt
VCMP: Vue/Router/Pinia/Vite/vue-tsc/TS compatibility and version evidence
VSEC: XSS, cookie, CSRF, CORS, authorization, conflict and secret boundaries
VMAN: keyboard, screen reader, Safari, Firefox, mobile, performance and production gaps
```

Every row must link to one principal lesson and expose all six evidence dimensions. Compatibility, security, and manual-only boundaries require dedicated rows.

- [x] **Step 3: Run Vue structural verification**

Expected: eight hubs, 24 lessons, one README, one coverage matrix, 34 Markdown files total, paired fences, exact heading order, and no relative-link failure.

- [x] **Step 4: Run the full Vue application checks**

From the fresh extracted Vue application:

```bash
pnpm lint
pnpm typecheck
pnpm exec vitest run
pnpm build
pnpm exec playwright test
```

Expected: all commands exit `0`; report actual test counts.

- [x] **Step 5: Commit the second Vue half**

```bash
git add \
  web-fullstack-course/06-vue/README.md \
  web-fullstack-course/06-vue/VUE-COVERAGE.md \
  web-fullstack-course/06-vue/05-pinia-architecture.md \
  web-fullstack-course/06-vue/05-pinia-architecture \
  web-fullstack-course/06-vue/06-testing-accessibility.md \
  web-fullstack-course/06-vue/06-testing-accessibility \
  web-fullstack-course/06-vue/07-performance-advanced-vue.md \
  web-fullstack-course/06-vue/07-performance-advanced-vue \
  web-fullstack-course/06-vue/08-ssr-capstone.md \
  web-fullstack-course/06-vue/08-ssr-capstone
git diff --cached --name-only
git commit -m "docs: complete Vue architecture testing and SSR tutorials"
```

Expected cached scope: only `web-fullstack-course/06-vue/`.

## 27. Task 22: Reconcile React and Vue Business Scope

**Files:**
- Verify: `web-fullstack-course/05-react/**/*.md`
- Verify: `web-fullstack-course/06-vue/**/*.md`
- Verify: `web-fullstack-course/05-react/REACT-COVERAGE.md`
- Verify: `web-fullstack-course/06-vue/VUE-COVERAGE.md`

- [x] **Step 1: Compare the domain and API tables**

Confirm the Listing, Page, Reservation, User, error body, route list, status codes, amount range, UTC rule, cookie model, CSRF boundary, favorite method semantics, and reservation authority are identical in meaning.

- [x] **Step 2: Compare the page-state and recovery tables**

Both volumes must independently show loading, error, empty, success, unauthenticated, forbidden, not-found, validation, and conflict paths. A framework-specific mechanism may differ, but no business state may exist in only one volume.

- [x] **Step 3: Compare unit and browser scenarios**

Assert that all ten shared scenario names are present in each capstone/test route and that expected outcomes match. React and Vue may group tests differently; they may not omit assertions or weaken conflict/error semantics.

- [x] **Step 4: Compare SSR evidence**

Both volumes must require raw HTML containing the listing, q-driven filtering, 503 recovery, true 404, no-JavaScript GET search, safe `</script>` serialization, no private session serialization, 0-to-1 hydration, and per-request state.

- [x] **Step 5: Record intentional framework differences**

Add a concise table to each README covering state model, lifecycle synchronization, routing data strategy, application state mechanism, error boundary, performance tools, and SSR factory. This table explains differences without ranking one framework or sharing component source.

## 28. Task 23: Run Reusable Documentation Checks

**Files:**
- Verify: `web-fullstack-course/05-react/**/*.md`
- Verify: `web-fullstack-course/06-vue/**/*.md`

- [x] **Step 1: Verify lesson counts, hubs, headings, and fences**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

for volume, matrix in (
    ("05-react", "REACT-COVERAGE.md"),
    ("06-vue", "VUE-COVERAGE.md"),
):
    root = Path("web-fullstack-course") / volume
    hubs = sorted(root.glob("[0-9][0-9]-*.md"))
    lessons = sorted(root.glob("[0-9][0-9]-*/*.md"))
    assert len(hubs) == 8, (volume, len(hubs))
    assert len(lessons) == 24, (volume, len(lessons))
    assert (root / "README.md").exists()
    assert (root / matrix).exists()
    assert len(list(root.rglob("*.md"))) == 34
    expected = [str(number) for number in range(1, 14)]
    for lesson in lessons:
        text = lesson.read_text()
        visible = re.sub(r"```.*?```", "", text, flags=re.S)
        actual = re.findall(r"^## ([0-9]+)\.", visible, flags=re.M)
        assert actual == expected, (lesson, actual)
        for heading in ("## 任务卡", "## 我现在能做到什么", "## 单元导航"):
            assert heading in visible, (lesson, heading)
        assert text.count("```") % 2 == 0, lesson
    for hub in hubs:
        target_dir = hub.with_suffix("")
        links = re.findall(r"\]\(([^)]+\.md(?:#[^)]+)?)\)", hub.read_text())
        child_links = {
            link.split("#", 1)[0]
            for link in links
            if link.split("#", 1)[0].startswith(f"./{target_dir.name}/")
        }
        assert len(child_links) == 3, (hub, sorted(child_links))
    print(f"{volume}: PASS (8 hubs, 24 lessons, 34 Markdown files)")
PY
```

Expected: two PASS lines.

- [x] **Step 2: Verify all relative Markdown links**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

errors = []
for root in (
    Path("web-fullstack-course/05-react"),
    Path("web-fullstack-course/06-vue"),
):
    for file_path in root.rglob("*.md"):
        visible = re.sub(r"```.*?```", "", file_path.read_text(), flags=re.S)
        for target in re.findall(r"\[[^\]]+\]\(([^)\s]+)", visible):
            if "://" in target or target.startswith(("#", "mailto:", "tel:")):
                continue
            path_part = target.split("#", 1)[0]
            if path_part and not (file_path.parent / path_part).resolve().exists():
                errors.append(f"{file_path}: {target}")
assert not errors, "\n".join(errors)
print("Batch C relative links: PASS")
PY
```

Expected: `Batch C relative links: PASS`.

- [x] **Step 3: Verify unfinished markers and shorthand are absent**

Run:

```bash
rg -n '\b(TO[D]O|TB[D]|FIX[M]E|WI[P])\b|待完[善]|自行补[充]|占位[符]|同前|照前文|类[似]前文' \
  web-fullstack-course/05-react web-fullstack-course/06-vue
```

Expected: no output and exit status `1`.

- [x] **Step 4: Verify whitespace and repository artifacts**

Run:

```bash
git diff --check -- web-fullstack-course/05-react web-fullstack-course/06-vue
find web-fullstack-course/05-react web-fullstack-course/06-vue \
  -type d \( -name node_modules -o -name dist -o -name coverage -o -name labs \) -print
find web-fullstack-course/05-react web-fullstack-course/06-vue \
  -type f \( -name package.json -o -name pnpm-lock.yaml -o -name .env \) -print
```

Expected: no output.

## 29. Task 24: Reconstruct and Verify Both Temporary Applications

**Files:**
- Read complete-file blocks from: `web-fullstack-course/05-react/**/*.md`
- Read complete-file blocks from: `web-fullstack-course/06-vue/**/*.md`
- Create temporary files only under: `/tmp/full-course-verification/batch-c-*`

- [x] **Step 1: Create a fresh isolated root**

Run:

```bash
VERIFY_ROOT="$(mktemp -d /tmp/full-course-verification-batch-c.XXXXXX)"
printf '%s\n' "$VERIFY_ROOT"
```

Expected: one new empty temporary directory. Do not reuse the historical `/tmp/fullstack-react-20261010-verification` or `/tmp/fullstack-vue-20261010-verification`.

- [x] **Step 2: Reconstruct the React and Vue canonical snapshots**

Extract each volume's capstone complete-file blocks into:

```text
$VERIFY_ROOT/react/neighborhood-market/apps/react-web
$VERIFY_ROOT/vue/neighborhood-market/apps/vue-web
```

Use the exact package and configuration content declared by each capstone. Assert that no complete-file path appears twice in one snapshot and that every imported local module exists.

- [x] **Step 3: Install with recorded versions and lock the evidence**

Use Node 24 and the version-baseline-compatible pnpm. Record:

```bash
node --version
pnpm --version
pnpm list --depth 0
```

Do not silently upgrade to canary packages or replace the TS6 compatibility line with TS7. If registry resolution differs from the documented snapshot, record the actual resolved versions and resolve API incompatibility before claiming a pass.

- [x] **Step 4: Run the React gates**

From `apps/react-web`:

```bash
pnpm lint
pnpm typecheck
pnpm exec vitest run
pnpm build
pnpm exec playwright install chromium
pnpm exec playwright test
```

Expected: all exit `0`, with current test counts recorded.

- [x] **Step 5: Run the Vue gates**

From `apps/vue-web`:

```bash
pnpm lint
pnpm typecheck
pnpm exec vitest run
pnpm build
pnpm exec playwright install chromium
pnpm exec playwright test
```

Expected: all exit `0`, with current test counts recorded.

- [x] **Step 6: Run negative type gates**

In copies inside the temporary root, inject one invalid Listing status into each application. React `pnpm typecheck` and Vue `pnpm typecheck` must fail. Restore the copied file and rerun; both must pass. This proves the commands execute real TSX/SFC checks rather than only Vite transpilation.

## 30. Task 25: Verify SSR, Chromium, Keyboard, and Manual Boundaries

**Files:**
- Verify temporary React SSR application
- Verify temporary Vue SSR application
- Verify temporary React and Vue Playwright suites

- [x] **Step 1: Verify React SSR HTTP output**

Start the React SSR server on `127.0.0.1:4173`, then request:

```text
/?q=台灯       -> 200 and raw HTML contains 九成新台灯
/?q=__error    -> 503 and a recovery link
/?q=不存在     -> 200 and an empty message
/missing       -> 404
```

Also test a fixture containing `</script>` and confirm the initial-data script contains the escaped form rather than a second script element.

- [x] **Step 2: Verify Vue SSR HTTP output**

Start the Vue SSR server on `127.0.0.1:4174` and require the same four statuses and content rules, including safe initial-data serialization.

- [x] **Step 3: Verify hydration and disabled-JavaScript behavior**

For both applications:

- raw HTML must contain the listing before client JavaScript;
- JavaScript-disabled GET search must return filtered HTML;
- hydration must change the counter from 0 to 1;
- Console must not contain hydration recovery or mismatch output;
- no cookie, CSRF value, password, private user object, or server secret may appear in initial JSON.

- [x] **Step 4: Verify shared Chromium flows**

Run all ten shared scenario names. Require role/name locators for primary controls, one success plus one 409 in the two-page reservation case, retained draft after failed publish, no duplicate favorites, cleared session state after logout, and recovery from 404/503.

- [x] **Step 5: Verify keyboard and responsive paths**

At 320 CSS pixels and 200% zoom, use Tab, Shift+Tab, Enter, Space, and Escape to complete search, login, publish, favorite, reservation, dialog close, and recovery. Verify visible focus, no horizontal page overflow, labels, route heading focus, status/alert behavior, and reduced-motion handling.

- [x] **Step 6: Record manual gaps without converting them to passes**

List Safari, Firefox, real mobile devices, VoiceOver, NVDA, JAWS, production SSR dual builds, real backend/database transactions, real CSRF, load testing, CDN caching, deployment, and performance gains as unverified unless separately executed with evidence.

## 31. Task 26: Final Scope Audit and Correction Commits

**Files:**
- Review: `web-fullstack-course/05-react/`
- Review: `web-fullstack-course/06-vue/`

- [x] **Step 1: Compare every requirement with a concrete file**

Check all 48 rows in the two file maps, all 16 hub rewrites, both READMEs, both coverage matrices, all shared parity rows, type/test/build/SSR/Chromium evidence, and all manual boundaries.

- [x] **Step 2: Sample every coverage prefix**

Open at least one row from each React and Vue prefix and navigate to theory, minimal case, market case, diagnosis, exercise, and acceptance evidence. Fix missing content before final status.

- [x] **Step 3: Review repository scope**

Run:

```bash
git status --short
git diff --stat
git diff --check
git diff --name-only
```

Expected: implementation changes are confined to `web-fullstack-course/05-react/` and `web-fullstack-course/06-vue/`, aside from plan checkbox updates made by the execution workflow. User files outside those paths remain unstaged.

- [x] **Step 4: Commit React corrections separately when needed**

```bash
git add web-fullstack-course/05-react
git diff --cached --name-only
git commit -m "docs: reconcile React textbook coverage and evidence"
```

Create this commit only when React corrections exist. The cached list must contain no Vue path.

- [x] **Step 5: Commit Vue corrections separately when needed**

```bash
git add web-fullstack-course/06-vue
git diff --cached --name-only
git commit -m "docs: reconcile Vue textbook coverage and evidence"
```

Create this commit only when Vue corrections exist. The cached list must contain no React path.

- [x] **Step 6: Remove temporary verification state**

Stop every local server and remove only the temporary root created in Task 24. Confirm no background server owns ports 4173, 4174, or the two E2E ports.

## 32. Completion Evidence

Retain these observed results before reporting Batch C complete:

```text
React: 8 stable chapter hubs, 24 detailed lessons, 1 README, 1 coverage matrix
Vue: 8 stable chapter hubs, 24 detailed lessons, 1 README, 1 coverage matrix
Batch C total: 68 Markdown files across the two volumes
All 48 lessons: exact 13-section contract plus task card, outcome, and navigation
All 16 hubs: exactly three lesson links, capstone, acceptance, and navigation
0 broken relative links
0 unfinished markers or shorthand references
0 malformed code fences
0 whitespace errors
0 repository package, lock, dependency, build, coverage, or lab artifacts
React and Vue shared business contract: reconciled
React: lint, typecheck, unit/component tests, build, Chromium E2E recorded
Vue: lint, vue-tsc, unit/component/store tests, build, Chromium E2E recorded
React SSR: 200/503/404, no-JavaScript HTML, safe serialization, hydration recorded
Vue SSR: 200/503/404, no-JavaScript HTML, safe serialization, hydration recorded
Keyboard and responsive primary paths recorded
Cross-browser, assistive-technology, production-backend, deployment, load, and performance gaps explicit
React and Vue commit histories remain separate
No remote push or deployment
```
