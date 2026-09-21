# Screenshot and Draggable Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-authorized rectangular viewport screenshots and a draggable, remembered desktop panel to SpotBrief.

**Architecture:** Keep geometry and persistence rules in small pure TypeScript modules covered by Vitest. Integrate browser permission, selection overlay, screenshot preview, pointer dragging, cleanup, and brief metadata in the existing bookmarklet controller, while keeping PNG bytes only in memory.

**Tech Stack:** TypeScript, native DOM/Pointer Events, Screen Capture API, Canvas, Clipboard API, localStorage, Vitest, Playwright, esbuild.

---

### Task 1: Screenshot geometry and brief metadata

**Files:**
- Modify: `src/bookmarklet/screenshot.ts`
- Modify: `src/bookmarklet/prompt.ts`
- Create: `tests/unit/screenshot.test.ts`
- Modify: `tests/unit/prompt.test.ts`

- [ ] Write failing tests for reverse-direction rectangle normalization, 20px minimum size, viewport-to-video pixel mapping, and optional screenshot Markdown.
- [ ] Run the two unit test files and confirm failures are caused by missing behavior.
- [ ] Add pure `normalizeRect`, `isValidCaptureRect`, and `mapRectToVideo` helpers; make capture accept an explicit rectangle.
- [ ] Render a screenshot section only when metadata exists.
- [ ] Re-run the focused tests and confirm they pass.

### Task 2: Saved and clamped panel position

**Files:**
- Modify: `src/bookmarklet/types.ts`
- Modify: `src/bookmarklet/storage.ts`
- Create: `src/panel/position.ts`
- Create: `tests/unit/panel-position.test.ts`
- Create: `tests/unit/storage.test.ts`

- [ ] Write failing tests for viewport clamping, default position, valid saved coordinates, malformed saved coordinates, and reset behavior.
- [ ] Run focused tests and confirm expected failures.
- [ ] Extend preferences with optional panel coordinates and implement pure clamping/default helpers.
- [ ] Re-run focused tests and confirm they pass.

### Task 3: Draggable panel runtime

**Files:**
- Modify: `src/bookmarklet/index.ts`
- Modify: `src/panel/panel.css`
- Modify: `src/bookmarklet/i18n.ts`
- Create: `tests/e2e/panel-drag.spec.ts`

- [ ] Write a failing Playwright test that drags the top bar, verifies position changes, recreates SpotBrief to verify persistence, and resets the default position.
- [ ] Run the test and confirm it fails because dragging is absent.
- [ ] Add pointer-driven top-bar dragging, button exclusion, desktop-only clamping, preference persistence, resize clamping, and reset action.
- [ ] Rebuild and rerun the focused browser test until it passes.

### Task 4: Rectangular screenshot runtime

**Files:**
- Modify: `src/bookmarklet/index.ts`
- Modify: `src/bookmarklet/screenshot.ts`
- Modify: `src/panel/panel.css`
- Modify: `src/bookmarklet/i18n.ts`
- Create: `tests/e2e/screenshot.spec.ts`

- [ ] Write a failing browser test with a controlled fake display stream and clipboard, then verify selection overlay, drag crop, preview, metadata, delete, cancellation, and cleanup.
- [ ] Run it and confirm failure is due to missing screenshot controls.
- [ ] Implement permission request, temporary UI hiding, fixed selection overlay, scroll lock, rectangle crop, preview URL, copy/download/retry/delete controls, errors, and complete cleanup.
- [ ] Rebuild and rerun the focused browser test until it passes.

### Task 5: Full verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/SpotBrief-零基础使用说明书.md`
- Modify: `docs/product/feature-backlog.md`

- [ ] Update actual behavior, privacy, screenshot permission, panel dragging, and known limitations.
- [ ] Run TypeScript checking, all unit tests, production build, dist verification, and all Chromium E2E tests.
- [ ] Confirm runtime remains below the 180KB target and production output contains no source paths or test code.
