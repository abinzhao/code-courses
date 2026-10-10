# Course Batch A Foundations, CSS, and Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the two foundation practice chapters, ten CSS chapters, and six browser chapters into 54 detailed textbook lessons with stable hubs and auditable coverage.

**Architecture:** Keep each existing numbered Markdown file as a concise hub. Add same-named directories for detailed lessons. CSS examples remain standalone HTML/CSS documents; browser examples reuse the documented `browser-lab` contract but remain embedded in Markdown.

**Tech Stack:** Markdown, HTML, CSS, JavaScript, Node.js 24, browser DOM/Web APIs, Chromium DevTools.

---

## 1. Shared Contract

Every detailed lesson follows the full 13-section contract in the master design. Each lesson must contain:

- one minimal runnable case;
- one Neighbor Market integration case;
- one explicit incorrect case;
- diagnosis and recovery evidence;
- basic, advanced, and failure-injection exercises;
- answers or acceptance criteria;
- official references and a verification date.

No repository source project, package manifest, lock file, or `labs/` directory may be added.

## 2. Task 1: Split the First-Page Practice Chapter

**Files:**
- Modify: `web-fullstack-course/00-guide/03-computer-first-page.md`
- Create: `web-fullstack-course/00-guide/03-computer-first-page/01-files-paths-editors.md`
- Create: `web-fullstack-course/00-guide/03-computer-first-page/02-url-http-first-page.md`
- Create: `web-fullstack-course/00-guide/03-computer-first-page/03-devtools-first-request-evidence.md`

- [ ] Write `01-files-paths-editors.md`: files versus folders, absolute/relative paths, extensions, encodings, editors, save state, and a visible wrong-file diagnosis.
- [ ] Write `02-url-http-first-page.md`: URL parts, `file:` versus HTTP, local server, request/response, MIME type, 200/404, and the first Neighbor Market page.
- [ ] Write `03-devtools-first-request-evidence.md`: Elements, Console, Network, Sources, reload behavior, screenshots, and a first evidence record.
- [ ] Rewrite the hub with route, prerequisites, three-step project, and W1 acceptance links.
- [ ] Verify all three lessons and relative links.

## 3. Task 2: Split the Terminal, Git, and Debugging Practice Chapter

**Files:**
- Modify: `web-fullstack-course/00-guide/04-terminal-git-debugging.md`
- Create: `web-fullstack-course/00-guide/04-terminal-git-debugging/01-terminal-processes-ports.md`
- Create: `web-fullstack-course/00-guide/04-terminal-git-debugging/02-git-three-trees-commits-branches.md`
- Create: `web-fullstack-course/00-guide/04-terminal-git-debugging/03-evidence-driven-debugging-loop.md`

- [ ] Write `01-terminal-processes-ports.md`: shell, working directory, quoting, exit code, environment, process, signal, port ownership, and safe termination.
- [ ] Write `02-git-three-trees-commits-branches.md`: working tree, index, repository, diff, commit, branch, merge conflict, ignored files, and non-destructive recovery.
- [ ] Write `03-evidence-driven-debugging-loop.md`: reproduce, minimise, hypothesise, instrument, fix, regress, and report using a broken local page.
- [ ] Rewrite the hub with route, command safety, project evidence, and acceptance.
- [ ] Verify all three lessons without running destructive Git commands.

## 4. Task 3: CSS Syntax, Cascade, and Selectors

**Files:**
- Modify: `web-fullstack-course/02-css/01-syntax-cascade-selectors.md`
- Create: `web-fullstack-course/02-css/01-syntax-cascade-selectors/01-rules-parsing-entry-points.md`
- Create: `web-fullstack-course/02-css/01-syntax-cascade-selectors/02-cascade-layers-specificity.md`
- Create: `web-fullstack-course/02-css/01-syntax-cascade-selectors/03-selectors-pseudo-classes-inheritance.md`

- [ ] Cover CSS token/rule parsing, declarations, invalid-at-computed-value behavior, inline/internal/external styles and resource evidence.
- [ ] Cover origin, importance, context, style attributes, layers, specificity, scope proximity and source order with a deterministic decision table.
- [ ] Cover type/class/ID/attribute/relationship selectors, functional pseudo-classes, pseudo-elements, inheritance and selector debugging.
- [ ] Rewrite the hub and verify three standalone pages.

## 5. Task 4: CSS Values, Units, and Color

**Files:**
- Modify: `web-fullstack-course/02-css/02-values-colors-units.md`
- Create: `web-fullstack-course/02-css/02-values-colors-units/01-value-stages-units-percentages.md`
- Create: `web-fullstack-course/02-css/02-values-colors-units/02-font-viewport-container-math.md`
- Create: `web-fullstack-course/02-css/02-values-colors-units/03-color-spaces-transparency-contrast.md`

