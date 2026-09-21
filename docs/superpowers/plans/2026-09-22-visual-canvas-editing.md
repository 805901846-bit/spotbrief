# Visual Canvas Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reversible in-page dragging, snapping, resizing, radius/color editing, multi-selection, numbered change locations, reset, undo/redo, and structured before/after brief output to SpotBrief.

**Architecture:** Keep geometry, change tracking, and command history in pure TypeScript modules. A focused visual-editor controller owns temporary DOM styles and overlays, while the existing bookmarklet controller coordinates selection, the compact editor, task bar, screenshots, and brief generation. Every edited element stores its original inline style so reset and destroy restore the host page exactly.

**Tech Stack:** TypeScript, DOM/Pointer Events, Shadow DOM, Vitest with jsdom, Playwright, esbuild.

---

## File structure

- `src/bookmarklet/visual-changes.ts` — pure change records, continuous numbering, diff counting, and brief serialization.
- `src/bookmarklet/command-history.ts` — bounded undo/redo stack with compound commands.
- `src/bookmarklet/canvas-geometry.ts` — translate parsing, resize calculations, reference bounds, and snapping.
- `src/bookmarklet/visual-session.ts` — capture original inline styles, apply previews, reset elements, and restore all.
- `src/bookmarklet/canvas-overlay.ts` — selection boxes, eight resize handles, number markers, and guide lines.
- `src/bookmarklet/canvas-editor.ts` — one-line editor, color/note popovers, compact task bar, and UI events.
- `src/bookmarklet/index.ts` — orchestration only: selection, hierarchy navigation, drag/resize sessions, history, draft generation, cleanup.
- `src/bookmarklet/types.ts` — shared visual-diff and brief types.
- `src/bookmarklet/prompt.ts` — Markdown/JSON output for numbered visual changes.
- `src/panel/panel.css` — compact translucent controls and responsive layout.

### Task 1: Visual change model and continuous numbering

**Files:**
- Create: `src/bookmarklet/visual-changes.ts`
- Modify: `src/bookmarklet/types.ts`
- Create: `tests/unit/visual-changes.test.ts`

- [ ] **Step 1: Write failing change-model tests**

```ts
import { describe, expect, it } from 'vitest';
import { createVisualChangeStore } from '../../src/bookmarklet/visual-changes';

describe('visual change store', () => {
  it('numbers changed elements once and compacts numbers after reset', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const store = createVisualChangeStore();
    store.setStyle(a, '.a', 'borderRadius', '0px', '12px');
    store.setStyle(a, '.a', 'backgroundColor', 'white', 'red');
    store.setStyle(b, '.b', 'borderRadius', '0px', '8px');
    expect(store.list().map(item => item.number)).toEqual([1, 2]);
    store.reset(a);
    expect(store.list().map(item => [item.selector, item.number])).toEqual([['.b', 1]]);
  });

  it('removes a property diff when after returns to before', () => {
    const element = document.createElement('div');
    const store = createVisualChangeStore();
    store.setStyle(element, '#card', 'borderRadius', '0px', '12px');
    store.setStyle(element, '#card', 'borderRadius', '0px', '0px');
    expect(store.list()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- tests/unit/visual-changes.test.ts`

Expected: FAIL because `src/bookmarklet/visual-changes.ts` does not exist.

- [ ] **Step 3: Add shared visual-diff types and the minimal store**

Add to `src/bookmarklet/types.ts`:

```ts
export type EditableStyleProperty = 'transform' | 'width' | 'height' | 'borderRadius' | 'backgroundColor';
export interface StyleDiff { before: string; after: string; delta?: number }
export interface VisualChangeRecord {
  number: number;
  element: Element;
  selector: string;
  note: string;
  styles: Partial<Record<EditableStyleProperty, StyleDiff>>;
  snapNote?: string;
}
export interface BriefVisualChange extends Omit<VisualChangeRecord, 'element'> {}
```

