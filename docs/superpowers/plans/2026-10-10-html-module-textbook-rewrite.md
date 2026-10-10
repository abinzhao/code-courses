# HTML Module Textbook Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the HTML module into eight chapter hubs, twenty-four detailed tutorials, and one auditable coverage matrix that a zero-background learner can use without oral supplementation.

**Architecture:** Keep the eight existing top-level chapter paths as stable chapter hubs. Add one same-named directory per chapter for detailed tutorials, update the module README to route learners through those tutorials, and use `HTML-COVERAGE.md` to map every required element, attribute, DOM API, default behavior, exercise, and acceptance point to a concrete lesson.

**Tech Stack:** Markdown, HTML Living Standard, browser DOM/Web APIs, inline vanilla JavaScript examples, Python and Node.js one-off verification commands. No `labs/`, package manifest, dependency installation, or standalone source project is added.

---

## 1. Working Rules

- Work only under `web-fullstack-course/01-html/`, except for the final count correction in `web-fullstack-course/README.md`.
- Preserve user-authored wording outside the exact navigation/count lines required by this plan.
- Keep all examples inside Markdown. Temporary extracted files used for verification must live under `/tmp` and be removed after checks.
- Use `apply_patch` for every repository edit.
- Do not add a dependency, lock file, executable course script, or `labs/` directory.
- Keep business prices in integer cents and stored timestamps in UTC ISO 8601.
- Mark static pages, in-memory favorites, and in-memory reservations as teaching states.
- Do not claim that authentication, authorization, payment, persistence, or concurrency control exists in HTML examples.
- Every detailed lesson must contain exactly the thirteen numbered top-level sections defined below, plus `## 任务卡`, `## 我现在能做到什么`, and `## 单元导航`.

## 2. Detailed Lesson Contract

Each detailed lesson uses this top-level heading order:

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

Every lesson must include:

- one minimal observable example;
- one progressive extension;
- one Neighbor Market integration case;
- one explicitly labeled incorrect example;
- one diagnosis and recovery record;
- file location, execution/opening method, expected result, and failure evidence;
- basic, advanced, and fault-injection exercises;
- answers or answer criteria;
- official references and a 2026-10-10 verification date where compatibility claims are made.

## 3. File Map

### Existing files to modify

```text
web-fullstack-course/README.md
web-fullstack-course/01-html/README.md
web-fullstack-course/01-html/01-document-text.md
web-fullstack-course/01-html/02-structure-links-lists.md
web-fullstack-course/01-html/03-images-media-embedding.md
web-fullstack-course/01-html/04-tables-data.md
web-fullstack-course/01-html/05-forms-validation.md
web-fullstack-course/01-html/06-interactive-dom.md
web-fullstack-course/01-html/07-accessibility-seo.md
web-fullstack-course/01-html/08-html-element-reference.md
```

### New files to create

```text
web-fullstack-course/01-html/HTML-COVERAGE.md
web-fullstack-course/01-html/01-document-text/01-parser-document-model.md
web-fullstack-course/01-html/01-document-text/02-head-metadata-resources.md
web-fullstack-course/01-html/01-document-text/03-text-semantics-i18n.md
web-fullstack-course/01-html/02-structure-links-lists/01-landmarks-headings-outline.md
web-fullstack-course/01-html/02-structure-links-lists/02-urls-links-navigation.md
web-fullstack-course/01-html/02-structure-links-lists/03-lists-figures-content-groups.md
web-fullstack-course/01-html/03-images-media-embedding/01-images-responsive-performance.md
web-fullstack-course/01-html/03-images-media-embedding/02-audio-video-tracks.md
web-fullstack-course/01-html/03-images-media-embedding/03-embedding-svg-canvas.md
web-fullstack-course/01-html/04-tables-data/01-table-model-headers-spans.md
web-fullstack-course/01-html/04-tables-data/02-table-accessibility-responsive-dom.md
web-fullstack-course/01-html/05-forms-validation/01-form-submission-successful-controls.md
web-fullstack-course/01-html/05-forms-validation/02-input-types-values.md
web-fullstack-course/01-html/05-forms-validation/03-form-controls-groups.md
web-fullstack-course/01-html/05-forms-validation/04-constraint-validation-files.md
web-fullstack-course/01-html/06-interactive-dom/01-native-interactive-elements.md
web-fullstack-course/01-html/06-interactive-dom/02-dom-query-mutation.md
web-fullstack-course/01-html/06-interactive-dom/03-events-forms-delegation.md
web-fullstack-course/01-html/06-interactive-dom/04-templates-web-components.md
web-fullstack-course/01-html/07-accessibility-seo/01-accessible-name-landmarks-keyboard.md
web-fullstack-course/01-html/07-accessibility-seo/02-dynamic-status-focus-media.md
web-fullstack-course/01-html/07-accessibility-seo/03-metadata-seo-structured-data.md
web-fullstack-course/01-html/08-html-element-reference/01-element-attribute-api-index.md
web-fullstack-course/01-html/08-html-element-reference/02-deprecated-history-migration.md
```

## 4. Reusable Verification Commands

### Verify one detailed lesson

Replace only the `lesson` path before running:

