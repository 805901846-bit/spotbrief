# SpotBrief Compact Panel v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current multi-section workbench with a compact select–describe–generate panel and move low-frequency AI, constraint, and output controls into a settings view.

**Architecture:** Keep the bookmarklet runtime and compatibility identifiers unchanged. Simplify `FormState`, render the main and settings views from the existing Shadow DOM runtime, and reuse the current screenshot, selection, prompt, preference, and AI bridge services. Drive the change through unit and Playwright tests before changing production rendering.

**Tech Stack:** TypeScript, native DOM and Shadow DOM, CSS, Vitest, Playwright, esbuild.

---

### Task 1: Simplify Draft State and AI Defaults

**Files:**
- Modify: `src/bookmarklet/form-state.ts`
- Modify: `tests/unit/form-state.test.ts`

- [ ] **Step 1: Write failing state tests**

Replace the optional-section assertion with tests that require API-aware AI defaults and no code-section state:

```ts
it('enables AI by default only when an API bridge is configured', () => {
  expect(createFormState(undefined, true).aiOptimize).toBe(true);
  expect(createFormState(undefined, false).aiOptimize).toBe(false);
});

it('contains only fields used by the compact task flow', () => {
  expect(createFormState()).toEqual({
    request: '',
    constraints: [...SAFE_DEFAULT_CONSTRAINTS],
    screenshotNote: '',
    aiOptimize: false,
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `../../node_modules/.bin/vitest run tests/unit/form-state.test.ts`

Expected: FAIL because `createFormState` has no bridge argument and still returns code/language/open-state fields.

- [ ] **Step 3: Implement the compact state shape**

Change `FormState` and its factory to:

```ts
export interface FormState {
  request: string;
  constraints: string[];
  screenshotNote: string;
  aiOptimize: boolean;
}

export function createFormState(savedDefaults?: string[], aiConfigured = false): FormState {
  return {
    request: '',
    constraints: savedDefaults?.length ? [...savedDefaults] : [...SAFE_DEFAULT_CONSTRAINTS],
    screenshotNote: '',
    aiOptimize: aiConfigured,
  };
}
```

- [ ] **Step 4: Run the focused test and typecheck**

Run: `../../node_modules/.bin/vitest run tests/unit/form-state.test.ts && ../../node_modules/.bin/tsc --noEmit`

Expected: state tests PASS; typecheck identifies every old code-field reference that Task 2 must remove.

- [ ] **Step 5: Commit**

```bash
git add src/bookmarklet/form-state.ts tests/unit/form-state.test.ts
git commit -m "refactor: simplify compact panel state"
```

### Task 2: Render the Compact Main Panel

**Files:**
- Modify: `src/bookmarklet/index.ts`
- Modify: `src/panel/panel.css`
- Modify: `tests/e2e/compact-form.spec.ts`

- [ ] **Step 1: Rewrite the Playwright expectations for the new main flow**

Require the main panel to expose one screenshot button beside the selection hint, one always-visible request field, per-target notes, and no legacy controls:

```ts
await expect(panel.locator('[data-role="selection-prompt"]')).toContainText('点击页面元素开始选择');
await expect(panel.locator('[data-action="capture"]')).toHaveCount(1);
await expect(panel.locator('[name="request"]')).toBeVisible();
await expect(panel.getByText('全局修改目标')).toHaveCount(0);
await expect(panel.getByText('相关代码')).toHaveCount(0);
await expect(panel.getByText('高级选项')).toHaveCount(0);
await expect(panel.locator('[data-action="undo"]')).toHaveCount(0);
await expect(panel.locator('[data-action="settings"]')).toBeVisible();
```

Select two fixture buttons with Shift, fill different `[data-note]` fields, fill `[name=request]`, generate, and assert the preview contains the shared request once and both individual notes.

- [ ] **Step 2: Run the focused E2E test and verify RED**

Run: `../../node_modules/.bin/playwright test tests/e2e/compact-form.spec.ts --project=chromium --reporter=line`

Expected: FAIL because the old code/constraint details and footer undo button still render.

- [ ] **Step 3: Replace the main panel markup**

In `render()`:

- initialize state with `createFormState(preferences.defaultConstraints, Boolean(bridgeConfig?.url && bridgeConfig?.token))`;
- add `view: 'main' | 'settings'` runtime state;
- render a compact top bar with `data-action="settings"`;
- render `<div class="selection-prompt" data-role="selection-prompt">…<button data-action="capture">截图</button></div>`;
- render target cards and their note inputs;
- render one `<textarea name="request" placeholder="统一描述本次修改要求…">`;
- remove code, language, expected-result, inline constraints, inline AI, legacy screenshot heading, and visible undo markup;
- keep footer clear and generate actions.

Remove `ensureCompactFormUi`, the code/count summary helpers, code input handlers, details toggle handlers, `clear-code`, and the duplicate screenshot insertion observer. Render the screenshot preview directly below the selection prompt.

- [ ] **Step 4: Compact the CSS**

Set the desktop panel width to `min(352px, calc(100vw - 20px))`, reduce top/body/footer padding to 8–10px, make target cards 8px padded, make textareas 68px minimum height, and add focused styles for `.selection-prompt`, `.settings-view`, `.settings-group`, and `.compact-row`. Preserve the existing mobile drawer rule and Shadow DOM isolation.

- [ ] **Step 5: Run typecheck and focused E2E**

Run: `../../node_modules/.bin/tsc --noEmit && ../../node_modules/.bin/playwright test tests/e2e/compact-form.spec.ts --project=chromium --reporter=line`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/bookmarklet/index.ts src/panel/panel.css tests/e2e/compact-form.spec.ts
git commit -m "feat: introduce compact SpotBrief task panel"
```

