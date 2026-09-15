import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getDisplayMedia: async () => new MediaStream() } });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 1280 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 800 });
    HTMLVideoElement.prototype.play = async () => {};
    HTMLCanvasElement.prototype.getContext = (() => ({ drawImage() {} })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = function(callback) { callback(new Blob(['png'], { type: 'image/png' })); };
    URL.createObjectURL = () => 'blob:patchbrief-test';
    URL.revokeObjectURL = () => {};
  });
});

test('captures a dragged rectangle, includes metadata, deletes it, and cancels cleanly', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const host = page.locator('#patchbrief-host');

  await host.locator('[data-action="capture"]').click();
  const layer = page.locator('.patchbrief-capture-layer');
  await expect(layer).toBeVisible();
  await page.mouse.move(100, 120); await page.mouse.down();
  await page.mouse.move(420, 360, { steps: 5 }); await page.mouse.up();

  await expect(host.locator('.screenshot-preview')).toBeVisible();
  await expect(host.locator('.screenshot-meta')).toContainText('320 × 240');
  const screenshotNote = host.locator('[name="screenshot-note"]');
  await expect(screenshotNote).toBeVisible();
  await screenshotNote.fill('重点修改截图左侧卡片的间距');
  await host.locator('[data-action="generate"]').click();
  await expect(host.locator('.preview')).toContainText('## 截图');
  await expect(host.locator('.preview')).toContainText('patchbrief-screenshot-');
  await expect(host.locator('.preview')).toContainText('重点修改截图左侧卡片的间距');
  await expect(host.locator('.preview')).not.toContainText('## 预期结果');

  await host.locator('[data-action="back"]').click();
  await expect(host.locator('[name="screenshot-note"]')).toHaveValue('重点修改截图左侧卡片的间距');

  await host.locator('[data-action="capture"]').click();
  await expect(layer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(layer).toHaveCount(0);
  await expect(host.locator('.panel')).toBeVisible();
  await expect(host.locator('.screenshot-preview')).toBeVisible();
  await expect(host.locator('[name="screenshot-note"]')).toHaveValue('重点修改截图左侧卡片的间距');

  await host.locator('[data-action="capture"]').click();
  await page.mouse.move(130, 140); await page.mouse.down();
  await page.mouse.move(430, 380, { steps: 5 }); await page.mouse.up();
  await expect(host.locator('[name="screenshot-note"]')).toHaveValue('');
  await host.locator('[data-action="delete-screenshot"]').click();
  await expect(host.locator('.screenshot-preview')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});
