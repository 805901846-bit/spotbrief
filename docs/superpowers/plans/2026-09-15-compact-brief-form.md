# Compact Brief Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a screenshot-specific instruction field, default-collapsed code and constraint sections, five preselected safe constraints, and remove the expected-result field from the current SpotBrief workflow.

**Architecture:** Introduce a small form-state module so panel rerenders preserve user input independently of DOM nodes. Keep screenshot binary state in the bookmarklet runtime, store only the screenshot note in form state, and render code/constraint sections with native `details` elements whose open state stays in memory for the current run. The Markdown generator stops emitting legacy expected-result data.

**Tech Stack:** TypeScript, native DOM and Shadow DOM, Vitest with jsdom, Playwright, esbuild.

---

### Task 1: Form draft and safe default constraints

**Files:**
- Create: `src/bookmarklet/form-state.ts`
- Create: `tests/unit/form-state.test.ts`
- Modify: `src/bookmarklet/index.ts`

- [ ] **Step 1: Write the failing form-state tests**

```ts
import { describe, expect, it } from 'vitest';
import { createFormState, SAFE_DEFAULT_CONSTRAINTS } from '../../src/bookmarklet/form-state';

describe('form state', () => {
  it('starts with the five safe constraints selected', () => {
    expect(createFormState().constraints).toEqual(SAFE_DEFAULT_CONSTRAINTS);
  });

  it('keeps code and constraint sections collapsed initially', () => {
    expect(createFormState()).toMatchObject({ codeOpen: false, constraintsOpen: false });
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `pnpm vitest run tests/unit/form-state.test.ts`

Expected: FAIL because `src/bookmarklet/form-state.ts` does not exist.

- [ ] **Step 3: Add the minimal state module**

```ts
export const SAFE_DEFAULT_CONSTRAINTS = [
  '不要安装新依赖',
  '不修改无关文件',
  '保持响应式兼容',
  '保持可访问性',
  '修改后运行检查',
] as const;

export interface FormState {
  request: string;
  code: string;
  language: string;
  constraints: string[];
  screenshotNote: string;
  codeOpen: boolean;
  constraintsOpen: boolean;
}

export function createFormState(savedDefaults?: string[]): FormState {
  return {
    request: '', code: '', language: 'TSX', screenshotNote: '',
    constraints: savedDefaults?.length ? [...savedDefaults] : [...SAFE_DEFAULT_CONSTRAINTS],
    codeOpen: false, constraintsOpen: false,
  };
}
```

- [ ] **Step 4: Connect form state to the bookmarklet draft**

In `src/bookmarklet/index.ts`, initialize one `formState` and change `draft()` to read `request`, `code`, `language`, `constraints`, and `screenshotNote` from it instead of querying disposable DOM fields. Set screenshot metadata as:

```ts
screenshot: screenshot ? {
  filename: screenshot.filename,
  description: formState.screenshotNote.trim() ||
    `用户手动框选的页面区域（${screenshot.width} × ${screenshot.height}）`,
} : undefined
```

Update the delegated `input` and `change` handlers so every field writes through to `formState` before a rerender can occur.

- [ ] **Step 5: Run focused tests**

Run: `pnpm vitest run tests/unit/form-state.test.ts tests/unit/prompt.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the state layer**

```bash
git add src/bookmarklet/form-state.ts src/bookmarklet/index.ts tests/unit/form-state.test.ts
git commit -m "feat: preserve compact brief form state"
```

### Task 2: Screenshot instruction and Markdown behavior

**Files:**
- Modify: `tests/unit/prompt.test.ts`
- Modify: `src/bookmarklet/prompt.ts`
- Modify: `src/bookmarklet/index.ts`

- [ ] **Step 1: Add failing Markdown tests**

Add assertions that a screenshot description appears under `## 截图`, an empty description does not produce an empty bullet, and a legacy `expectedResult` value never produces `## 预期结果`.

```ts
const markdown = generateBriefMarkdown({
  ...baseDraft,
  screenshot: { filename: 'capture.png', description: '重点修改左侧卡片间距' },
  expectedResult: 'legacy value',
});
expect(markdown).toContain('重点修改左侧卡片间距');
expect(markdown).not.toContain('## 预期结果');
```

- [ ] **Step 2: Run the prompt test and verify RED**

Run: `pnpm vitest run tests/unit/prompt.test.ts`

Expected: FAIL because the generator still emits the expected-result section.

- [ ] **Step 3: Remove expected-result output**

Delete the expected-result section assembly from `generateBriefMarkdown`. Keep `BriefDraft.expectedResult?` temporarily for compatibility, but ignore it during Markdown generation.

- [ ] **Step 4: Render and maintain screenshot note**

In `renderScreenshotSlot()`, render this textarea only when a screenshot exists:

```html
<label class="screenshot-note-label" for="patchbrief-screenshot-note">截图说明</label>
<textarea id="patchbrief-screenshot-note" name="screenshot-note"
  placeholder="说明截图中希望修改的位置或问题"></textarea>
```

Restore its escaped value from `formState.screenshotNote`. Clear that note only after a successful replacement screenshot or explicit screenshot deletion; preserve it when capture permission is cancelled or capture fails.

- [ ] **Step 5: Run prompt and screenshot unit tests**

