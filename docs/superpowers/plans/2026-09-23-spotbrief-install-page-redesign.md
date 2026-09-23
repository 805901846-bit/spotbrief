# SpotBrief Install Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the SpotBrief installation page as an immersive mountain-backed product showcase that keeps bookmarklet installation immediate and explains the real editing workflow and output.

**Architecture:** Keep the current dependency-free HTML, CSS, and TypeScript install surface. Add one locally bundled hero image, replace the page markup with semantic sections and anchor navigation, preserve the existing bookmarklet and AI pairing contracts, and validate the result through Playwright plus responsive visual inspection.

**Tech Stack:** Semantic HTML, native CSS, TypeScript, esbuild, Vitest, Playwright, ImageGen for one original raster hero asset.

---

## File Map

- Create `public/spotbrief-mountain.webp`: original dark misty mountain hero image, optimized for wide desktop cropping.
- Modify `src/install-page/index.html`: semantic navigation, hero installation action, compact SpotBrief preview, usage workflow, effect output, AI configuration, trust details, and FAQ.
- Modify `src/install-page/install.css`: full visual system, responsive layout, focus states, fallback backgrounds, reduced motion, and compact product preview styling.
- Modify `src/install-page/install.ts`: bilingual text synchronization and the existing bookmarklet/AI state labels without changing pairing behavior.
- Modify `scripts/build.mjs`: copy the hero asset into `dist`.
- Modify `scripts/verify-dist.mjs`: require the hero asset in generated output.
- Modify `tests/e2e/install-page.spec.ts`: test installation readiness, new information architecture, responsive behavior, language switching, and AI settings.
- Modify `tests/unit/brand.test.ts`: keep the SpotBrief brand contract aligned with the rebuilt install page.
- Regenerate `dist/index.html`, `dist/install.css`, `dist/install.js`, `dist/spotbrief-mountain.webp`, bookmarklet payload files, and runtime artifacts through `npm run build`.

### Task 1: Lock the New Install Page Contract With Tests

**Files:**
- Modify: `tests/e2e/install-page.spec.ts`
- Modify: `tests/unit/brand.test.ts`

- [ ] **Step 1: Add failing structure and content assertions**

Extend the main install-page test with the exact new anchors and visible outcomes:

```ts
await expect(page.locator('[data-section="hero"]')).toBeVisible();
await expect(page.locator('#bookmark')).toContainText('SpotBrief');
await expect(page.getByRole('heading', { name: '在网页上改，让任务书自己说清楚。' })).toBeVisible();
await expect(page.locator('[data-section="workflow"]')).toContainText('选中');
await expect(page.locator('[data-section="workflow"]')).toContainText('拖拽');
await expect(page.locator('[data-section="effect"]')).toContainText('修改位置 1');
await expect(page.locator('[data-product-preview]')).toContainText('生成任务书');
```

- [ ] **Step 2: Add responsive and accessibility assertions**

Add a mobile viewport test that checks the document width and primary action:

```ts
test('keeps the immersive install page usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dist/index.html');
  await expect(page.locator('#bookmark')).toBeVisible();
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(sizes.scrollWidth).toBe(sizes.clientWidth);
  await expect(page.locator('[data-product-preview]')).toBeVisible();
});
```

Add keyboard focus validation:

```ts
await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
expect(await page.evaluate(() => document.activeElement?.id)).toBe('bookmark');
```

- [ ] **Step 3: Update the brand unit test**

Assert that the install source contains the new primary headline and continues to use the SpotBrief name:

```ts
expect(html).toContain('在网页上改，让任务书自己说清楚。');
expect(html).toContain('SpotBrief');
expect(html).not.toContain('PatchBrief');
```

- [ ] **Step 4: Run the focused tests and confirm they fail**

Run:

```bash
npm test -- --run tests/unit/brand.test.ts
npx playwright test tests/e2e/install-page.spec.ts
```

Expected: the new hero, workflow, effect, and product preview selectors are missing.

- [ ] **Step 5: Commit the failing contract tests**

```bash
git add tests/e2e/install-page.spec.ts tests/unit/brand.test.ts
git commit -m "test: define immersive install page contract"
```

### Task 2: Produce and Bundle the Hero Image