- [ ] Explain specified, computed, used and actual values; absolute/relative units; percentages and containing references.
- [ ] Explain font, root-font, viewport and container units plus `calc`, `min`, `max`, `clamp` and typed arithmetic boundaries.
- [ ] Explain sRGB, HSL, modern color functions, alpha, interpolation, system colors, contrast and fallback ordering.
- [ ] Rewrite the hub and verify computed-style observations.

## 6. Task 5: Box Model, Flow, and Positioning

**Files:**
- Modify: `web-fullstack-course/02-css/03-box-sizing-flow-position.md`
- Create: `web-fullstack-course/02-css/03-box-sizing-flow-position/01-box-model-intrinsic-sizing-overflow.md`
- Create: `web-fullstack-course/02-css/03-box-sizing-flow-position/02-normal-flow-formatting-contexts-margins.md`
- Create: `web-fullstack-course/02-css/03-box-sizing-flow-position/03-containing-block-position-stacking.md`

- [ ] Explain content/padding/border/margin, `box-sizing`, min/max content, replaced elements, overflow and scroll containers.
- [ ] Explain block/inline formatting, margin collapse, floats, BFC creation and normal-flow reading order.
- [ ] Explain containing blocks, relative/absolute/fixed/sticky positioning, z-order, stacking contexts and top-layer boundaries.
- [ ] Rewrite the hub and verify overflow and stacking failure cases.

## 7. Task 6: Typography and Decoration

**Files:**
- Modify: `web-fullstack-course/02-css/04-typography-decoration.md`
- Create: `web-fullstack-course/02-css/04-typography-decoration/01-font-loading-fallback-metrics.md`
- Create: `web-fullstack-course/02-css/04-typography-decoration/02-line-breaking-i18n-readability.md`
- Create: `web-fullstack-course/02-css/04-typography-decoration/03-background-border-shadow-filter-clip.md`

- [ ] Explain font families, faces, loading, fallback metrics, variable fonts and layout-shift mitigation.
- [ ] Explain line boxes, spacing, wrapping, hyphenation, overflow, vertical/bidirectional text and readability.
- [ ] Explain layered backgrounds, borders, radii, shadows, filters, masks/clip boundaries and accessible alternatives.
- [ ] Rewrite the hub and verify local/fallback font behavior without bundling font files.

## 8. Task 7: Flexbox

**Files:**
- Modify: `web-fullstack-course/02-css/05-flexbox.md`
- Create: `web-fullstack-course/02-css/05-flexbox/01-axes-wrapping-alignment.md`
- Create: `web-fullstack-course/02-css/05-flexbox/02-grow-shrink-basis-auto-minimum.md`
- Create: `web-fullstack-course/02-css/05-flexbox/03-responsive-toolbar-reading-order.md`

- [ ] Explain flex axes, direction, wrapping, gaps and alignment.
- [ ] Derive base size, free space, grow/shrink distribution and automatic minimum-size failures.
- [ ] Build a responsive Neighbor Market toolbar/card row while preserving DOM, focus and reading order.
- [ ] Rewrite the hub and verify 320 px overflow behavior.

## 9. Task 8: Grid and Subgrid

**Files:**
- Modify: `web-fullstack-course/02-css/06-grid.md`
- Create: `web-fullstack-course/02-css/06-grid/01-explicit-tracks-lines-areas.md`
- Create: `web-fullstack-course/02-css/06-grid/02-auto-placement-implicit-responsive-repeat.md`
- Create: `web-fullstack-course/02-css/06-grid/03-subgrid-alignment-fallback.md`

- [ ] Explain explicit tracks, lines, named areas, `fr`, intrinsic sizing and track overflow.
- [ ] Explain auto placement, dense risks, implicit tracks, `repeat`, `auto-fit`, `auto-fill` and `minmax`.
- [ ] Explain Subgrid alignment, support detection, ordinary Grid fallback and semantic order.
- [ ] Rewrite the hub and verify Grid/Subgrid representative layouts.

## 10. Task 9: Responsive and Container Queries

**Files:**
- Modify: `web-fullstack-course/02-css/07-responsive-container.md`
- Create: `web-fullstack-course/02-css/07-responsive-container/01-media-queries-content-breakpoints.md`
- Create: `web-fullstack-course/02-css/07-responsive-container/02-container-queries-units.md`
- Create: `web-fullstack-course/02-css/07-responsive-container/03-logical-properties-input-safe-area-preferences.md`

- [ ] Explain mobile-first media queries, content breakpoints, range syntax, viewport and print boundaries.
- [ ] Explain query containers, containment side effects, style/size queries and container units.
- [ ] Explain logical properties, writing modes, pointer/hover, safe areas, forced colors, contrast and user preferences.
- [ ] Rewrite the hub and verify narrow, wide, print and preference states.