Create `src/bookmarklet/visual-changes.ts` with a `Map<Element, InternalRecord>`, a monotonic first-change order, `setStyle`, `setNote`, `setSnapNote`, `reset`, `get`, and `list`. `list()` must filter empty records, sort by first-change order, and assign fresh continuous numbers without mutating the order.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- tests/unit/visual-changes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bookmarklet/types.ts src/bookmarklet/visual-changes.ts tests/unit/visual-changes.test.ts
git commit -m "feat: track numbered visual changes"
```

### Task 2: Bounded command history and compound reset

**Files:**
- Create: `src/bookmarklet/command-history.ts`
- Create: `tests/unit/command-history.test.ts`

- [ ] **Step 1: Write failing undo/redo tests**

```ts
import { describe, expect, it } from 'vitest';
import { createCommandHistory } from '../../src/bookmarklet/command-history';

it('undoes and redoes one committed interaction', () => {
  let value = 0;
  const history = createCommandHistory(30);
  history.execute({ redo: () => { value = 12; }, undo: () => { value = 0; } });
  expect(value).toBe(12);
  history.undo(); expect(value).toBe(0);
  history.redo(); expect(value).toBe(12);
});

it('clears redo after a new command and bounds retained history', () => {
  const history = createCommandHistory(2);
  let value = 0;
  history.execute({ redo: () => { value = 1; }, undo: () => { value = 0; } });
  history.undo();
  history.execute({ redo: () => { value = 2; }, undo: () => { value = 0; } });
  expect(history.canRedo()).toBe(false);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/command-history.test.ts`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement the command-history API**

```ts
export interface Command { redo(): void; undo(): void }
export interface CommandHistory {
  execute(command: Command): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}
export function createCommandHistory(limit = 100): CommandHistory {
  const undoStack: Command[] = [];
  const redoStack: Command[] = [];
  return {
    execute(command) {
      command.redo();
      undoStack.push(command);
      if (undoStack.length > limit) undoStack.splice(0, undoStack.length - limit);
      redoStack.length = 0;
    },
    undo() {
      const command = undoStack.pop();
      if (!command) return false;
      command.undo();
      redoStack.push(command);
      return true;
    },
    redo() {
      const command = redoStack.pop();
      if (!command) return false;
      command.redo();
      undoStack.push(command);
      return true;
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    clear() { undoStack.length = 0; redoStack.length = 0; }
  };
}
```

`execute` runs `redo`, pushes the command, truncates the undo stack from the front, and clears redo. `undo` and `redo` return whether an action occurred.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/unit/command-history.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bookmarklet/command-history.ts tests/unit/command-history.test.ts
git commit -m "feat: add reversible command history"
```

### Task 3: Drag, resize, and snapping geometry

**Files:**
- Create: `src/bookmarklet/canvas-geometry.ts`
- Create: `tests/unit/canvas-geometry.test.ts`

- [ ] **Step 1: Write failing geometry tests**

```ts
import { expect, it } from 'vitest';
import { calculateResize, findSnap, parseTranslate } from '../../src/bookmarklet/canvas-geometry';

it('parses existing translate without discarding it', () => {
  expect(parseTranslate('rotate(3deg) translate3d(12px, -4px, 0)')).toEqual({ x: 12, y: -4 });
});

it('snaps a moving left edge to a nearby reference left edge', () => {
  const result = findSnap({ left: 96, top: 20, width: 50, height: 40 }, [{ name: '.peer', left: 100, right: 180, top: 20, bottom: 60 }], 9);
  expect(result.dx).toBe(4);
  expect(result.vertical?.label).toContain('.peer');
});

it('resizes from the south-east handle and enforces a minimum', () => {
  expect(calculateResize({ x: 10, y: 20, width: 100, height: 60 }, 'se', -95, -55, false, 16)).toEqual({ x: 10, y: 20, width: 16, height: 16 });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/canvas-geometry.test.ts`

Expected: FAIL because the geometry module is missing.

- [ ] **Step 3: Implement pure geometry helpers**

Export `Point`, `Box`, `ResizeDirection`, `SnapReference`, `SnapResult`, `parseTranslate`, `calculateResize`, and `findSnap`. `findSnap` compares left/center/right and top/center/bottom, selects the closest candidate within the threshold, and returns guide metadata without touching DOM.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/unit/canvas-geometry.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bookmarklet/canvas-geometry.ts tests/unit/canvas-geometry.test.ts
git commit -m "feat: calculate canvas drag resize and snapping"
```

### Task 4: Reversible visual session

**Files:**
- Create: `src/bookmarklet/visual-session.ts`
- Create: `tests/unit/visual-session.test.ts`

- [ ] **Step 1: Write failing restoration tests**

```ts
import { expect, it } from 'vitest';
import { createVisualSession } from '../../src/bookmarklet/visual-session';

it('restores the exact original inline style after edits', () => {
  const element = document.createElement('div');
  element.setAttribute('style', 'transform: rotate(3deg); color: blue');
  document.body.append(element);
  const session = createVisualSession();
  session.apply(element, { transform: 'rotate(3deg) translate3d(20px, 0, 0)', borderRadius: '12px' });
  session.restoreAll();
  expect(element.getAttribute('style')).toBe('transform: rotate(3deg); color: blue');
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/visual-session.test.ts`

Expected: FAIL because the session module is missing.

- [ ] **Step 3: Implement exact style capture and restore**

`createVisualSession()` returns `capture(element)`, `apply(element, styles)`, `reset(element)`, `restoreAll()`, and `originalStyle(element)`. Capture `element.getAttribute('style')` before the first mutation; restore with `setAttribute` when non-null and `removeAttribute('style')` when originally absent. Never infer restoration from computed styles.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/unit/visual-session.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bookmarklet/visual-session.ts tests/unit/visual-session.test.ts
git commit -m "feat: restore temporary canvas edits"
```

### Task 5: Canvas overlays, markers, and compact controls

**Files:**
- Create: `src/bookmarklet/canvas-overlay.ts`
- Create: `src/bookmarklet/canvas-editor.ts`
- Modify: `src/panel/panel.css`
- Create: `tests/unit/canvas-overlay.test.ts`

- [ ] **Step 1: Write failing DOM tests**

```ts
import { expect, it } from 'vitest';
import { createCanvasOverlay } from '../../src/bookmarklet/canvas-overlay';

it('renders eight keyboard-focusable resize handles and a change marker', () => {
  const overlay = createCanvasOverlay();
  overlay.setNumber(3);
  expect(overlay.element.querySelectorAll('[data-resize-dir]')).toHaveLength(8);
  expect(overlay.element.querySelectorAll('[data-resize-dir][tabindex="0"]')).toHaveLength(8);
  expect(overlay.element.querySelector('[data-change-number]')?.textContent).toBe('3');
  overlay.destroy();
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/canvas-overlay.test.ts`

Expected: FAIL because the overlay module is missing.

- [ ] **Step 3: Implement overlay and compact-editor factories**

`createCanvasOverlay()` must expose `element`, `position(rect)`, `setSelected`, `setNumber`, `showGuides`, `hideGuides`, and `destroy`. Add four border drag targets, eight resize handles, and one clickable number marker. `createCanvasEditor(root)` must render only radius, color, note, reset, and close in its collapsed row, with color and note popovers opened on demand. `createTaskBar(root)` renders `N 处 · M 项变更`, undo, redo, settings, and generate.

- [ ] **Step 4: Add compact responsive CSS**

Use Shadow DOM-scoped classes, a translucent light editor row, a translucent dark task bar, visible `:focus-visible` outlines, visually compact icons with at least 36×36 CSS-pixel hit areas on desktop, `backdrop-filter` fallback colors, and a narrow-screen stacked layout that remains inside the viewport.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm test -- tests/unit/canvas-overlay.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/bookmarklet/canvas-overlay.ts src/bookmarklet/canvas-editor.ts src/panel/panel.css tests/unit/canvas-overlay.test.ts
git commit -m "feat: add compact canvas editing controls"
```

### Task 6: Integrate selection, multi-drag, resize, hierarchy, history, and reset

**Files:**
- Modify: `src/bookmarklet/index.ts`
- Modify: `src/bookmarklet/target-resolver.ts`
- Create: `tests/e2e/canvas-editing.spec.ts`

- [ ] **Step 1: Write the first failing browser test**

```ts
import { expect, test } from '@playwright/test';

test('edits, numbers, resets, and restores one element', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const target = page.locator('#delete-order');
  const originalStyle = await target.getAttribute('style');
  await target.click();
  await expect(page.locator('[data-change-number]')).toHaveCount(0);
  await page.locator('#patchbrief-host [data-action="set-radius"]').evaluate((node) => node.dispatchEvent(new CustomEvent('patchbrief:set-radius', { bubbles: true, detail: 16 })));
  await expect(page.locator('[data-change-number]')).toHaveText('1');
  await page.locator('#patchbrief-host [data-action="reset-element"]').click();
  await expect(page.locator('[data-change-number]')).toHaveCount(0);
  await page.evaluate(() => window.__PATCHBRIEF__?.destroy());
  expect(await target.getAttribute('style')).toBe(originalStyle);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run build && npx playwright test tests/e2e/canvas-editing.spec.ts`

Expected: FAIL because compact editor actions and numbered overlays are absent.

- [ ] **Step 3: Refactor `index.ts` into orchestration and implement single-selection editing**

Instantiate the change store, history, visual session, overlays, compact editor, and task bar. Keep host-page pointer listeners in the controller. On selection, open the editor; on radius/color/note commit, create one command whose `redo` applies the final value and whose `undo` applies the starting value. Update overlays, counts, and editor state after every committed command.

- [ ] **Step 4: Add drag and resize sessions**

On pointerdown, snapshot pointer position, selected boxes, existing translations, and snap references. On pointermove, store pending coordinates and schedule one animation frame. On pointerup/cancel, remove `will-change`, hide guides, and commit exactly one command when values changed. Resize only a single selected element in v1; keep its minimum width and height at 16 CSS pixels.

- [ ] **Step 5: Add Shift multi-selection, group drag, and shared editing**

Shift-click toggles selection membership. Group drag applies the same delta to every member. Radius/color commits apply to all selected elements as one compound command. The note popover edits one shared batch note when multiple elements are selected. Mixed values render as `多值` until the user chooses a new value.

- [ ] **Step 6: Add hierarchy keyboard navigation**

Track a child-return stack per pointer-hover path. When no input, textarea, select, contenteditable, resize handle, or popover owns focus, ArrowUp selects the safe parent and ArrowDown returns to the previous child. Stop before `body`/`html` and exclude SpotBrief UI.

- [ ] **Step 7: Add reset, renumber, marker navigation, undo, and redo**

Reset captures before/after snapshots for all selected records, restores the original styles and notes, removes empty records, and commits one compound command. Marker click calls `scrollIntoView({ block: 'center', inline: 'center' })`, selects the element, and opens the editor. Refresh continuous numbers after every command. Wire the task bar and `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, and `Ctrl+Y` without intercepting editable fields.

- [ ] **Step 8: Make destroy restore host-page state before UI cleanup**

Cancel active animation frames and pointer sessions, call `visualSession.restoreAll()`, restore cursor/user-select styles, remove observers/listeners/overlays/editor/task bar, revoke screenshot URLs, and delete `window.__PATCHBRIEF__`.

- [ ] **Step 9: Run focused browser tests and verify GREEN**

Run: `npm run build && npx playwright test tests/e2e/canvas-editing.spec.ts tests/e2e/selection.spec.ts tests/e2e/panel-drag.spec.ts`

Expected: PASS. Update the obsolete panel-drag test to assert the compact task bar remains visible rather than dragging the removed large panel.

- [ ] **Step 10: Commit**

```bash
git add src/bookmarklet/index.ts src/bookmarklet/target-resolver.ts tests/e2e/canvas-editing.spec.ts tests/e2e/panel-drag.spec.ts
git commit -m "feat: integrate reversible canvas editing"
```

### Task 7: Structured visual diffs in Markdown and JSON

**Files:**
- Modify: `src/bookmarklet/types.ts`
- Modify: `src/bookmarklet/prompt.ts`
- Modify: `src/bookmarklet/index.ts`
- Modify: `tests/unit/prompt.test.ts`

- [ ] **Step 1: Write failing prompt tests**

```ts
it('prints numbered before and after visual changes', () => {
  const markdown = generateBriefMarkdown({
    ...baseDraft,
    selections: [],
    visualChanges: [{
      number: 1,
      selector: '#card',
      note: '强调主操作',
      snapNote: '与 .hero 水平居中',
      styles: { borderRadius: { before: '0px', after: '16px' }, width: { before: '240px', after: '320px', delta: 80 } }
    }]
  });
  expect(markdown).toContain('### 修改位置 1');
  expect(markdown).toContain('圆角：0px → 16px');
  expect(markdown).toContain('宽度：240px → 320px（+80px）');
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/prompt.test.ts`

Expected: FAIL because `BriefDraft.visualChanges` and the output section do not exist.

- [ ] **Step 3: Extend draft types and output**

Add `visualChanges?: BriefVisualChange[]` and `batchNotes?: { selectors: string[]; note: string }[]` to `BriefDraft`. In Markdown, emit `## 视觉修改位置`, then one `### 修改位置 N` block per record with selector, note, snap relation, and localized before/after lines. Keep JSON serialization unchanged so it exposes the typed `before`, `after`, and `delta` values.

- [ ] **Step 4: Build the draft from the current change store**

In `index.ts`, map `changeStore.list()` to serializable records with no DOM `element` reference. Preserve existing point-and-describe selections for unchanged elements and avoid duplicating an element note in both sections.

- [ ] **Step 5: Run focused and full unit tests**

Run: `npm test -- tests/unit/prompt.test.ts && npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/bookmarklet/types.ts src/bookmarklet/prompt.ts src/bookmarklet/index.ts tests/unit/prompt.test.ts
git commit -m "feat: generate briefs from visual diffs"
```

### Task 8: Complete browser coverage, docs, and verification

**Files:**
- Modify: `tests/e2e/canvas-editing.spec.ts`
- Modify: `tests/e2e/selection.spec.ts`
- Modify: `README.md`
- Modify: `docs/product/feature-backlog.md`

- [ ] **Step 1: Add failing end-to-end cases for the remaining acceptance criteria**

Add tests that verify: multi-select group drag preserves relative positions; snap guides appear and Alt disables them; resize handles change width/height; undo/redo restores values and counts; reset removes a marker and compacts remaining numbers; marker click scrolls and selects; task settings still expose screenshot/code/constraints; destroy restores exact inline styles; compact controls remain within a 390-pixel viewport.

- [ ] **Step 2: Run the new cases and verify RED where coverage reveals missing behavior**

Run: `npm run build && npx playwright test tests/e2e/canvas-editing.spec.ts`

Expected: each newly added case fails for its named missing or incorrect behavior before the related fix.

- [ ] **Step 3: Make the smallest implementation corrections needed for GREEN**

Change only the responsible module for each failing behavior: geometry in `canvas-geometry.ts`, history in `command-history.ts`, style restoration in `visual-session.ts`, overlay rendering in `canvas-overlay.ts`, compact controls in `canvas-editor.ts`, and event coordination in `index.ts`.

- [ ] **Step 4: Update user-facing documentation**

Document the temporary-preview model, single and Shift multi-selection, drag/snap/resize controls, ArrowUp/ArrowDown hierarchy navigation, compact radius/color/note/reset editor, numbered markers, undo/redo, task settings, brief output, and full restoration on close. Move visual canvas editing from candidate work into completed work in the backlog.

- [ ] **Step 5: Run the complete verification suite**

Run: `npm run check && npm run test:e2e`

Expected: typecheck, all Vitest tests, build, distribution verification, and all Playwright tests PASS with no warnings attributable to SpotBrief.

- [ ] **Step 6: Inspect repository state**

Run: `git status --short && git diff --check`

Expected: only intended documentation or implementation files remain uncommitted; `git diff --check` prints nothing.

- [ ] **Step 7: Commit final documentation and browser coverage**

```bash
git add README.md docs/product/feature-backlog.md tests/e2e/canvas-editing.spec.ts tests/e2e/selection.spec.ts
git commit -m "docs: explain visual canvas editing workflow"
```
