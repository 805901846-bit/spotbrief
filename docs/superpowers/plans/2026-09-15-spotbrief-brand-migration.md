# SpotBrief Brand Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the public SpotBrief product to SpotBrief 0.2.0 while preserving the historical internal namespace and saved browser settings.

**Architecture:** Separate public brand constants from compatibility identifiers. Change only user-visible strings, version metadata, public download names, and documentation; keep `__PATCHBRIEF__`, `patchbrief:*`, `patchbrief-` DOM/CSS identifiers, message protocol names, and the compatibility runtime filename. Lock the boundary with unit, build, and browser tests.

**Tech Stack:** TypeScript, native DOM, Vitest, Playwright, esbuild, Node.js build scripts.

---

### Task 1: Brand constants, version, and compatibility contract

**Files:**
- Modify: `src/bookmarklet/types.ts`
- Create: `tests/unit/brand.test.ts`
- Modify: `tests/unit/storage.test.ts`

- [ ] **Step 1: Write failing brand tests**

```ts
import { describe, expect, it } from 'vitest';
import { BRAND_NAME, VERSION } from '../../src/bookmarklet/types';

describe('SpotBrief brand contract', () => {
  it('uses the public SpotBrief 0.2.0 identity', () => {
    expect(BRAND_NAME).toBe('SpotBrief');
    expect(VERSION).toBe('0.2.0');
  });
});
```

Retain the storage test that reads `patchbrief:preferences`, proving the historical key still works.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run tests/unit/brand.test.ts tests/unit/storage.test.ts`

Expected: FAIL because `BRAND_NAME` is missing and `VERSION` is still `0.1.0`.

- [ ] **Step 3: Add public constants without renaming internals**

```ts
export const BRAND_NAME = 'SpotBrief';
export const VERSION = '0.2.0';
```

Do not change `SpotBriefController`, `__PATCHBRIEF__`, `__PATCHBRIEF_AI_BRIDGE__`, storage keys, data attributes, DOM ids, CSS classes, or message names.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm vitest run tests/unit/brand.test.ts tests/unit/storage.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bookmarklet/types.ts tests/unit/brand.test.ts tests/unit/storage.test.ts
git commit -m "feat: establish SpotBrief public identity"
```

### Task 2: Runtime and installation-page public branding

**Files:**
- Modify: `src/bookmarklet/index.ts`
- Modify: `src/bookmarklet/ai-bridge.ts`
- Modify: `src/install-page/index.html`
- Modify: `src/install-page/install.ts`
- Modify: `public/preview.svg`
- Modify: `tests/e2e/install-page.spec.ts`
- Modify: `tests/e2e/selection.spec.ts`
- Modify: `tests/e2e/screenshot.spec.ts`

- [ ] **Step 1: Add failing browser assertions**

Installation-page assertions:

```ts
await expect(page).toHaveTitle(/SpotBrief/);
await expect(page.locator('header b')).toHaveText('SpotBrief');
await expect(page.locator('#bookmark')).toHaveText('SpotBrief');
await expect(page.locator('body')).not.toContainText('SpotBrief');
```

Runtime assertions:

```ts
await expect(page.locator('#patchbrief-host').locator('.brand')).toHaveText('SpotBrief');
expect(await page.evaluate(() => window.__PATCHBRIEF__?.version)).toBe('0.2.0');
```

Screenshot assertion: generated filename contains `spotbrief-screenshot-`.

- [ ] **Step 2: Build the old source and verify RED**

Run: `pnpm build && pnpm playwright test tests/e2e/install-page.spec.ts tests/e2e/selection.spec.ts tests/e2e/screenshot.spec.ts --project=chromium`

Expected: FAIL on the old public name, old version, and old screenshot filename.

- [ ] **Step 3: Update public runtime strings**

Import and render `BRAND_NAME` in the panel. Change user-visible AI bridge errors from SpotBrief to SpotBrief. Change screenshot and Markdown download names to:

```ts
`spotbrief-screenshot-${Date.now()}.png`
`spotbrief-${Date.now()}.md`
```

Keep all compatibility identifiers unchanged.

- [ ] **Step 4: Update installation-page strings**