**Files:**
- Create: `public/spotbrief-mountain.webp`
- Modify: `scripts/build.mjs`
- Modify: `scripts/verify-dist.mjs`

- [ ] **Step 1: Generate an original mountain image**

Use the ImageGen skill with this bounded brief:

```text
Create a cinematic, photorealistic wide landscape of a steep mist-covered mountain valley at dawn. Muted charcoal, stone gray, deep forest green, and restrained warm fog. Leave a quiet low-detail area in the upper center for white headline text. No people, buildings, typography, interface, logos, neon, or fantasy elements. 16:10 composition, suitable for a premium developer-tool landing-page hero.
```

Save the selected output as `public/spotbrief-mountain.webp`, targeting approximately 1800 by 1125 pixels and less than 500 KB after optimization.

- [ ] **Step 2: Add the asset to the build**

Extend the asset copy sequence in `scripts/build.mjs`:

```js
await cp('public/spotbrief-mountain.webp', 'dist/spotbrief-mountain.webp');
```

- [ ] **Step 3: Require the asset during dist verification**

Add `spotbrief-mountain.webp` to the verified core file list in `scripts/verify-dist.mjs`:

```js
const required = [
  'index.html',
  'install.css',
  'install.js',
  'favicon.svg',
  'preview.svg',
  'spotbrief-mountain.webp',
];
```

- [ ] **Step 4: Build and verify the asset pipeline**

Run:

```bash
npm run build
npm run verify
```

Expected: build completes and verification reports the additional core asset without missing-file errors.

- [ ] **Step 5: Commit the local hero asset pipeline**

```bash
git add public/spotbrief-mountain.webp scripts/build.mjs scripts/verify-dist.mjs dist/spotbrief-mountain.webp
git commit -m "build: bundle install page mountain artwork"
```

### Task 3: Rebuild the Semantic Page Structure

**Files:**
- Modify: `src/install-page/index.html`

- [ ] **Step 1: Replace the header and hero markup**

Use a single navigation landmark and keep `#bookmark`, `#status`, `#language`, and `#ai-settings` unchanged because the install script and tests depend on them:

```html
<header class="site-header">
  <a class="wordmark" href="#top" aria-label="SpotBrief 首页">SpotBrief</a>
  <nav aria-label="页面导航">
    <a href="#workflow">如何使用</a>
    <a href="#effect">操作效果</a>
    <a href="#privacy">隐私</a>
  </nav>
  <div class="header-actions">
    <button id="language" type="button">EN</button>
    <a class="header-install" href="#install">安装到书签栏</a>
  </div>
</header>
<main id="top">
  <section class="hero" data-section="hero">
    <div class="hero-copy">
      <h1 data-zh="在网页上改，让任务书自己说清楚。" data-en="Edit on the page. Let the brief explain itself.">在网页上改，让任务书自己说清楚。</h1>
      <p data-zh="选中、拖拽、调整样式，SpotBrief 将每一处变更整理成可交付的前端任务书。" data-en="Select, drag, and style elements. SpotBrief turns every change into a clear frontend brief.">选中、拖拽、调整样式，SpotBrief 将每一处变更整理成可交付的前端任务书。</p>
      <div class="installer" id="install">
        <span id="status" role="status">正在准备书签</span>
        <a id="bookmark" draggable="false" aria-disabled="true">拖动 SpotBrief 到书签栏</a>
        <em>Chrome / Edge：Ctrl/Cmd + Shift + B</em>
      </div>
    </div>
    <div class="product-preview" data-product-preview aria-label="SpotBrief 操作效果预览">
      <!-- compact selected element, editor controls, numbered marker, and task bar -->
    </div>
  </section>
```

- [ ] **Step 2: Add the workflow and effect sections**

Create `#workflow` with six verb-led items and `#effect` with a static before/after sample plus generated brief output. Use semantic lists and headings; do not use numbered decorative eyebrows.