Run: `pnpm vitest run tests/unit/prompt.test.ts tests/unit/screenshot.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit screenshot-note behavior**

```bash
git add src/bookmarklet/index.ts src/bookmarklet/prompt.ts tests/unit/prompt.test.ts
git commit -m "feat: add screenshot-specific instructions"
```

### Task 3: Collapsible sections and removal of expected result

**Files:**
- Modify: `src/bookmarklet/index.ts`
- Modify: `src/panel/panel.css`
- Modify: `tests/e2e/panel.spec.ts`

- [ ] **Step 1: Add a failing panel E2E test**

Test these visible behaviors after launching SpotBrief:

```ts
await expect(shadow.locator('details[data-section="code"]')).not.toHaveAttribute('open', '');
await expect(shadow.locator('details[data-section="constraints"]')).not.toHaveAttribute('open', '');
await expect(shadow.locator('[name="expected"]')).toHaveCount(0);
await expect(shadow.locator('[name="constraint"]:checked')).toHaveCount(5);
await expect(shadow.locator('[data-constraint-count]')).toContainText('已选 5 项');
```

Then expand code, enter indented code, collapse and reopen it, and assert the value is unchanged. Repeat the state-preservation assertion after opening and closing constraints.

- [ ] **Step 2: Run the focused E2E test and verify RED**

Run: `pnpm playwright test tests/e2e/panel.spec.ts --project=chromium`

Expected: FAIL because the current sections are always expanded, defaults are unchecked, and expected-result input exists.

- [ ] **Step 3: Render native collapsible sections**

Replace the current code and constraint blocks in `render()` with:

```html
<details class="form-section" data-section="code">
  <summary><span>相关代码</span><span class="section-summary">${formState.code ? `${formState.code.length} 字符` : '可选'}</span></summary>
  <div class="section-content">
    <div class="row">
      <select name="language">${languages.map(value => `<option>${value}</option>`).join('')}</select>
      <span class="count">${formState.code.length} chars</span>
      <button class="icon" data-action="clear-code">清空</button>
    </div>
    <textarea class="code" name="code" spellcheck="false">${escapeHtml(formState.code)}</textarea>
  </div>
</details>
<details class="form-section" data-section="constraints">
  <summary><span>修改约束</span><span class="section-summary" data-constraint-count>已选 ${formState.constraints.length} 项</span></summary>
  <div class="section-content checks">
    ${constraints.map(value => `<label><input type="checkbox" name="constraint"
      value="${value}" ${formState.constraints.includes(value) ? 'checked' : ''}> ${value}</label>`).join('')}
  </div>
</details>
```

Apply `open` from `formState.codeOpen` and `formState.constraintsOpen`. Listen for delegated `toggle` events and update those two booleans. Render checkboxes with `checked` when their value is present in `formState.constraints`. Remove the expected-result label and textarea completely.

- [ ] **Step 4: Add compact section styles**

Add styles for `.form-section`, `summary`, `.section-summary`, and the expanded content. Preserve the warm paper palette, visible keyboard focus, 44px summary hit target, and existing mobile drawer width.

- [ ] **Step 5: Run the panel E2E test and verify GREEN**

Run: `pnpm playwright test tests/e2e/panel.spec.ts --project=chromium`

Expected: PASS.

- [ ] **Step 6: Commit compact section UI**

```bash
git add src/bookmarklet/index.ts src/panel/panel.css tests/e2e/panel.spec.ts
git commit -m "feat: collapse optional brief sections"
```

### Task 4: Screenshot workflow regression and documentation

**Files:**
- Modify: `tests/e2e/screenshot.spec.ts`
- Modify: `README.md`
- Modify: `docs/guides/SpotBrief-零基础使用说明书.md`

- [ ] **Step 1: Extend screenshot E2E coverage**

After the screenshot preview appears, assert the screenshot-note textarea exists, fill it, generate the brief, and assert the note appears. Return to editing, replace the screenshot successfully, and assert the old note is empty. Start another replacement and cancel it with Escape; assert the current screenshot and its note remain.

- [ ] **Step 2: Run screenshot E2E and verify RED before implementation completion**

Run: `pnpm playwright test tests/e2e/screenshot.spec.ts --project=chromium`

Expected: FAIL until screenshot-note lifecycle and rerender preservation are complete.

- [ ] **Step 3: Finish lifecycle behavior and run GREEN**

Make only the minimal runtime adjustments required by the failing assertions, then rerun the same command.

Expected: PASS.

- [ ] **Step 4: Update user documentation**

Document that screenshot instructions appear directly below the preview, code and constraints start collapsed, five safe constraints start selected, and “预期结果” has been removed because its purpose is covered by the global, element-level, and screenshot instructions.

- [ ] **Step 5: Run complete verification**

Run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm verify
pnpm test:e2e -- --project=chromium
git diff --check
```

Expected: all commands exit 0; build remains under the 180KB preferred runtime budget.

- [ ] **Step 6: Commit documentation and regression coverage**

```bash
git add README.md docs/guides/SpotBrief-零基础使用说明书.md tests/e2e/screenshot.spec.ts src/bookmarklet/index.ts
git commit -m "test: cover compact screenshot brief workflow"
```
