import { expect, test } from '@playwright/test';

test('keeps the compact task bar inside desktop and mobile viewports', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/tests/fixtures/basic.html');
  const taskBar = page.locator('#patchbrief-host .canvas-taskbar');
  const desktop = await taskBar.boundingBox();
  expect(desktop).not.toBeNull();
  expect(desktop!.x).toBeGreaterThanOrEqual(0);
  expect(desktop!.x + desktop!.width).toBeLessThanOrEqual(1280);

  await page.setViewportSize({ width: 390, height: 760 });
  const mobile = await taskBar.boundingBox();
  expect(mobile).not.toBeNull();
  expect(mobile!.x).toBeGreaterThanOrEqual(0);
  expect(mobile!.x + mobile!.width).toBeLessThanOrEqual(390);
  expect(mobile!.y + mobile!.height).toBeLessThanOrEqual(760);
});