### Task 3: Add the Settings View

**Files:**
- Modify: `src/bookmarklet/index.ts`
- Modify: `src/bookmarklet/storage.ts`
- Modify: `src/bookmarklet/types.ts`
- Modify: `tests/unit/storage.test.ts`
- Create: `tests/e2e/settings.spec.ts`

- [ ] **Step 1: Write failing preference and settings tests**

Add a storage test proving default constraints and output toggles survive a save/load cycle. Add Playwright coverage that opens `[data-action=settings]`, sees AI, constraints, HTML, visual summary, and language controls, changes each, returns with `[data-action=settings-back]`, and confirms the compact main view is restored.

Also assert:

```ts
expect(await panel.locator('[name="ai-optimize"]').isChecked()).toBe(true);
```

when the fixture sets `window.__PATCHBRIEF_AI_BRIDGE__` before injecting the runtime, and false without a bridge.

- [ ] **Step 2: Run tests and verify RED**

Run: `../../node_modules/.bin/vitest run tests/unit/storage.test.ts && ../../node_modules/.bin/playwright test tests/e2e/settings.spec.ts --project=chromium --reporter=line`

Expected: FAIL because no settings view/actions exist.

- [ ] **Step 3: Implement settings rendering and persistence**

Render settings as an alternate panel body, not a modal. Include:

```html
<button data-action="settings-back">返回</button>
<input type="checkbox" name="ai-optimize">
<input type="checkbox" name="constraint" value="…">
<input type="checkbox" name="include-visual">
<input type="checkbox" name="include-html">
<select name="ui-language">…</select>
```

On changes, update `formState` or `preferences`, call `savePreferences(preferences)`, and rerender only when necessary. Use `preferences.includeVisual` and `preferences.includeHtml` when constructing `draft()` so disabled fields are omitted. Keep the existing historical localStorage key.

- [ ] **Step 4: Run unit, E2E, and type checks**

Run: `../../node_modules/.bin/tsc --noEmit && ../../node_modules/.bin/vitest run tests/unit/storage.test.ts && ../../node_modules/.bin/playwright test tests/e2e/settings.spec.ts --project=chromium --reporter=line`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bookmarklet/index.ts src/bookmarklet/storage.ts src/bookmarklet/types.ts tests/unit/storage.test.ts tests/e2e/settings.spec.ts
git commit -m "feat: move low-frequency controls into settings"
```

### Task 4: Simplify Screenshot Actions Without Regressing Capture

**Files:**
- Modify: `src/bookmarklet/index.ts`
- Modify: `src/panel/panel.css`
- Modify: `tests/e2e/screenshot.spec.ts`

- [ ] **Step 1: Extend the screenshot test for the compact entry**

Assert exactly one capture button exists before capture. After capture, assert the preview, note field, and delete button are visible while copy/download actions are hidden behind `[data-action="screenshot-more"]`. Open more actions and verify copy/download become visible.

- [ ] **Step 2: Run screenshot E2E and verify RED**

Run: `../../node_modules/.bin/playwright test tests/e2e/screenshot.spec.ts --project=chromium --reporter=line`

Expected: FAIL because all screenshot actions currently remain visible.

- [ ] **Step 3: Implement compact screenshot preview actions**

Track a boolean `screenshotActionsOpen`. Render preview, dimensions, note, delete, and one ellipsis/more button by default. Render copy/download only when open. Reset the boolean when a screenshot is replaced or deleted. Keep capture permission, cancellation, crop, cleanup, and generated brief metadata unchanged.

- [ ] **Step 4: Run screenshot and cleanup tests**

Run: `../../node_modules/.bin/playwright test tests/e2e/screenshot.spec.ts tests/e2e/selection.spec.ts --project=chromium --reporter=line`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bookmarklet/index.ts src/panel/panel.css tests/e2e/screenshot.spec.ts
git commit -m "refactor: compact screenshot controls"
```

### Task 5: Documentation, Build, and Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/SpotBrief-零基础使用说明书.md`
- Modify: `public/preview.svg`
- Regenerate: `dist/index.html`
- Regenerate: `dist/install.js`
- Regenerate: `dist/patchbrief.runtime.js`
- Regenerate: `dist/payload/chunk-000.txt`
- Regenerate: `dist/payload/manifest.json`
- Regenerate: `dist/preview.svg`
- Regenerate: `dist/spotbrief-bookmarklet.txt`

- [ ] **Step 1: Update user-facing documentation**

Describe the compact flow, shared “修改要求”, optional element notes, settings location, API-aware default, screenshot entry, and keyboard-only undo. Remove instructions for related code, global goals, advanced options, and the visible undo button.

- [ ] **Step 2: Update the preview SVG**

Show the 352px compact panel with the inline screenshot action, two concise target cards, shared request field, settings icon, and two-button footer.

- [ ] **Step 3: Run complete local verification**

Run:

```bash
../../node_modules/.bin/tsc --noEmit
../../node_modules/.bin/vitest run
node scripts/build.mjs
node scripts/verify-dist.mjs
../../node_modules/.bin/playwright test --project=chromium --reporter=line
git diff --check
```

Expected: TypeScript exits 0; all unit and E2E tests pass; build and dist verification exit 0; no whitespace errors.

- [ ] **Step 4: Audit removed UI and preserved compatibility**

Run:

```bash
rg -n "全局修改目标|相关代码|高级选项|data-action=.?undo" src README.md docs/guides tests/e2e
rg -n "__PATCHBRIEF__|patchbrief:preferences|patchbrief.runtime.js" src scripts
```

Expected: the first command reports only intentional migration/history references or test assertions for absence; the second confirms compatibility identifiers remain.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/guides public/preview.svg dist
git commit -m "docs: update SpotBrief compact workflow"
```