## 11. Task 10: Transform, Transition, and Animation

**Files:**
- Modify: `web-fullstack-course/02-css/08-transforms-transitions-animation.md`
- Create: `web-fullstack-course/02-css/08-transforms-transitions-animation/01-transforms-coordinates-compositing.md`
- Create: `web-fullstack-course/02-css/08-transforms-transitions-animation/02-transitions-keyframes-cancelable-state.md`
- Create: `web-fullstack-course/02-css/08-transforms-transitions-animation/03-waapi-scroll-timeline-reduced-motion.md`

- [ ] Explain transform functions, origins, matrices at an intuitive level, containing-block effects and compositing.
- [ ] Explain transition lists, discrete behavior, keyframes, fill/direction, interruption and state-machine ownership.
- [ ] Explain WAAPI, scroll/view timelines, feature detection, cancellation and reduced-motion alternatives.
- [ ] Rewrite the hub and label experimental/limited support accurately.

## 12. Task 11: Modern CSS Components

**Files:**
- Modify: `web-fullstack-course/02-css/09-components-modern-css.md`
- Create: `web-fullstack-course/02-css/09-components-modern-css/01-custom-properties-property-themes.md`
- Create: `web-fullstack-course/02-css/09-components-modern-css/02-layers-nesting-scope.md`
- Create: `web-fullstack-course/02-css/09-components-modern-css/03-forms-scroll-print-forced-colors.md`

- [ ] Explain custom-property substitution, invalid values, inheritance, `@property` and theme contracts.
- [ ] Explain architecture with `@layer`, native nesting, `@scope`, component boundaries and specificity budgets.
- [ ] Explain form control styling, accent, appearance boundaries, scrolling, print and forced-colors support.
- [ ] Rewrite the hub and verify theme and high-contrast states.

## 13. Task 12: CSS Reference

**Files:**
- Modify: `web-fullstack-course/02-css/10-property-reference.md`
- Create: `web-fullstack-course/02-css/10-property-reference/01-stable-properties-module-index.md`
- Create: `web-fullstack-course/02-css/10-property-reference/02-at-rules-functions-descriptors.md`
- Create: `web-fullstack-course/02-css/10-property-reference/03-limited-experimental-fallback-register.md`
- Create: `web-fullstack-course/02-css/CSS-COVERAGE.md`

- [ ] Move the stable property and module index into a searchable detailed lesson while preserving all 476 property entries.
- [ ] Build an at-rule, function, descriptor and syntax reference with purpose, context, example and primary lesson.
- [ ] Separate limited, experimental, deprecated and non-standard features with detection and fallback records.
- [ ] Build `CSS-COVERAGE.md` mapping every required concept and the 476-property audit.
- [ ] Rewrite the hub and verify no property names were lost.

## 14. Task 13: Browser Network, HTTP, and Cache

**Files:**
- Modify: `web-fullstack-course/03-browser/01-network-http-cache.md`
- Create: `web-fullstack-course/03-browser/01-network-http-cache/01-url-dns-connections-tls.md`
- Create: `web-fullstack-course/03-browser/01-network-http-cache/02-http-messages-status-negotiation.md`
- Create: `web-fullstack-course/03-browser/01-network-http-cache/03-cache-validation-cors-observation.md`

- [ ] Explain URL processing, DNS evidence, connection reuse, TLS identity and protocol boundaries.
- [ ] Explain request/response messages, methods, status, headers, content negotiation, compression and body framing.
- [ ] Build conditional-cache and CORS observations with 200/304/failure evidence.
- [ ] Rewrite the hub using the shared `browser-lab` contract.

## 15. Task 14: Rendering and Event Loop

**Files:**
- Modify: `web-fullstack-course/03-browser/02-rendering-event-loop.md`
- Create: `web-fullstack-course/03-browser/02-rendering-event-loop/01-dom-cssom-layout-paint-composite.md`
- Create: `web-fullstack-course/03-browser/02-rendering-event-loop/02-tasks-microtasks-rendering-opportunities.md`
- Create: `web-fullstack-course/03-browser/02-rendering-event-loop/03-long-tasks-layout-thrashing-animation.md`

- [ ] Explain DOM/CSSOM, style, layout, paint, layers and compositing without presenting an obsolete fixed pipeline.
- [ ] Explain tasks, microtasks, animation frames, timers and rendering opportunities with an observable order log.
- [ ] Diagnose long tasks, forced synchronous layout and unstable animation; implement chunking and read/write batching.
- [ ] Rewrite the hub and verify timing assertions in Chromium.