```bash
python3 - <<'PY'
from pathlib import Path
import re

lesson = Path("web-fullstack-course/01-html/01-document-text/01-parser-document-model.md")
text = lesson.read_text()
visible = re.sub(r"```.*?```", "", text, flags=re.S)
expected = [str(index) for index in range(1, 14)]
actual = re.findall(r"^## ([0-9]+)\.", visible, flags=re.M)
assert actual == expected, (lesson, actual)
for heading in (
    "## 任务卡",
    "## 我现在能做到什么",
    "## 单元导航",
):
    assert heading in visible, (lesson, heading)
assert text.count("```") % 2 == 0, lesson
assert not re.search(
    r"\b(?:TO[D]O|TB[D]|FIX[M]E|WI[P])\b|待完[善]|自行补[充]|占位[符]",
    visible,
    flags=re.I,
), lesson
print(f"{lesson}: structure PASS")
PY
```

Expected: one `structure PASS` line and exit status `0`.

### Verify relative Markdown links

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/01-html")
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
print("HTML Markdown links: PASS")
PY
```

Expected: `HTML Markdown links: PASS`.

### Verify all detailed lesson headings and file count

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/01-html")
lessons = sorted(path for path in root.glob("*/*.md"))
assert len(lessons) == 24, len(lessons)
expected = [str(index) for index in range(1, 14)]
for lesson in lessons:
    visible = re.sub(r"```.*?```", "", lesson.read_text(), flags=re.S)
    actual = re.findall(r"^## ([0-9]+)\.", visible, flags=re.M)
    assert actual == expected, (lesson, actual)
