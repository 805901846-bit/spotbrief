# SpotBrief Exit and Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guarded close button and Escape shortcut that fully exit SpotBrief and restore the host page to its pre-session state.

**Architecture:** Extend the existing compact taskbar with a dedicated exit action, add one Shadow DOM confirmation dialog component, and route both button and keyboard activation through one `requestExit()` function. The existing controller `destroy()` and visual session `restoreAll()` remain the single cleanup path; confirmation only decides whether that path runs.

**Tech Stack:** TypeScript, Shadow DOM HTML/CSS, Vitest, Playwright, esbuild.

---

## File Map

- Modify `src/bookmarklet/canvas-editor.ts`: render the taskbar close action and create/update/destroy the confirmation dialog.
- Modify `src/bookmarklet/index.ts`: detect dirty sessions, coordinate guarded exit, handle Escape, focus restoration, and confirmed destruction.
- Modify `src/panel/panel.css`: style the small close button and accessible confirmation dialog.
- Modify `tests/e2e/canvas-editing.spec.ts`: verify immediate exit, guarded exit, cancel, Escape, and page restoration.
- Modify `src/install-page/index.html`: show the close control in the decorative taskbar preview.
- Modify `src/install-page/install.css`: size and style the preview close control.
- Modify `tests/e2e/install-page.spec.ts`: lock the preview placement.
- Regenerate `dist/*` with `npm run build`.

### Task 1: Lock the Exit Contract With Failing Browser Tests

**Files:**
- Modify: `tests/e2e/canvas-editing.spec.ts`

- [ ] **Step 1: Add the untouched-session exit test**

```ts
test('closes an untouched SpotBrief session immediately', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const host = page.locator('#patchbrief-host');
  await host.locator('[data-action="request-exit"]').click();
  await expect(host).toHaveCount(0);
});
```

- [ ] **Step 2: Add the guarded restore test**

```ts
test('confirms exit and restores the page after visual edits', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const target = page.locator('#delete-order');
  const originalStyle = await target.getAttribute('style');
  await target.click();
  const host = page.locator('#patchbrief-host');
  const radius = host.locator('[data-action="set-radius"]');
  await radius.fill('18');
  await radius.dispatchEvent('change');

  await host.locator('[data-action="request-exit"]').click();
  await expect(host.locator('[role="dialog"]')).toContainText('退出 SpotBrief？');
  await expect(host.locator('[data-action="cancel-exit"]')).toBeFocused();
  await host.locator('[data-action="confirm-exit"]').click();

  await expect(host).toHaveCount(0);
  expect(await target.getAttribute('style')).toBe(originalStyle);
  await expect(page.locator('[class^="patchbrief-"]')).toHaveCount(0);
});
```

- [ ] **Step 3: Add cancellation and Escape tests**

```ts
test('cancels guarded exit and preserves the edited session', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const target = page.locator('#delete-order');
  await target.click();
  const host = page.locator('#patchbrief-host');
  await page.keyboard.press('Escape');
  await expect(host.locator('[role="dialog"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(host.locator('[role="dialog"]')).toBeHidden();
  await expect(host).toHaveCount(1);
});
```

- [ ] **Step 4: Run and verify RED**

Run:

```bash
npx playwright test tests/e2e/canvas-editing.spec.ts -g "exit|closes|cancels"
```

Expected: selectors for `request-exit`, `confirm-exit`, and the dialog are missing.

- [ ] **Step 5: Commit the failing contract**

```bash
git add tests/e2e/canvas-editing.spec.ts
git commit -m "test: define guarded SpotBrief exit contract"
```

### Task 2: Build the Taskbar Action and Confirmation Component

**Files:**
- Modify: `src/bookmarklet/canvas-editor.ts`
- Modify: `src/panel/panel.css`

- [ ] **Step 1: Add the taskbar close button**

Append this immediately after the generate button in `createTaskBar()`:

```html
<button class="exit-button" data-action="request-exit" type="button" aria-label="关闭 SpotBrief" title="关闭 SpotBrief">×</button>
```

Keep the visible control 28px square and its button hit area 34px square:

```css
.canvas-taskbar .exit-button {
  width: 34px;
  min-width: 34px;
  padding: 0;
  background: transparent;
  color: #cfc6bf;
  font-size: 17px;
}
.canvas-taskbar .exit-button:hover { background: rgba(255,255,255,.1); color: #fff; }
```

- [ ] **Step 2: Add a focused exit-dialog component**

Add these interfaces and factory beside `TaskBar`:

```ts
export interface ExitDialog {
  element: HTMLElement;
  open(returnFocus?: HTMLElement): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export function createExitDialog(root: HTMLElement | ShadowRoot): ExitDialog {
  const element = document.createElement('section');
  element.className = 'exit-dialog-layer';
  element.hidden = true;
  element.innerHTML = `<div class="exit-dialog" role="dialog" aria-modal="true" aria-labelledby="spotbrief-exit-title" aria-describedby="spotbrief-exit-description">
    <h2 id="spotbrief-exit-title">退出 SpotBrief？</h2>
    <p id="spotbrief-exit-description">本次所有修改将恢复到打开前的状态。</p>
    <div><button data-action="cancel-exit" type="button">取消</button><button class="confirm-exit" data-action="confirm-exit" type="button">退出并恢复</button></div>
  </div>`;
  root.append(element);
  const cancel = element.querySelector<HTMLButtonElement>('[data-action="cancel-exit"]')!;
  const actions = [...element.querySelectorAll<HTMLButtonElement>('button')];
  let returnFocus: HTMLElement | undefined;
  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const index = actions.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.shiftKey ? (index <= 0 ? actions.length - 1 : index - 1) : (index >= actions.length - 1 ? 0 : index + 1);
    event.preventDefault();
    actions[next]!.focus();
  });
  return {
    element,
    open(target) { returnFocus = target; element.hidden = false; cancel.focus(); },
    close() { element.hidden = true; returnFocus?.focus(); },
    isOpen: () => !element.hidden,
    destroy() { element.remove(); }
  };
}
```