```html
<section id="workflow" class="workflow" data-section="workflow">
  <h2>选中元件，直接表达修改意图</h2>
  <p>无需描述位置和层级。可视化操作与修改说明会一起进入任务书。</p>
  <ol class="workflow-list">
    <li><strong>选中</strong><span>点击元素，打开轻量编辑器</span></li>
    <li><strong>调整</strong><span>设置圆角、颜色和修改说明</span></li>
    <li><strong>拖拽</strong><span>移动、拉伸和吸附，Alt 临时关闭吸附</span></li>
    <li><strong>多选</strong><span>Shift + 点击后整组移动或批量说明</span></li>
    <li><strong>检查</strong><span>编号定位变更，撤销、重做或单项重置</span></li>
    <li><strong>生成</strong><span>记录前后差异，生成结构化任务书</span></li>
  </ol>
</section>
<section id="effect" class="effect" data-section="effect">
  <h2>操作结果直接进入任务书</h2>
  <div class="effect-layout">
    <figure class="before-after">
      <div><figcaption>操作前</figcaption><button type="button">提交</button></div>
      <span aria-hidden="true">-&gt;</span>
      <div class="after"><figcaption>操作后</figcaption><button type="button">提交</button><b>1</b></div>
    </figure>
    <pre class="brief-output"><strong>修改位置 1</strong>
Selector: #primary-action
圆角: 8px -&gt; 16px
填充颜色: #334155 -&gt; #0d8a80
修改说明: 改成页面主操作按钮</pre>
  </div>
</section>
```

- [ ] **Step 3: Preserve AI settings and trust content**