print("24 detailed HTML lessons: PASS")
PY
```

Expected: `24 detailed HTML lessons: PASS`.

## 5. Batch A: Documents, Structure, Links, and Lists

### Task 1: Establish the module route and coverage contract

**Files:**
- Create: `web-fullstack-course/01-html/HTML-COVERAGE.md`
- Modify: `web-fullstack-course/01-html/README.md`

- [ ] **Step 1: Record the current baseline**

Run:

```bash
find web-fullstack-course/01-html -type f -name '*.md' | sort
wc -l web-fullstack-course/01-html/*.md
```

Expected: nine current Markdown files and no detailed lesson subdirectories.

- [ ] **Step 2: Write the complete coverage matrix structure**

Create `HTML-COVERAGE.md` with these sections and stable ID prefixes:

```text
DOC: parsing, document root, metadata, resource loading
TXT: text semantics, time, internationalization, edits
STR: landmarks, headings, content groups
LNK: URLs, links, navigation, safe targets
LST: unordered, ordered, menu, description lists
MED: images, responsive sources, media, tracks, embedding
TBL: table model, headers, spans, DOM interfaces
FRM: submission, input types, controls, validation, files
DOM: queries, mutation, attributes, classes, datasets
EVT: events, propagation, delegation, forms
INT: details, dialog, popover, templates, components
A11Y: names, descriptions, keyboard, focus, status, alternatives
SEO: metadata, status, crawling, structured data
HIS: deprecated elements, deprecated attributes, replacements
```

Use columns:

```text
ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收
```

Populate every required knowledge point with its final lesson path. Use `是` only when the planned lesson contract explicitly includes that dimension; do not use vague status words.

- [ ] **Step 3: Rewrite the module README route**

Update `01-html/README.md` to:

- explain the eight chapter hubs and twenty-four detailed lessons;
- route learners to the first detailed lesson, not only the chapter hub;
- explain chapter hub versus detailed lesson responsibilities;
- retain current resource ownership, integer-cent, UTC, and in-memory-state boundaries;
- link `HTML-COVERAGE.md`;
- include the HTML stage progression and final acceptance evidence.

- [ ] **Step 4: Verify only the two edited files**

Run:

```bash
git diff --check -- \
  web-fullstack-course/01-html/README.md \
  web-fullstack-course/01-html/HTML-COVERAGE.md
```

Expected: no output and exit status `0`.

### Task 2: Write parsing and document-model tutorial

**Files:**
- Create: `web-fullstack-course/01-html/01-document-text/01-parser-document-model.md`

- [ ] **Step 1: Write task, outcomes, and prerequisite sections**

Use the task “repair a product page whose source and DOM differ.” Define observable outcomes for tags, elements, attributes, document root, parsing recovery, and DOM inspection.

- [ ] **Step 2: Write the full theory sequence**

Use these theory subsections:

```text
HTML source, tokens, nodes, DOM
doctype and standards mode
html, head, body and parser-created nodes
start tags, end tags, void elements and nesting
attributes, quoted values and boolean presence
character references, comments and whitespace collapse
content categories and allowed parent/child relationships
browser error recovery and why visible output is insufficient
```

- [ ] **Step 3: Add complete cases**

Include:

- a complete product description document;
- a source-versus-DOM observation with DevTools;
- incorrect `p` nesting and parser recovery;
- `disabled="false"` as a boolean-attribute counterexample;
- a recovery record using source view and Elements.

- [ ] **Step 4: Complete the remaining lesson contract**

Add API table, Neighbor Market integration, diagnosis table, questions with answer reasoning, three exercises, acceptance checklist, FAQ, official HTML parsing references, summary, and links to the chapter hub and next lesson.

- [ ] **Step 5: Run the one-lesson verification command**

Use the reusable one-lesson command with:

```text
web-fullstack-course/01-html/01-document-text/01-parser-document-model.md
```

Expected: structure PASS.

### Task 3: Write head metadata and resource-loading tutorial

**Files:**
- Create: `web-fullstack-course/01-html/01-document-text/02-head-metadata-resources.md`

- [ ] **Step 1: Write the task and learning model**

Use the task “make the product page identifiable, correctly encoded, mobile-readable, and explicit about resource loading.”

- [ ] **Step 2: Explain every required mechanism**

Use these theory subsections:

```text
head versus visual header
title and visible h1
meta charset, viewport, description and robots boundaries
base URL resolution and document-wide side effects
link relationships: stylesheet, icon, preload, canonical
style scope and cascade handoff
classic script, defer, async and module ordering
noscript behavior in head and body
HTTP headers versus http-equiv limits
```

- [ ] **Step 3: Add progressive examples**

Include:

- a complete head for a Neighbor Market listing;
- an observable script-order example;
- a broken encoding diagnosis;
- a `base` element link-target failure and recovery;
- a preload mismatch counterexample.

- [ ] **Step 4: Add exercises and acceptance**

Require learners to predict script order, inspect Network initiators, compare title with h1, and explain which security behavior cannot be provided by metadata alone.

- [ ] **Step 5: Verify structure and commit Chapter 1 only after Task 4**

Run the one-lesson check with this lesson path. Do not commit yet.

### Task 4: Write text semantics and internationalization tutorial

**Files:**
- Create: `web-fullstack-course/01-html/01-document-text/03-text-semantics-i18n.md`

- [ ] **Step 1: Write the task and theory**

Use the task “turn an unstructured seller message into meaningful product copy.” Cover:

```text
h1-h6, p, br and hr
strong, em, b, i, mark, small and s
q, blockquote and cite
abbr, dfn, code, kbd, samp and var
time and data machine values
del and ins change records
sub, sup, span and u
lang, dir, bdi, bdo, ruby, rt, rp and wbr
```

- [ ] **Step 2: Add contrast cases**

Compare:

- heading versus bold text;
- important content versus visual bold;
- invalid old price versus editorial deletion;
- line break versus paragraph;
- UTC machine time versus localized visible text;
- unknown-direction username with and without `bdi`.

- [ ] **Step 3: Add a complete integration case**

Build one full product-description document containing price in integer cents, UTC time, safety warning, model code, quoted rule, seller name direction isolation, and revision history.

- [ ] **Step 4: Add exercises, answers, and acceptance**

Require an independent second product, a semantic-choice explanation, one parser/DOM inspection, and one internationalization check.

- [ ] **Step 5: Verify all Chapter 1 lessons**

Run:

```bash
for file in web-fullstack-course/01-html/01-document-text/*.md; do
  rg -q '^## 13\. 扩展阅读$' "$file" || exit 1
  rg -q '^## 单元导航$' "$file" || exit 1
done
git diff --check -- web-fullstack-course/01-html/01-document-text
```

Expected: no output and exit status `0`.

### Task 5: Rewrite Chapter 1 hub and commit

**Files:**
- Modify: `web-fullstack-course/01-html/01-document-text.md`
- Modify: `web-fullstack-course/01-html/HTML-COVERAGE.md`

- [ ] **Step 1: Replace overview theory with chapter routing**

Write:

- chapter task and stage outcome;
- three-lesson learning order;
- dependency map;
- expected study time;
- one chapter capstone using the three lessons;
- chapter-level acceptance and navigation.

Do not repeat detailed theory from the lesson files.

- [ ] **Step 2: Complete DOC and TXT coverage rows**

Verify each DOC/TXT row links to one of the three lesson files and marks all required dimensions as present only when the content exists.

- [ ] **Step 3: Run links and chapter verification**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
for path in (
    Path("web-fullstack-course/01-html/01-document-text.md"),
    Path("web-fullstack-course/01-html/01-document-text/01-parser-document-model.md"),
    Path("web-fullstack-course/01-html/01-document-text/02-head-metadata-resources.md"),
    Path("web-fullstack-course/01-html/01-document-text/03-text-semantics-i18n.md"),
):
    assert path.exists(), path
print("Chapter 1 files: PASS")
PY
```

Then run the reusable Markdown link checker.

- [ ] **Step 4: Commit Chapter 1**

```bash
git add \
  web-fullstack-course/01-html/README.md \
  web-fullstack-course/01-html/HTML-COVERAGE.md \
  web-fullstack-course/01-html/01-document-text.md \
  web-fullstack-course/01-html/01-document-text
git commit -m "docs: expand HTML document and text tutorials"
```

### Task 6: Write landmarks, headings, and outline tutorial

**Files:**
- Create: `web-fullstack-course/01-html/02-structure-links-lists/01-landmarks-headings-outline.md`

- [ ] **Step 1: Write theory in browser-reading order**

Cover:

```text
header, nav, main, article, section, aside, footer, address and search
page-level versus article-level header/footer
h1-h6 and explicit heading hierarchy
hgroup and supporting text
landmarks and screen-reader navigation
one visible main and repeated landmark names
section versus div decision
DOM order versus visual placement
```

- [ ] **Step 2: Add structure cases**

Include a complete listing page, a landmark map, duplicate unlabeled navigation as an error, skipped heading levels as a reasoning case, and a no-CSS reading-order test.

- [ ] **Step 3: Complete exercises and acceptance**

Require learners to transform a div-only page, navigate by headings/landmarks, and explain article independence.

- [ ] **Step 4: Run the one-lesson structure check**

Use this lesson path and expect structure PASS.

### Task 7: Write URLs, links, and navigation tutorial

**Files:**
- Create: `web-fullstack-course/01-html/02-structure-links-lists/02-urls-links-navigation.md`

- [ ] **Step 1: Write complete URL theory**

Cover:

```text
scheme, host, port, path, query and fragment
document base URL
relative, root-relative and absolute resolution
same-document and cross-document fragments
mailto and tel
a href, target, rel, download, hreflang, type and referrerpolicy
link versus button
noopener, noreferrer and untrusted URL schemes
```

- [ ] **Step 2: Add observable navigation cases**

Create a two-page product/help example, a URL resolution table, a broken fragment diagnosis, a `file:` root-relative trap, and a safe new-tab example.

- [ ] **Step 3: Add exercises and acceptance**

Require back/forward navigation, keyboard activation, target prediction, and one unsafe-link correction.

- [ ] **Step 4: Verify the lesson**

Run the one-lesson command with this path.

### Task 8: Write lists, figures, and content-groups tutorial

**Files:**
- Create: `web-fullstack-course/01-html/02-structure-links-lists/03-lists-figures-content-groups.md`

- [ ] **Step 1: Explain each relationship**

Cover:

```text
ul, ol, li and menu
start, reversed, type and li value
nested lists and valid parent/child structure
dl, dt, dd and grouped name/value pairs
div as a neutral container
figure and figcaption
blockquote, pre and hr as content groups
when lists, descriptions, tables and sections differ
```

- [ ] **Step 2: Add complete cases**

Build product features, ordered handoff steps, status definitions, a quoted community rule, and a code figure. Include an invalid nested-list example and recovery.

- [ ] **Step 3: Add transfer exercises**

Require a learner to model a new product, choose between `dl` and table, and explain why visual bullets do not create list semantics.

- [ ] **Step 4: Verify Chapter 2 lesson files**

Run heading and diff checks for all three files.

### Task 9: Rewrite Chapter 2 hub, validate Batch A, and commit

**Files:**
- Modify: `web-fullstack-course/01-html/02-structure-links-lists.md`
- Modify: `web-fullstack-course/01-html/HTML-COVERAGE.md`

- [ ] **Step 1: Rewrite the hub**

Add the three-lesson route, dependency map, study time, navigable-product capstone, chapter exercises, and chapter acceptance.

- [ ] **Step 2: Complete STR, LNK, and LST coverage rows**

Every row must link to an existing heading or lesson and indicate theory, cases, diagnosis, practice, and acceptance.

- [ ] **Step 3: Run Batch A verification**

Run:

```bash
find web-fullstack-course/01-html/01-document-text \
     web-fullstack-course/01-html/02-structure-links-lists \
     -type f -name '*.md' | wc -l
```

Expected: `6`.

Run the reusable link checker and:

```bash
git diff --check -- web-fullstack-course/01-html
```

Expected: no diff errors.

- [ ] **Step 4: Commit Chapter 2 and Batch A coverage**

```bash
git add \
  web-fullstack-course/01-html/02-structure-links-lists.md \
  web-fullstack-course/01-html/02-structure-links-lists \
  web-fullstack-course/01-html/HTML-COVERAGE.md
git commit -m "docs: expand HTML structure and navigation tutorials"
```

## 6. Batch B: Media, Tables, and Forms

### Task 10: Write responsive images and performance tutorial

**Files:**
- Create: `web-fullstack-course/01-html/03-images-media-embedding/01-images-responsive-performance.md`

- [ ] Write theory for `img`, `picture`, image `source`, `alt`, intrinsic dimensions, `srcset`, `sizes`, `loading`, `decoding`, `fetchpriority`, CORS, referrer policy, `complete`, `naturalWidth`, `currentSrc`, and `decode()`.
- [ ] Add a self-contained SVG data URL example, a real-resource exercise contract, decorative/informative alt contrasts, a layout-shift case, and a failed decode diagnosis.
- [ ] Add Neighbor Market responsive product-photo integration, three exercises, answers, acceptance, FAQ, and official references.
- [ ] Run the one-lesson verification command.

### Task 11: Write audio, video, and tracks tutorial

**Files:**
- Create: `web-fullstack-course/01-html/03-images-media-embedding/02-audio-video-tracks.md`

- [ ] Explain `audio`, `video`, media `source`, `track`, controls, preload, autoplay policy, muted, poster, playsinline, loop, media states, `play()` Promise, `pause()`, `load()`, and relevant events.
- [ ] Include a generated short WAV example, an explicit external-video exercise contract, valid WebVTT content, captions versus subtitles versus descriptions, and rejected playback recovery.
- [ ] Add project integration for a product inspection clip without claiming that media files are bundled.
- [ ] Verify the lesson structure and code fences.

### Task 12: Write embedding, image maps, SVG, and Canvas tutorial

**Files:**
- Create: `web-fullstack-course/01-html/03-images-media-embedding/03-embedding-svg-canvas.md`

- [ ] Explain `iframe`, `srcdoc`, `sandbox`, `allow`, lazy loading, frame denial, same-origin limits, `object`, `embed`, fallback links, `map`, `area`, inline/external SVG, Canvas dimensions, pixel density, and tainted canvases.
- [ ] Add a sandboxed rules card, a keyboard-accessible map alternative, inline SVG product diagram, Canvas price chart plus text/table alternative, and a cross-origin failure analysis.
- [ ] Add exercises that require choosing between image, SVG, Canvas, iframe, object, and ordinary links.
- [ ] Verify the lesson.

### Task 13: Rewrite Chapter 3 hub and commit

**Files:**
- Modify: `web-fullstack-course/01-html/03-images-media-embedding.md`
- Modify: `web-fullstack-course/01-html/HTML-COVERAGE.md`

- [ ] Route the three lessons and define the media inspection capstone.
- [ ] Complete MED coverage rows with theory, performance, accessibility, security, and diagnosis evidence.
- [ ] Run links, heading checks, and `git diff --check`.
- [ ] Commit:

```bash
git add \
  web-fullstack-course/01-html/03-images-media-embedding.md \
  web-fullstack-course/01-html/03-images-media-embedding \
  web-fullstack-course/01-html/HTML-COVERAGE.md
git commit -m "docs: expand HTML media and embedding tutorials"
```

### Task 14: Write table model, headers, and spans tutorial

**Files:**
- Create: `web-fullstack-course/01-html/04-tables-data/01-table-model-headers-spans.md`

- [ ] Explain when data is two-dimensional and when `dl`, lists, or cards are better.
- [ ] Cover `table`, `caption`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `scope`, `headers`, unique header IDs, `colspan`, `rowspan`, `colgroup`, and `col`.
- [ ] Add simple and multi-level product comparison tables, a grid-position walkthrough, an incorrect layout-table case, and a broken `headers` diagnosis.
- [ ] Add exercises, answers, acceptance, and run lesson verification.

### Task 15: Write table accessibility, responsiveness, and DOM tutorial

**Files:**
- Create: `web-fullstack-course/01-html/04-tables-data/02-table-accessibility-responsive-dom.md`

- [ ] Explain horizontal-scroll containers, keyboard access, long content, print, `table-layout`, table display overrides, and preserving header relationships.
- [ ] Cover `HTMLTableElement`, caption/head/body/foot references, rows/cells collections, `insertRow`, `deleteRow`, `insertCell`, and safe DOM generation using `textContent`.
- [ ] Add a complete in-memory listing table with integer-cent totals, empty state, assertions, and failure-first diagnosis.
- [ ] Add keyboard and screen-reader manual checks, exercises, and acceptance.
- [ ] Verify lesson structure and JavaScript syntax.

### Task 16: Rewrite Chapter 4 hub and commit

**Files:**
- Modify: `web-fullstack-course/01-html/04-tables-data.md`
- Modify: `web-fullstack-course/01-html/HTML-COVERAGE.md`

- [ ] Route both table lessons and define the product-comparison capstone.
- [ ] Complete TBL coverage rows.
- [ ] Run links, headings, duplicate-ID checks on complete examples, and diff check.
- [ ] Commit:

```bash
git add \
  web-fullstack-course/01-html/04-tables-data.md \
  web-fullstack-course/01-html/04-tables-data \
  web-fullstack-course/01-html/HTML-COVERAGE.md
git commit -m "docs: expand HTML table tutorials"
```

### Task 17: Write form submission and successful-controls tutorial

**Files:**
- Create: `web-fullstack-course/01-html/05-forms-validation/01-form-submission-successful-controls.md`

- [ ] Explain `form` action, method, enctype, target, accept-charset, autocomplete, novalidate, `name`, `value`, submitter data, successful controls, GET/POST boundaries, disabled controls, unchecked boxes, and same-name values.
- [ ] Add a query form, a no-network intercepted publish form, `FormData` and `URLSearchParams` inspection, `getAll`, and `requestSubmit` versus `submit`.
- [ ] Add a missing-name failure and a disabled-field omission diagnosis.
- [ ] Add exercises, acceptance, and verify.

### Task 18: Write all input types and value-state tutorial

**Files:**
- Create: `web-fullstack-course/01-html/05-forms-validation/02-input-types-values.md`

- [ ] Teach the 22 current input types in related groups, not only in one reference table.
- [ ] Explain current versus default value, `checked` versus `defaultChecked`, `valueAsNumber`, date/time machine formats, hidden-field trust boundaries, file input limits, and button type behavior.
- [ ] Include one observable mini-case per group, a full type gallery, fallback behavior for unknown types, and a numeric-versus-identifier choice exercise.
- [ ] Add answers, acceptance, and verify.

### Task 19: Write form controls and grouping tutorial

**Files:**
- Create: `web-fullstack-course/01-html/05-forms-validation/03-form-controls-groups.md`

- [ ] Explain `label`, `textarea`, `select`, `option`, `optgroup`, `button`, `fieldset`, `legend`, `datalist`, `output`, `progress`, and `meter`.
- [ ] Cover `for`, `form`, `selected`, `multiple`, `size`, `disabled`, `readonly`, initial/current values, and selection APIs.
- [ ] Add a categorized listing form, multi-select observation, fieldset-disabled exception, output calculation, and progress-versus-meter contrast.
- [ ] Add exercises, acceptance, and verify.

### Task 20: Write constraints, validation, and files tutorial

**Files:**
- Create: `web-fullstack-course/01-html/05-forms-validation/04-constraint-validation-files.md`

- [ ] Explain `required`, `pattern`, `min`, `max`, `step`, `minlength`, `maxlength`, `accept`, `multiple`, and all relevant `ValidityState` members.
- [ ] Cover `checkValidity`, `reportValidity`, `setCustomValidity`, invalid event capture, browser messages, custom visible errors, file type/size checks, and server-side validation boundaries.
- [ ] Add a complete publish-preview form, first-invalid-field recovery, stale custom-error failure, and file-filter bypass analysis.
- [ ] Add exercises, acceptance, and verify complete example syntax.

### Task 21: Rewrite Chapter 5 hub, validate Batch B, and commit

**Files:**
- Modify: `web-fullstack-course/01-html/05-forms-validation.md`
- Modify: `web-fullstack-course/01-html/HTML-COVERAGE.md`

- [ ] Route all four form lessons and define the publish-form capstone.
- [ ] Complete FRM coverage rows, including every required attribute and current input type.
- [ ] Run:

```bash
find web-fullstack-course/01-html/03-images-media-embedding \
     web-fullstack-course/01-html/04-tables-data \
     web-fullstack-course/01-html/05-forms-validation \
     -type f -name '*.md' | wc -l
```

Expected: `9`.

- [ ] Run link, heading, fence, and diff checks.
- [ ] Commit:

```bash
git add \
  web-fullstack-course/01-html/05-forms-validation.md \
  web-fullstack-course/01-html/05-forms-validation \
  web-fullstack-course/01-html/HTML-COVERAGE.md
git commit -m "docs: expand HTML form and validation tutorials"
```

## 7. Batch C: Interaction, Accessibility, SEO, and Reference

### Task 22: Write native interactive-elements tutorial

**Files:**
- Create: `web-fullstack-course/01-html/06-interactive-dom/01-native-interactive-elements.md`

- [ ] Explain `details`, `summary`, open state, toggle event, named groups, `dialog`, show/showModal/close, cancel/close, method=dialog, popover modes, invoker attributes, top layer, modality, focus, and feature detection.
- [ ] Add rules disclosure, reservation dialog, price-help popover, unsupported-feature fallback, and focus recovery cases.
- [ ] Add misuse contrasts for CSS-visible dialog and popover-as-modal.
- [ ] Complete exercises and verify.

### Task 23: Write DOM query and mutation tutorial

**Files:**
- Create: `web-fullstack-course/01-html/06-interactive-dom/02-dom-query-mutation.md`

- [ ] Cover `getElementById`, `querySelector`, `querySelectorAll`, static and live collections, node versus element traversal, create/append/prepend/before/after/remove/replaceChildren, `classList`, `dataset`, attributes, properties, and `textContent` versus `innerHTML`.
- [ ] Add product-card creation, safe user-text insertion, moving an existing node, class/state synchronization, and null-selection diagnosis.
- [ ] Add exercises and verify JavaScript syntax.

### Task 24: Write events, forms, and delegation tutorial

**Files:**
- Create: `web-fullstack-course/01-html/06-interactive-dom/03-events-forms-delegation.md`

- [ ] Explain event registration/removal, AbortSignal cleanup, capture/target/bubble, target/currentTarget, closest/matches, default action, propagation, passive listeners, click/input/change/submit/invalid/toggle/close, and event delegation.
- [ ] Add a dynamic listing collection with delegated favorite buttons, form submission handling, link-versus-button default behavior, nested-target failure, and listener cleanup.
- [ ] Add propagation prediction exercises, acceptance, and verify.

### Task 25: Write templates and Web Components tutorial

**Files:**
- Create: `web-fullstack-course/01-html/06-interactive-dom/04-templates-web-components.md`

- [ ] Explain `template`, `.content`, DocumentFragment, cloning, listener behavior, autonomous custom elements, lifecycle callbacks, observed attributes, Shadow DOM, slots, fallback content, assigned elements, and slotchange.
- [ ] Add a listing template, a `market-note` component, a slotted title, reconnect-safe initialization, and duplicate-registration diagnosis.
- [ ] Explain encapsulation versus security and compatibility boundaries.
- [ ] Add exercises, acceptance, and verify.

### Task 26: Rewrite Chapter 6 hub and commit

**Files:**
- Modify: `web-fullstack-course/01-html/06-interactive-dom.md`
- Modify: `web-fullstack-course/01-html/HTML-COVERAGE.md`

- [ ] Route all four lessons and define the in-memory favorite/reservation capstone.
- [ ] Complete DOM, EVT, and INT coverage rows.
- [ ] Run links, headings, JavaScript syntax, and diff checks.
- [ ] Commit:

```bash
git add \
  web-fullstack-course/01-html/06-interactive-dom.md \
  web-fullstack-course/01-html/06-interactive-dom \
  web-fullstack-course/01-html/HTML-COVERAGE.md
git commit -m "docs: expand HTML DOM and interaction tutorials"
```

### Task 27: Write accessible names, landmarks, and keyboard tutorial

**Files:**
- Create: `web-fullstack-course/01-html/07-accessibility-seo/01-accessible-name-landmarks-keyboard.md`

- [ ] Explain semantic roles, landmarks, headings, accessible name sources, descriptions, states, visible-label consistency, native controls, keyboard activation, focus order, focus visibility, skip links, and ARIA boundaries.
- [ ] Add an accessibility-tree inspection, conflicting aria-label failure, div-button replacement, duplicate landmark naming, and keyboard-only listing path.
- [ ] Add manual checks, exercises, acceptance, and references.

### Task 28: Write dynamic status, focus, and media alternatives tutorial

**Files:**
- Create: `web-fullstack-course/01-html/07-accessibility-seo/02-dynamic-status-focus-media.md`

- [ ] Explain status/alert/live regions, aria-busy, form-error summaries, first-invalid focus, dialog focus restoration, dynamic lists, image alternatives, captions, audio description, chart/table alternatives, zoom, touch target, color-only state, and reduced motion boundaries.
- [ ] Add search results, favorite status, failed form, media alternative, and Canvas text/table alternative cases.
- [ ] Add fast-update announcement limitations and manual screen-reader scope notes.
- [ ] Add exercises, acceptance, and verify.

### Task 29: Write metadata, SEO, and structured-data tutorial

**Files:**
- Create: `web-fullstack-course/01-html/07-accessibility-seo/03-metadata-seo-structured-data.md`

- [ ] Explain title, description, canonical, robots, robots.txt boundary, sitemap, valid links, HTTP status, crawl versus index, client rendering boundary, Microdata, JSON-LD, visible-content consistency, and fabricated-review risk.
- [ ] Add a real listing metadata case, noindex teaching page, incorrect 200-for-not-found analysis, canonical misconception, and matching structured-data example.
- [ ] Add exercises, acceptance, and official search-engine/HTML references.
- [ ] Verify JSON syntax and Markdown structure.

### Task 30: Rewrite Chapter 7 hub and commit

**Files:**
- Modify: `web-fullstack-course/01-html/07-accessibility-seo.md`
- Modify: `web-fullstack-course/01-html/HTML-COVERAGE.md`

- [ ] Route the three lessons and define a keyboard-accessible searchable listing capstone.
- [ ] Complete A11Y and SEO coverage rows.
- [ ] Run links, headings, JSON syntax, and diff checks.
- [ ] Commit:

```bash
git add \
  web-fullstack-course/01-html/07-accessibility-seo.md \
  web-fullstack-course/01-html/07-accessibility-seo \
  web-fullstack-course/01-html/HTML-COVERAGE.md
git commit -m "docs: expand HTML accessibility and SEO tutorials"
```

### Task 31: Write element, attribute, and API index tutorial

**Files:**
- Create: `web-fullstack-course/01-html/08-html-element-reference/01-element-attribute-api-index.md`

- [ ] Build a searchable index by responsibility, not alphabet alone.
- [ ] For each current element group, list purpose, allowed context, key attributes, DOM interface/default behavior, primary tutorial, minimum example, and compatibility note.
- [ ] Include global attributes, ARIA boundary notes, SVG/MathML root entries, and custom-element scope.
- [ ] Add “choose the right element” cases, lookup exercises, acceptance, and references.
- [ ] Verify that all current element names from the existing reference remain represented.

### Task 32: Write deprecated history and migration tutorial

**Files:**
- Create: `web-fullstack-course/01-html/08-html-element-reference/02-deprecated-history-migration.md`

- [ ] Explain why browsers retain obsolete parsing behavior and why that does not make old markup suitable.
- [ ] Cover obsolete/non-standard elements and attributes by historical purpose: presentation, frames, plugins, scrolling text, document metadata, alignment, colors, and event patterns.
- [ ] For each category, show old code, current replacement, migration steps, visible regression risk, and verification.
- [ ] Include `font`, `center`, `big`, `tt`, `strike`, `frameset`, `frame`, `noframes`, `marquee`, `blink`, `applet`, `acronym`, `align`, `bgcolor`, `border`, `cellpadding`, `cellspacing`, and `language`.
- [ ] Add a legacy product-page migration case, exercises, acceptance, and references.

### Task 33: Rewrite Chapter 8 hub and complete coverage

**Files:**
- Modify: `web-fullstack-course/01-html/08-html-element-reference.md`
- Modify: `web-fullstack-course/01-html/HTML-COVERAGE.md`

- [ ] Route both reference tutorials and explain reference-versus-teaching responsibilities.
- [ ] Add the HTML stage audit task and deprecated-page migration acceptance.
- [ ] Complete HIS rows and audit every matrix row for existing lesson targets and all `是` dimensions.
- [ ] Run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

coverage = Path("web-fullstack-course/01-html/HTML-COVERAGE.md").read_text()
prefixes = ("DOC", "TXT", "STR", "LNK", "LST", "MED", "TBL", "FRM", "DOM", "EVT", "INT", "A11Y", "SEO", "HIS")
for prefix in prefixes:
    assert re.search(rf"\|\s*{prefix}-[0-9]+", coverage), prefix
assert ("待" + "完善") not in coverage
print("Coverage prefixes: PASS")
PY
```

Expected: `Coverage prefixes: PASS`.

### Task 34: Validate Batch C and commit Chapter 8

**Files:**
- Verify all Chapter 6-8 files

- [ ] Run:

```bash
find web-fullstack-course/01-html/06-interactive-dom \
     web-fullstack-course/01-html/07-accessibility-seo \
     web-fullstack-course/01-html/08-html-element-reference \
     -type f -name '*.md' | wc -l
```

Expected: `9`.

- [ ] Run all reusable lesson-count, heading, link, and diff checks.
- [ ] Commit:

```bash
git add \
  web-fullstack-course/01-html/08-html-element-reference.md \
  web-fullstack-course/01-html/08-html-element-reference \
  web-fullstack-course/01-html/HTML-COVERAGE.md
git commit -m "docs: expand HTML reference and migration tutorials"
```

## 8. Final Module Verification

### Task 35: Run static course verification

**Files:**
- Verify: `web-fullstack-course/01-html/**/*.md`

- [ ] **Step 1: Verify all expected files**

Run:

```bash
find web-fullstack-course/01-html -type f -name '*.md' | wc -l
```

Expected: `34` Markdown files, consisting of one module README, eight hubs, twenty-four detailed lessons, and one coverage matrix.

- [ ] **Step 2: Verify lesson structure**

Run the reusable 24-lesson heading and file-count command.

- [ ] **Step 3: Verify links and placeholders**

Run the reusable link checker, then:

```bash
rg -n '\b(TO[D]O|TB[D]|FIX[M]E|WI[P])\b|待完[善]|自行补[充]|占位[符]' \
  web-fullstack-course/01-html || true