- [ ] **Step 3: Style the dialog and focus states**

Use a fixed dimmed layer within the Shadow DOM, a compact 320px surface, a visible destructive action, and the existing orange focus ring. Ensure `[hidden]` sets `display:none` and both actions are at least 40px tall.

- [ ] **Step 4: Run type checking**

Run:

```bash
npm run typecheck
```

Expected: PASS.

### Task 3: Route Button and Escape Through Guarded Destruction

**Files:**
- Modify: `src/bookmarklet/index.ts`

- [ ] **Step 1: Create and destroy the dialog with the runtime**

Import `createExitDialog`, instantiate it beside the editor and taskbar, and call `exitDialog.destroy()` inside controller `destroy()`.

- [ ] **Step 2: Define the dirty-session predicate**

```ts
function hasSessionWork() {
  return selections.length > 0 || changes.list().length > 0 || Boolean(
    form.request.trim() || form.code.trim() || form.screenshotNote.trim() || screenshot
  );
}
```

- [ ] **Step 3: Add one guarded exit path**

Import `type PatchBriefController` from `./types`. Declare `let controller: PatchBriefController` before the function and assign it after listeners are registered:

```ts
function requestExit(trigger?: HTMLElement) {
  if (hasSessionWork()) exitDialog.open(trigger);
  else controller.destroy();
}
```

Use the existing `PatchBriefController` type already declared for `window.__PATCHBRIEF__`; do not add a second cleanup implementation.

- [ ] **Step 4: Update keyboard handling**

Handle Escape before the early return for inputs:

```ts
if (event.key === 'Escape') {
  event.preventDefault();
  if (exitDialog.isOpen()) exitDialog.close();
  else requestExit(keyTarget);
  return;
}
```

Remove the old Escape branch that only cleared selections.

- [ ] **Step 5: Route dialog actions**

Add cases to the root click switch:

```ts
case 'request-exit': requestExit(target); break;
case 'cancel-exit': exitDialog.close(); break;
case 'confirm-exit': controller.destroy(); break;
```

The dialog component's `keydown` listener from Task 2 cycles focus between its two buttons when Tab would leave the dialog.

- [ ] **Step 6: Run the exit tests and verify GREEN**

Run:

```bash
npx playwright test tests/e2e/canvas-editing.spec.ts -g "exit|closes|cancels"
```

Expected: all exit tests pass.

- [ ] **Step 7: Commit runtime behavior**

```bash
git add src/bookmarklet/canvas-editor.ts src/bookmarklet/index.ts src/panel/panel.css tests/e2e/canvas-editing.spec.ts
git commit -m "feat: exit SpotBrief and restore the page"
```

### Task 4: Synchronize the Install-Page Preview

**Files:**
- Modify: `tests/e2e/install-page.spec.ts`
- Modify: `src/install-page/index.html`
- Modify: `src/install-page/install.css`

- [ ] **Step 1: Add a failing preview assertion**

```ts
await expect(page.locator('[data-product-preview] .preview-exit')).toHaveAttribute('aria-label', '关闭 SpotBrief');
```

Run:

```bash
npm run build
npx playwright test tests/e2e/install-page.spec.ts -g "immersive install story"
```

Expected: FAIL because `.preview-exit` does not exist.

- [ ] **Step 2: Add the decorative preview control**

Append after `.generate` in the preview taskbar:

```html
<button class="preview-exit" type="button" aria-label="关闭 SpotBrief">×</button>
```

The preview remains `inert` and `aria-hidden`; the label exists only to keep source intent and automated structure explicit.

- [ ] **Step 3: Style the preview control**

```css
.preview-exit { width:28px; padding:0; background:transparent; color:#aab7b2; font-size:14px; }
```

- [ ] **Step 4: Build and verify GREEN**

Run:

```bash
npm run build
npx playwright test tests/e2e/install-page.spec.ts -g "immersive install story"
```

Expected: PASS.

- [ ] **Step 5: Commit the synchronized preview**

```bash
git add src/install-page/index.html src/install-page/install.css tests/e2e/install-page.spec.ts dist
git commit -m "docs: show SpotBrief exit control on install page"
```

### Task 5: Final Verification and PR Update

**Files:**
- Verify all modified source, tests, and generated `dist/*` files.

- [ ] **Step 1: Run repository verification**

```bash
npm run check
```

Expected: type checking, 63+ unit tests, build, and dist verification pass.

- [ ] **Step 2: Run all browser tests**

```bash
npx playwright test --reporter=dot
```

Expected: 22+ browser tests pass.

- [ ] **Step 3: Inspect the compact taskbar in desktop and mobile viewports**

Confirm that the close control stays immediately after **生成任务书**, does not widen the mobile taskbar beyond the viewport, and the dialog actions remain reachable at 375px width.

- [ ] **Step 4: Review the final diff**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only intended generated/build artifacts remain.

- [ ] **Step 5: Push the existing branch**

```bash
git push origin codex/visual-canvas-editing-pr
```

Expected: existing PR #1 updates without force-push.
