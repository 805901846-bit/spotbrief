import { expect, test } from '@playwright/test';

test('drags, remembers, and resets the desktop panel position', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/tests/fixtures/basic.html');
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => { window.__PATCHBRIEF__?.destroy(); });
  await page.addScriptTag({ url: '/dist/patchbrief.runtime.js' });

  const host = page.locator('#patchbrief-host');
  await host.locator('[data-action="collapse"]').click();
  const top = host.locator('.top');
  const before = await host.locator('.panel').boundingBox();
  const handle = await top.boundingBox();
  expect(before).not.toBeNull(); expect(handle).not.toBeNull();

  await page.mouse.move(handle!.x + 70, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle!.x - 180, handle!.y + 150, { steps: 8 });
  await page.mouse.up();

  const moved = await host.locator('.panel').boundingBox();
  expect(moved!.x).toBeLessThan(before!.x - 100);
  expect(moved!.y).toBeGreaterThan(before!.y + 100);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('patchbrief:preferences') || '{}').panelPosition)).toBeTruthy();

  await page.evaluate(() => { window.__PATCHBRIEF__?.destroy(); });
  await page.addScriptTag({ url: '/dist/patchbrief.runtime.js' });
  const restored = await page.locator('#patchbrief-host').locator('.panel').boundingBox();
  expect(Math.abs(restored!.x - moved!.x)).toBeLessThan(2);
  expect(Math.abs(restored!.y - moved!.y)).toBeLessThan(2);

  await page.locator('#patchbrief-host').locator('[data-action="reset-position"]').click();
  const reset = await page.locator('#patchbrief-host').locator('.panel').boundingBox();
  expect(reset!.x).toBeGreaterThan(850);
  expect(reset!.y).toBeLessThan(20);
});
