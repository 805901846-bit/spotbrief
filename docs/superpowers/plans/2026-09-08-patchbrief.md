# PatchBrief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a deployable, framework-free Bookmarklet and GitHub Pages installer that turns visually selected webpage elements into a privacy-preserving Frontend Change Brief.

**Architecture:** Focused TypeScript modules implement extraction and runtime behavior, while a Shadow DOM panel and fixed overlays isolate UI from host pages. esbuild emits one self-contained IIFE; Node scripts encode it into versioned payloads and assemble a static Pages artifact. Vitest covers deterministic logic and Playwright drives the production bundle against local fixtures.

**Tech Stack:** TypeScript, native DOM APIs, Shadow DOM, CSS, esbuild, Vitest/jsdom, Playwright, Node.js, GitHub Actions, GitHub Pages.

---

## File map

- `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`: toolchain and reproducible commands.
- `src/bookmarklet/types.ts`, `state.ts`, `selection.ts`: shared models, in-memory store, WeakMap identity, history.
- `src/bookmarklet/selector.ts`, `sanitizer.ts`, `context.ts`, `target-resolver.ts`: privacy-safe element extraction.
- `src/bookmarklet/prompt.ts`, `i18n.ts`, `storage.ts`, `clipboard.ts`, `screenshot.ts`: output and browser capability adapters.
- `src/bookmarklet/overlay.ts`, `inspector.ts`, `shortcuts.ts`, `destroy.ts`, `index.ts`: injected runtime and lifecycle.
- `src/panel/panel.ts`, `render.ts`, `events.ts`, `panel.css`: isolated workbench.
- `src/install-page/index.html`, `install.ts`, `install.css`: Pages installer.
- `scripts/build.mjs`, `build-bookmarklet.mjs`, `verify-dist.mjs`: production artifact pipeline.
- `tests/unit/*.test.ts`, `tests/e2e/*.spec.ts`, `tests/fixtures/*.html`: behavior tests.
- `public/favicon.svg`, `public/preview.svg`: local visual assets.
- `.github/workflows/test.yml`, `.github/workflows/deploy-pages.yml`: CI/CD.
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `NOTICE`, `LICENSE`: open-source handoff.