## 16. Task 15: Storage and Security

**Files:**
- Modify: `web-fullstack-course/03-browser/03-storage-security.md`
- Create: `web-fullstack-course/03-browser/03-storage-security/01-memory-web-storage-cross-tab.md`
- Create: `web-fullstack-course/03-browser/03-storage-security/02-indexeddb-transactions-upgrades.md`
- Create: `web-fullstack-course/03-browser/03-storage-security/03-origin-cookie-xss-csrf-authorization.md`

- [ ] Compare memory, sessionStorage and localStorage, serialization, quota, storage events and cross-tab conflicts.
- [ ] Explain IndexedDB requests, transactions, version upgrades, indexes, migration failure and cleanup.
- [ ] Explain origin/site, Cookie attributes, XSS, CSRF, CORS and object authorization using distinct threat models.
- [ ] Rewrite the hub and keep all authentication/authorization boundaries explicit.

## 17. Task 16: Fetch, Streams, and Realtime

**Files:**
- Modify: `web-fullstack-course/03-browser/04-fetch-streams-realtime.md`
- Create: `web-fullstack-course/03-browser/04-fetch-streams-realtime/01-reliable-fetch-timeout-cancel-race.md`
- Create: `web-fullstack-course/03-browser/04-fetch-streams-realtime/02-readable-stream-incremental-parsing.md`
- Create: `web-fullstack-course/03-browser/04-fetch-streams-realtime/03-sse-websocket-polling-recovery.md`

- [ ] Explain Fetch resolution/rejection, HTTP errors, timeout, AbortSignal, stale-response guards and retry boundaries.
- [ ] Explain streams, readers, decoding, framing, backpressure and malformed incremental data.
- [ ] Compare SSE, WebSocket and polling; implement reconnect, duplicate suppression and visible connection state.
- [ ] Rewrite the hub and verify local stream/SSE examples.

## 18. Task 17: Workers, Offline, and Platform APIs

**Files:**
- Modify: `web-fullstack-course/03-browser/05-workers-offline-webapis.md`
- Create: `web-fullstack-course/03-browser/05-workers-offline-webapis/01-web-worker-messaging-transfer-cancel.md`
- Create: `web-fullstack-course/03-browser/05-workers-offline-webapis/02-service-worker-lifecycle-cache.md`
- Create: `web-fullstack-course/03-browser/05-workers-offline-webapis/03-offline-consistency-updates.md`
- Create: `web-fullstack-course/03-browser/05-workers-offline-webapis/04-observers-permissions-api-fallback.md`

- [ ] Explain worker creation, structured clone, transferable objects, message correlation, error and termination.
- [ ] Explain Service Worker registration, install, activate, control, Cache API and navigation fallback.
- [ ] Explain offline data freshness, update activation, versioned caches and destructive-cache mistakes.
- [ ] Cover Intersection/Resize/Mutation observers, Clipboard and permission-aware progressive enhancement.
- [ ] Rewrite the hub and verify page restoration recreates required resources.

## 19. Task 18: DevTools and Performance

**Files:**
- Modify: `web-fullstack-course/03-browser/06-devtools-performance.md`
- Create: `web-fullstack-course/03-browser/06-devtools-performance/01-network-performance-memory-evidence.md`
- Create: `web-fullstack-course/03-browser/06-devtools-performance/02-core-web-vitals-budgets-diagnosis.md`
- Create: `web-fullstack-course/03-browser/BROWSER-COVERAGE.md`

- [ ] Teach Network, Performance, Rendering, Memory, Application, Coverage and Accessibility evidence collection.
- [ ] Teach LCP, CLS, INP, long tasks, resource budgets, before/after measurements and non-causal metric traps.
- [ ] Build `BROWSER-COVERAGE.md` for protocols, rendering, storage, security, networking, workers, APIs and diagnostics.
- [ ] Rewrite the hub and verify reproducible evidence paths.

## 20. Task 19: Batch A Navigation and Verification

**Files:**
- Modify: `web-fullstack-course/00-guide/README.md`
- Modify: `web-fullstack-course/02-css/README.md`
- Modify: `web-fullstack-course/03-browser/README.md`

- [ ] Link all 54 lessons from their hubs and volume READMEs.
- [ ] Verify 6 guide, 30 CSS and 18 browser lesson files.
- [ ] Verify the 13-section contract and code fences.
- [ ] Run relative-link, placeholder and `git diff --check` checks.
- [ ] Extract complete CSS/browser examples to `/tmp/full-course-verification/batch-a/`.
- [ ] Run available HTML/CSS/JavaScript syntax and Chromium behavior checks.
- [ ] Remove temporary files.
- [ ] Commit guide, CSS and browser changes in separate commits.