Replace public SpotBrief text in `src/install-page/index.html`, `src/install-page/install.ts`, and `public/preview.svg` with SpotBrief. Use `0.2.0` in visible version labels and payload cache query parameters. Keep AI bridge message types and storage keys unchanged.

- [ ] **Step 5: Verify focused browser tests GREEN**

Run: `pnpm build && pnpm playwright test tests/e2e/install-page.spec.ts tests/e2e/selection.spec.ts tests/e2e/screenshot.spec.ts --project=chromium`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/bookmarklet src/install-page public/preview.svg tests/e2e
git commit -m "feat: rename public UI to SpotBrief"
```

### Task 3: Build artifacts and repository metadata

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `scripts/build.mjs`
- Modify: `scripts/verify-dist.mjs`
- Modify: `.github/workflows/test.yml`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `tests/unit/smoke.test.ts`

- [ ] **Step 1: Add failing build-contract assertions**

Update `tests/unit/smoke.test.ts` to expect package name `spotbrief`, version `0.2.0`, and build-script references to `spotbrief-bookmarklet.txt` while confirming `patchbrief.runtime.js` remains present for compatibility.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run tests/unit/smoke.test.ts`

Expected: FAIL on old package metadata and bookmarklet filename.

- [ ] **Step 3: Update build metadata**

Set package and lockfile importer metadata to SpotBrief 0.2.0. Generate `dist/spotbrief-bookmarklet.txt`; remove obsolete `dist/bookmarklet.txt` during build so stale output cannot pass verification. Keep `dist/patchbrief.runtime.js` and update build logs to say SpotBrief.

- [ ] **Step 4: Update dist verification and workflows**

Require `spotbrief-bookmarklet.txt`, manifest version `0.2.0`, runtime syntax validity, payload reconstruction, relative Pages paths, absence of source absolute paths, and the existing size budget. Keep CI commands unchanged unless a filename is explicitly referenced.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm vitest run tests/unit/smoke.test.ts && pnpm build && pnpm verify`

Expected: PASS; `dist/spotbrief-bookmarklet.txt` exists, obsolete `dist/bookmarklet.txt` does not, and manifest is `0.2.0`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml scripts .github tests/unit/smoke.test.ts dist
git commit -m "build: publish SpotBrief 0.2.0 artifacts"
```

### Task 4: Documentation and architecture asset migration

**Files:**
- Rename: `docs/guides/SpotBrief-零基础使用说明书.md` → `docs/guides/SpotBrief-零基础使用说明书.md`
- Rename: `docs/interview/SpotBrief-AI产品经理-VibeCoding面试辅导.md` → `docs/interview/SpotBrief-AI产品经理-VibeCoding面试辅导.md`
- Rename: `docs/architecture/spotbrief-architecture.html` → `docs/architecture/spotbrief-architecture.html`
- Rename: `docs/architecture/spotbrief.architecture.json` → `docs/architecture/spotbrief.architecture.json`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`
- Modify: `NOTICE`
- Modify: `LICENSE`
- Modify: `docs/product/feature-backlog.md`
- Modify: active documents under `docs/superpowers/`

- [ ] **Step 1: Rename current user-facing documents and architecture sources**

Use `git mv` for the two Markdown deliverables and the primary HTML/JSON architecture files. Rename architecture visual-check files to the same `spotbrief-architecture` stem and update their internal links. Do not rewrite Git history.

- [ ] **Step 2: Replace public brand prose**

Update current documentation to SpotBrief 0.2.0. In the migration design only, retain the phrase `SpotBrief（原 SpotBrief）`. Preserve literal compatibility identifiers such as ``window.__PATCHBRIEF__`` and ``patchbrief:preferences`` and label them as historical internal APIs.

- [ ] **Step 3: Verify documentation consistency**

Run:

```bash
rg -n 'SpotBrief' README.md CONTRIBUTING.md SECURITY.md NOTICE LICENSE docs
```

Expected: matches exist only in the migration specification, historical compatibility identifiers, and code snippets that intentionally document the compatibility boundary; no page title, product description, guide title, interview answer, or architecture title uses SpotBrief as the current brand.

- [ ] **Step 4: Run complete verification**

Run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm verify
pnpm exec playwright test --project=chromium
git diff --check
```

Expected: every command exits 0; all unit and E2E tests pass; runtime stays below 180KB.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: complete SpotBrief brand migration"
```