Move the existing `#ai-settings` form below the main usage story without changing its field names or types. Keep privacy, browser support, FAQ, and footer content factual. Do not add testimonials, metrics, pricing, or unimplemented claims.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
npm test -- --run tests/unit/brand.test.ts
npx playwright test tests/e2e/install-page.spec.ts
```

Expected: structure assertions pass; layout assertions may still fail until CSS is implemented.

- [ ] **Step 5: Commit semantic page structure**

```bash
git add src/install-page/index.html
git commit -m "feat: restructure SpotBrief install experience"
```

### Task 4: Implement the Ascera-Inspired Visual System

**Files:**
- Modify: `src/install-page/install.css`

- [ ] **Step 1: Define one coherent token system**

Replace the warm paper palette with semantic tokens:

```css
:root {
  color-scheme: light;
  --page: #eef3f1;
  --surface: #f8fbfa;
  --surface-glass: rgb(248 251 250 / .88);
  --ink: #15211e;
  --muted: #5f716c;
  --line: #cedbd7;
  --accent: #0d8a80;
  --accent-strong: #0a665f;
  --focus: #075f58;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

- [ ] **Step 2: Build the full-bleed hero and glass navigation**

Use the bundled image with a readable fallback and overlay:

```css
.hero {
  position: relative;
  min-height: min(760px, calc(100dvh - 24px));
  padding: 132px 24px 210px;
  background:
    linear-gradient(180deg, rgb(7 16 14 / .22), rgb(7 16 14 / .78)),
    url('./spotbrief-mountain.webp') center / cover no-repeat,
    #24332f;
}
.site-header {
  position: absolute;
  inset: 20px 20px auto;
  z-index: 2;
  min-height: 56px;
  border: 1px solid rgb(255 255 255 / .28);
  border-radius: var(--radius-md);
  background: var(--surface-glass);
  backdrop-filter: blur(18px) saturate(120%);
}
```

Keep the headline to two lines at desktop and ensure the primary installation link remains above the fold.

- [ ] **Step 3: Build the compact real product preview**

Style the preview as a restrained light interface anchored near the bottom of the mountain scene. Include only controls that exist in the product: radius, color, note, reset, numbered marker, change count, undo, redo, task settings, and generate.

The preview must be less than 190px tall on desktop, must not use a fake dashboard, and must collapse cleanly under 640px.

- [ ] **Step 4: Style workflow, output, AI, and trust sections**

Use open layout, sparse dividers, and one contained AI form. Avoid three identical feature cards. Preserve visible labels and 44px minimum touch targets.

- [ ] **Step 5: Add interaction, responsive, and preference states**

Implement:

```css
:where(a, button, input, summary):focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
}
@media (max-width: 760px) {
  .site-header nav { display: none; }
  .hero { min-height: 720px; padding: 112px 18px 210px; }
  .workflow-list, .effect-layout, .ai-card { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .site-header, .product-preview { background: #f8fbfa; backdrop-filter: none; }
}
```

- [ ] **Step 6: Run focused responsive tests**

Run:

```bash
npx playwright test tests/e2e/install-page.spec.ts
```

Expected: desktop and mobile tests pass with no horizontal overflow.

- [ ] **Step 7: Commit the visual system**

```bash
git add src/install-page/install.css tests/e2e/install-page.spec.ts
git commit -m "feat: style immersive SpotBrief install page"
```

### Task 5: Preserve Bilingual and Installation Behavior

**Files:**
- Modify: `src/install-page/install.ts`
- Modify: `tests/e2e/install-page.spec.ts`

- [ ] **Step 1: Add a failing language coverage test**

```ts
await page.locator('#language').click();
await expect(page.getByRole('heading', { name: 'Edit on the page. Let the brief explain itself.' })).toBeVisible();
await expect(page.locator('#bookmark')).toContainText('Drag SpotBrief to your bookmarks bar');
await expect(page.locator('[data-section="workflow"]')).toContainText('Select');
```

- [ ] **Step 2: Move all translatable visible strings to data attributes**

Give bilingual content `data-zh` and `data-en` values for every navigation label, installer hint, workflow label and description, trust sentence, FAQ heading and answer, AI section heading, AI explanation, field label, submit button, and footer sentence. Do not translate user-entered values.

- [ ] **Step 3: Update the language switcher**

Keep the current selector-based implementation but synchronize accessibility state:

```ts
const languageButton = document.querySelector<HTMLButtonElement>('#language')!;
languageButton.addEventListener('click', () => {
  language = language === 'zh' ? 'en' : 'zh';
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll<HTMLElement>('[data-zh][data-en]').forEach((element) => {
    element.textContent = element.dataset[language]!;
  });
  languageButton.textContent = language === 'zh' ? 'EN' : '中文';
  languageButton.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换到中文');
  prepare();
});
```

- [ ] **Step 4: Run installation, language, and AI tests**

Run:

```bash
npx playwright test tests/e2e/install-page.spec.ts
```

Expected: bookmarklet readiness, language switching, and AI settings persistence all pass.

- [ ] **Step 5: Commit behavior compatibility**

```bash
git add src/install-page/index.html src/install-page/install.ts tests/e2e/install-page.spec.ts
git commit -m "feat: localize redesigned install flow"
```

### Task 6: Build, Audit, and Polish the Final Page

**Files:**
- Modify as findings require: `src/install-page/index.html`
- Modify as findings require: `src/install-page/install.css`
- Modify as findings require: `src/install-page/install.ts`
- Regenerate: `dist/**`

- [ ] **Step 1: Build the production output**

Run:

```bash
npm run build
```

Expected: SpotBrief runtime, install page, local mountain asset, and payload chunks are generated successfully.

- [ ] **Step 2: Run ui-ux-pro-max checks**

Review the production page against these observable requirements from ui-ux-pro-max:

- WCAG AA text contrast and 2px visible focus rings.
- Complete keyboard navigation in visual order.
- No horizontal scrolling at 375px, 768px, 1024px, or 1440px.
- Minimum 44px interactive targets on touch layouts.
- Reduced motion and reduced transparency fallbacks.
- Stable hero image dimensions and no layout shift.

Fix all failures in one bounded pass.

- [ ] **Step 3: Run the Impeccable final audit**

Run Impeccable context once for `src/install-page/index.html`, load its audit and polish references, and inspect desktop and mobile production renders together. Check visual hierarchy, copy, layout rhythm, real interaction states, asset treatment, and all anti-pattern bans. Fix all findings in one batch, then perform at most one confirmation pass.

- [ ] **Step 4: Run the complete verification suite**

Run:

```bash
npm run check
npm run test:e2e
git diff --check
```

Expected:

- TypeScript emits no errors.
- All Vitest suites pass.
- All Playwright suites pass.
- Dist verification includes the mountain asset and payload chunks.
- `git diff --check` prints no output.

- [ ] **Step 5: Commit the audited production page**

```bash
git add src/install-page public scripts tests dist
git commit -m "feat: ship immersive SpotBrief install page"
```

- [ ] **Step 6: Update the existing Pull Request**

Push `codex/visual-canvas-editing-pr` and update PR #1 with a summary of the installation-page redesign and the final unit/browser test counts. Preserve the worktree for review feedback.