### Task 1: Bootstrap the reproducible toolchain

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`
- Generated: `package-lock.json`
- Test: `tests/unit/smoke.test.ts`

- [ ] Create `tests/unit/smoke.test.ts` with a failing import of `VERSION` from `src/bookmarklet/types.ts` and assertion `expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/)`.
- [ ] Create package scripts for `typecheck`, `test`, `test:e2e`, `build`, `verify`, and `check`; add exact dev dependencies `typescript`, `esbuild`, `vitest`, `jsdom`, `@types/node`, and `@playwright/test`.
- [ ] Run `npm install`, then `npm test -- tests/unit/smoke.test.ts`; verify RED because `types.ts` does not exist.
- [ ] Add `src/bookmarklet/types.ts` with `VERSION`, `RectSnapshot`, `SelectionRecord`, `BriefDraft`, `Preferences`, and `PatchBriefController` definitions.
- [ ] Run the smoke test and `npm run typecheck`; verify both pass.

### Task 2: Build selector generation with TDD

**Files:**
- Create: `src/bookmarklet/selector.ts`
- Test: `tests/unit/selector.test.ts`

- [ ] Write failing jsdom tests for unique test attributes, stable ID, aria/name/title, semantic classes, ancestor paths, `nth-of-type`, uniqueness, escaped values, unstable UUID/hash/React/CSS-module/CSS-in-JS/Tailwind filtering, and maximum length omission.
- [ ] Run `npm test -- tests/unit/selector.test.ts`; verify RED on missing exports.
- [ ] Implement `isStableToken(value)`, `cssEscape(value)`, and `generateSelector(element, root = document)` as a candidate-and-verify pipeline with a 180-character ceiling.
- [ ] Run selector tests and the full unit suite; refactor only after GREEN.

### Task 3: Build privacy-safe sanitization and context extraction

**Files:**
- Create: `src/bookmarklet/sanitizer.ts`, `context.ts`, `target-resolver.ts`
- Test: `tests/unit/sanitizer.test.ts`, `context.test.ts`

- [ ] Write failing tests for text whitespace/truncation, query compression, password/input value removal, event/script/style removal, sensitive attributes, high-entropy strings, Locator label priority, semantic roles, regions, visual summary, hidden filtering, and interactive-parent preference.
- [ ] Run both test files and verify failures are caused by missing functions.
- [ ] Implement `truncateText`, `compressQuery`, `sanitizeElementHtml`, and sensitive-data predicates without mutating source DOM.
- [ ] Implement `getAccessibleLabel`, `getSemanticRole`, `getLocator`, `getRegion`, `getVisualSummary`, `capturePageContext`, `isMeaningfulElement`, and `resolveTarget`.
- [ ] Run focused and full unit tests; verify GREEN and no jsdom warnings.

### Task 4: Build selection state, history, and navigation

**Files:**
- Create: `src/bookmarklet/state.ts`, `selection.ts`
- Test: `tests/unit/selection.test.ts`

- [ ] Write failing tests for WeakMap identity stability, single selection, Shift toggle, deselection, clear, bounded undo, parent/child/sibling navigation, and disconnected targets.
- [ ] Run the focused test and verify RED.
- [ ] Implement a subscription-based store and pure selection transitions; cap history at 30 snapshots and never serialize Element references.
- [ ] Implement meaningful DOM navigation using `resolveTarget` filters.
- [ ] Run focused and full unit suites; verify GREEN.

### Task 5: Build i18n, preferences, and brief generation

**Files:**
- Create: `src/bookmarklet/i18n.ts`, `storage.ts`, `prompt.ts`
- Test: `tests/unit/i18n.test.ts`, `storage.test.ts`, `prompt.test.ts`

- [ ] Write failing tests for browser-language selection, complete zh-CN/en key parity, storage failure fallback, preferences-only persistence, default constraints, empty-section omission, duplicate text suppression, multi-target output, related code fences, long URL route/query split, JSON export, and invalid-target representation.
- [ ] Run focused tests and verify RED.
- [ ] Implement typed dictionaries and a translator with parameter interpolation.
- [ ] Implement namespaced, exception-safe preferences storage; draft storage remains disabled unless explicitly enabled.
- [ ] Implement `createBriefDraft`, `generateBriefMarkdown`, and `serializeBriefJson` with the required Chinese execution requirements.
- [ ] Run focused and full unit tests; verify GREEN.

### Task 6: Build clipboard, download, and screenshot capability layers

**Files:**
- Create: `src/bookmarklet/clipboard.ts`, `screenshot.ts`
- Test: `tests/unit/clipboard.test.ts`, `screenshot.test.ts`

- [ ] Write failing tests for Clipboard API success, execCommand fallback, surfaced total failure, union-rectangle math, pixel-ratio crop mapping, user cancellation, media-track cleanup, and Blob filename metadata.
- [ ] Run focused tests and verify RED.
- [ ] Implement `copyText`, `downloadBlob`, `unionRects`, `mapCaptureCrop`, and an injectable `captureSelection` adapter around `getDisplayMedia`/canvas.
- [ ] Ensure all object URLs and media tracks are finalized in `finally` paths.
- [ ] Run focused and full unit tests; verify GREEN.

### Task 7: Build the Shadow DOM workbench

**Files:**
- Create: `src/panel/panel.css`, `panel.ts`, `render.ts`, `events.ts`
- Test: `tests/unit/panel.test.ts`

- [ ] Write failing jsdom tests for Shadow Root creation, four-step navigation, target cards, invalid marker, per-target note, form controls, language selector, code count/clear, constraints, preview actions, status messages, collapse, pause, settings, and destroy events.
- [ ] Run panel tests and verify RED.
- [ ] Implement one custom host with an open Shadow Root, adopted inline CSS text, keyed render helpers, and root-level event delegation.
- [ ] Implement the 380px paper-workbench style and responsive bottom drawer with keyboard-visible sticky actions; use no page-global selectors.
- [ ] Run panel and full unit tests; verify GREEN.

### Task 8: Build overlays, inspector, shortcuts, and lifecycle

**Files:**
- Create: `src/bookmarklet/overlay.ts`, `inspector.ts`, `shortcuts.ts`, `destroy.ts`, `index.ts`
- Test: `tests/unit/runtime.test.ts`

- [ ] Write failing tests for overlay namespace/pointer-events, rAF coalescing, click interception, Shift multi-select dispatch, input shortcut exclusion, Esc/Cmd-Z/Cmd-Enter behavior, duplicate launch focus, pause/resume, and complete cleanup.
- [ ] Run runtime tests and verify RED.
- [ ] Implement fixed hover/selection layers, label badges, throttled rect updates, document/iframe listener registration, mutation invalidation, and composed-path hit testing.
- [ ] Implement the single global controller and cleanup registry; inject panel CSS as a build-time text import and expose only the approved API.
- [ ] Run focused and full unit suites; verify GREEN.

### Task 9: Build the Bookmarklet and static installer pipeline

**Files:**
- Create: `scripts/build.mjs`, `scripts/build-bookmarklet.mjs`, `scripts/verify-dist.mjs`
- Create: `src/install-page/index.html`, `install.ts`, `install.css`
- Create: `public/favicon.svg`, `public/preview.svg`
- Test: `tests/unit/install.test.ts`

- [ ] Write failing tests for payload status/HTML rejection, chunk ordering and checksum, disabled pre-ready anchor, language switching, GitHub URL derivation, retry state, and `javascript:` validation.
- [ ] Run installer tests and verify RED.
- [ ] Implement installer controller and bilingual paper-style page with hero, drag button, three steps, bookmarks-bar help, demo, privacy, support, version, repository link and FAQ.
- [ ] Implement esbuild IIFE bundling, CSS text loading, minification, version injection, URI-safe base64 chunks, manifest checksum, and relative-path static copying.
- [ ] Implement dist verifier for parseability, reassembly, prefix, asset existence, subpath-safe references, username/test/source-path leakage, and 180/250 KB budgets.
- [ ] Run `npm run build && npm run verify`; verify installer artifacts and warnings accurately reflect size.

### Task 10: Build full browser E2E coverage

**Files:**
- Create: `tests/fixtures/basic.html`, `dashboard.html`, `dynamic.html`, `tailwind-like.html`, `iframe.html`
- Create: `tests/e2e/selection.spec.ts`, `panel.spec.ts`, `dynamic-dom.spec.ts`, `cleanup.spec.ts`, `compatibility.spec.ts`

- [ ] Add a Playwright web server command that serves repository root without external requests and inject `dist/patchbrief.runtime.js` into fixtures.
- [ ] Write failing Chromium tests for launch, hover geometry, click/Shift selection, keyboard navigation, target removal, notes, request/code/constraints/result entry, generation, copy feedback, pause/resume, scroll alignment, dynamic nodes, style isolation, and cleanup.
- [ ] Run Chromium tests, inspect each failure, and make only runtime fixes required by those tests.
- [ ] Add Firefox/WebKit smoke tests for launch, selection, generation, isolation, and destroy with screenshot assertions disabled where unsupported.
- [ ] Run `npm run test:e2e`; verify all installed browser projects pass or report unavailable browser binaries separately and install them before final verification.

### Task 11: Add CI, release documentation, and licensing

**Files:**
- Create: `.github/workflows/test.yml`, `.github/workflows/deploy-pages.yml`
- Create: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `NOTICE`, `LICENSE`

- [ ] Add test workflow with Node cache, `npm ci`, typecheck, unit tests, build, verify, Playwright browser install, and E2E execution.
- [ ] Add least-privilege Pages workflow for main with checks, build, artifact upload, and deploy; use no secrets.
- [ ] Write README sections matching actual commands and behavior, including preview, install, shortcuts, example output, privacy, support, limitations, development and Pages configuration.
- [ ] Add contribution/security reporting guidance, MIT text, and original-implementation notice.
- [ ] Search docs for unsupported claims such as all-page support, source reading, automatic edits, security bypasses, or silent screenshots; correct any occurrence.

### Task 12: Final verification and requirements audit

**Files:**
- Modify only files implicated by failing verification.

- [ ] Run a clean `npm ci` from the lockfile and record exit status.
- [ ] Run `npm run typecheck`, `npm test`, `npm run build`, `npm run verify`, and `npm run test:e2e` independently; record test counts and failures.
- [ ] Serve `dist/`, load the installer in Chromium, verify the ready state and drag-link href, then execute the generated Bookmarklet on `basic.html` and generate/copy/download a brief.
- [ ] Compare every acceptance item in the design specification and user request against an implementation, automated test, or explicitly documented browser limitation.
- [ ] Inspect production files for third-party URLs, network calls, storage of draft/page data, source absolute paths, duplicate globals, and test-only code.
- [ ] Fix only issues caused by this implementation, rerun every affected command, and report exact final evidence plus known limitations.
