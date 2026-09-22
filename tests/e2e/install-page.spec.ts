import { expect, test } from '@playwright/test';

test('presents the immersive install story and real editing workflow', async ({ page }) => {
  await page.setViewportSize({ width: 2880, height: 1508 });
  await page.goto('/dist/');
  await expect(page).toHaveTitle(/SpotBrief/);
  await expect(page.locator('[data-section="hero"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: '在网页上改，让任务书自己说清楚。' })).toBeVisible();
  await expect(page.locator('#bookmark')).toContainText('SpotBrief');
  await expect(page.locator('body')).not.toContainText('PatchBrief');
  await expect(page.locator('[data-section="workflow"]')).toContainText('选中');
  await expect(page.locator('[data-section="workflow"]')).toContainText('拖拽');
  await expect(page.locator('[data-section="effect"]')).toContainText('修改位置 1');
  await expect(page.locator('[data-product-preview]')).toContainText('生成任务书');
  await expect(page.locator('[data-product-preview] .preview-exit')).toHaveAttribute('aria-label', '关闭 SpotBrief');

  const layout = await page.locator('main').evaluate((main) => {
    const hero = main.querySelector<HTMLElement>('.hero');
    const heading = main.querySelector<HTMLElement>('.hero h1');
    if (!hero || !heading) throw new Error('Install page hero is missing');

    return {
      heroHeight: hero.getBoundingClientRect().height,
      headingWidth: heading.getBoundingClientRect().width,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(layout.heroHeight).toBeGreaterThanOrEqual(760);
  expect(layout.headingWidth).toBeLessThanOrEqual(780);
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  await expect(page.locator('#bookmark')).toBeVisible();
});

test('keeps the immersive install page usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dist/index.html');
  await expect(page.locator('#bookmark')).toBeVisible();
  await expect(page.locator('[data-product-preview]')).toBeVisible();
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(sizes.scrollWidth).toBe(sizes.clientWidth);

  await page.locator('#bookmark').focus();
  await expect(page.locator('#bookmark')).toBeFocused();
});

test('switches the core install story to English', async ({ page }) => {
  await page.goto('/dist/');
  await page.locator('#language').click();
  await expect(page.getByRole('heading', { name: 'Edit on the page. Let the brief explain itself.' })).toBeVisible();
  await expect(page.locator('[data-section="workflow"]')).toContainText('Select');
  await expect(page.locator('[data-section="effect"]')).toContainText('Submit');
  await expect(page.locator('[data-section="effect"]')).not.toContainText('提交');
  await expect(page.locator('nav')).toHaveAttribute('aria-label', 'Page navigation');
  await expect(page.locator('.brief-output')).toHaveAttribute('aria-label', 'Generated brief example');
  await expect(page.locator('.before-after button')).toHaveCount(0);
  await expect(page.locator('#bookmark')).toContainText('SpotBrief');
});

test('saves optional AI settings locally and keeps the API key out of the bookmark', async ({ page }) => {
  await page.goto('/dist/');
  await page.locator('[name="baseUrl"]').fill('https://api.example.com/v1/');
  await page.locator('[name="model"]').fill('small-model');
  await page.locator('[name="apiKey"]').fill('sk-browser-only');
  await page.locator('#ai-settings button').click();

  await expect(page.locator('#ai-status')).toContainText('已保存在此浏览器');
  const saved = await page.evaluate(() => localStorage.getItem('patchbrief:ai-settings'));
  expect(saved).toContain('sk-browser-only');
  await expect.poll(() => page.locator('#bookmark').getAttribute('href')).not.toContain('sk-browser-only');
});
