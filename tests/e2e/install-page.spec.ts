import { expect, test } from '@playwright/test';

test('uses the available space on a wide desktop without stretching text excessively', async ({ page }) => {
  await page.setViewportSize({ width: 2880, height: 1508 });
  await page.goto('/dist/');
  await expect(page).toHaveTitle(/SpotBrief/);
  await expect(page.locator('header b')).toHaveText('SpotBrief');
  await expect(page.locator('#bookmark')).toHaveText('SpotBrief');
  await expect(page.locator('body')).not.toContainText('PatchBrief');

  const layout = await page.locator('main').evaluate((main) => {
    const hero = main.querySelector<HTMLElement>('.hero');
    const heading = main.querySelector<HTMLElement>('.hero h1');
    if (!hero || !heading) throw new Error('Install page hero is missing');

    return {
      mainWidth: main.getBoundingClientRect().width,
      heroColumns: getComputedStyle(hero).gridTemplateColumns
        .split(' ')
        .map((value) => Number.parseFloat(value)),
      headingWidth: heading.getBoundingClientRect().width,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(layout.mainWidth).toBeGreaterThanOrEqual(1400);
  expect(layout.heroColumns).toHaveLength(2);
  expect(layout.heroColumns[0]!).toBeGreaterThan(layout.heroColumns[1]!);
  expect(layout.headingWidth).toBeLessThanOrEqual(780);
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  await expect(page.locator('#bookmark')).toBeVisible();
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