```

Expected: no output.

- [ ] **Step 4: Verify scope**

Run:

```bash
find web-fullstack-course -type d -name labs -print
find web-fullstack-course -type f \
  \( -name package.json -o -name pnpm-lock.yaml -o -name yarn.lock \) \
  -print
```

Expected: no paths created by this rewrite.

- [ ] **Step 5: Verify whitespace and final diff**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; status lists only intended documentation changes.

### Task 36: Verify complete examples outside the repository

**Files:**
- Read complete HTML, JSON, WebVTT, and JavaScript examples from all detailed lessons
- Create only temporary files under `/tmp/html-course-verification/`

- [ ] Extract every code block explicitly labeled as a complete file into `/tmp/html-course-verification/`.
- [ ] Parse complete HTML with Python `HTMLParser`; check balanced authored tags where applicable, unique IDs, and existing same-document fragment targets.
- [ ] Parse every complete JSON example with `JSON.parse` or Python `json.loads`.
- [ ] Run `node --check` on standalone JavaScript examples.
- [ ] Run pure in-memory assertions for integer-cent totals, status labels, form extraction, delegated favorite state, and generated table row counts.
- [ ] Remove `/tmp/html-course-verification/` after verification.
- [ ] Record browser-only, media-resource, screen-reader, Safari, Firefox, and experimental-feature checks as explicit manual scope in the module README or validation section.

### Task 37: Perform browser and keyboard smoke test

**Files:**
- Use temporary extracted examples only

- [ ] Open representative examples from Chapters 1, 2, 3, 5, 6, and 7 in a modern Chromium browser.
- [ ] Check DOM repair, Network resource selection, form validation, dialog/popover behavior, event delegation, keyboard focus, live status, and accessibility names.
- [ ] Test all primary paths using keyboard only.
- [ ] Verify that no example claims server persistence or authorization.
- [ ] Record untested screen-reader/browser combinations instead of claiming universal compatibility.

### Task 38: Reconcile module and book navigation

**Files:**
- Modify: `web-fullstack-course/01-html/README.md`
- Modify: `web-fullstack-course/README.md`
- Verify: `web-fullstack-course/00-guide/06-coverage-map.md`

- [ ] Ensure the HTML README routes to all eight hubs, all twenty-four lessons, the coverage matrix, and the HTML stage acceptance.
- [ ] Check the global coverage map links still resolve; change only HTML paths that actually moved or gained detailed routes.
- [ ] Recalculate the root book document count using the same classification currently used by the root README. If the current 81 count excludes README/validation files, add twenty-four learning files plus one reference matrix and update the statement to 106; otherwise document and use the measured classification result.
- [ ] Preserve all other user-authored root README wording.
- [ ] Run the repository-wide relative-link check for Markdown files.

### Task 39: Final audit and commit

**Files:**
- Review all files changed by Tasks 1-38

- [ ] Compare every design requirement against a task and against the resulting files.
- [ ] Randomly sample at least one matrix row from every ID prefix and navigate to theory, example, error, exercise, and acceptance.
- [ ] Review `git diff --stat`, `git diff --check`, and `git status --short`.
- [ ] Confirm no unrelated course module was reformatted or rewritten.
- [ ] Commit final navigation and validation corrections:

```bash
git add \
  web-fullstack-course/README.md \
  web-fullstack-course/01-html \
  web-fullstack-course/00-guide/06-coverage-map.md
git commit -m "docs: complete detailed HTML course rewrite"
```

## 9. Completion Evidence

Before reporting completion, retain these command results:

```text
34 HTML-module Markdown files
24 detailed lessons with all 13 numbered sections
0 broken relative links
0 unfinished markers
0 whitespace errors
0 labs/package/lock files added
complete HTML/JSON/JavaScript static checks passing
representative Chromium and keyboard paths recorded
manual screen-reader and cross-browser gaps explicitly listed
```
