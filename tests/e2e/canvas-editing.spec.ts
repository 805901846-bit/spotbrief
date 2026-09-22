import { expect, test } from '@playwright/test';

test('edits, numbers, resets, and restores one element', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const target = page.locator('#delete-order');
  const originalStyle = await target.getAttribute('style');

  await target.click();
  const host = page.locator('#patchbrief-host');
  await expect(host.locator('.canvas-editor')).toBeVisible();
  await expect(page.locator('[data-change-number]:visible')).toHaveCount(0);

  const radius = host.locator('[data-action="set-radius"]');
  await radius.fill('16');
  await radius.dispatchEvent('change');
  await expect(page.locator('[data-change-number]:visible')).toHaveText('1');
  await expect(target).toHaveCSS('border-radius', '16px');
  await expect(host.locator('[data-change-count]')).toContainText('1 处');

  await host.locator('[data-action="reset-element"]').click();
  await expect(page.locator('[data-change-number]:visible')).toHaveCount(0);
  await expect(host.locator('[data-change-count]')).toContainText('0 处');

  await radius.fill('12');
  await radius.dispatchEvent('change');
  await page.evaluate(() => window.__PATCHBRIEF__?.destroy());
  expect(await target.getAttribute('style')).toBe(originalStyle);
});

test('shift-selects and drags a group as one undoable action', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const first = page.locator('#delete-order');
  const second = page.locator('#secondary');
  await first.click();
  await second.click({ modifiers: ['Shift'] });

  const beforeFirst = await first.boundingBox();
  const beforeSecond = await second.boundingBox();
  const edge = page.locator('.patchbrief-canvas-overlay').first().locator('[data-drag-edge="e"]');
  const box = await edge.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 14);
  await page.mouse.down();
  await page.mouse.move(box!.x + 44, box!.y + 20, { steps: 4 });
  await page.mouse.up();

  const afterFirst = await first.boundingBox();
  const afterSecond = await second.boundingBox();
  expect(Math.abs(afterFirst!.x - beforeFirst!.x)).toBeGreaterThan(20);
  expect(Math.round(afterFirst!.x - beforeFirst!.x)).toBe(Math.round(afterSecond!.x - beforeSecond!.x));
  await page.locator('#patchbrief-host [data-action="undo"]').click();
  expect(Math.abs((await first.boundingBox())!.x - beforeFirst!.x)).toBeLessThan(1);
});

test('resizes, annotates, colors, and renumbers after resetting one location', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const host = page.locator('#patchbrief-host');
  const first = page.locator('#delete-order');
  const second = page.locator('#secondary');
  await first.click();

  const before = await first.boundingBox();
  const handle = page.locator('.patchbrief-canvas-overlay [data-resize-dir="se"]');
  const handleBox = await handle.boundingBox();
  await page.mouse.move(handleBox!.x + 5, handleBox!.y + 5);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + 35, handleBox!.y + 25, { steps: 4 });
  await page.mouse.up();
  expect((await first.boundingBox())!.width).toBeGreaterThan(before!.width + 20);

  await host.locator('[data-action="edit-note"]').click();
  await host.locator('[data-note-input]').fill('改成主操作按钮');
  await host.locator('[data-action="save-note"]').click();
  await host.locator('[data-action="set-color"]').click();
  await host.locator('[data-color="#e66f2c"]').click();
  await expect(first).toHaveCSS('background-color', 'rgb(230, 111, 44)');

  await second.click();
  const radius = host.locator('[data-action="set-radius"]');
  await radius.fill('10');
  await radius.dispatchEvent('change');
  await expect(page.locator('[data-change-number]:visible')).toHaveCount(2);

  await page.locator('[data-change-number]:visible', { hasText: '1' }).click();
  await host.locator('[data-action="reset-element"]').click();
  await expect(page.locator('[data-change-number]:visible')).toHaveCount(1);
  await expect(page.locator('[data-change-number]:visible')).toHaveText('1');
});

test('offers keyboard alternatives for moving and resizing', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const target = page.locator('#delete-order');
  await target.click();
  const before = await target.boundingBox();

  await page.keyboard.press('Alt+ArrowRight');
  expect((await target.boundingBox())!.x).toBeGreaterThanOrEqual(before!.x + 1);

  const eastHandle = page.locator('.patchbrief-canvas-overlay [data-resize-dir="e"]');
  await eastHandle.focus();
  await page.keyboard.press('ArrowRight');
  expect((await target.boundingBox())!.width).toBeGreaterThanOrEqual(before!.width + 1);
});

test('preserves authored transforms and removes temporary size declarations on undo', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const target = page.locator('#delete-order');
  await target.evaluate((element) => {
    element.classList.add('authored-transform');
    const style = document.createElement('style');
    style.textContent = '.authored-transform { transform: rotate(3deg) scale(0.98); }';
    document.head.append(style);
  });
  await target.click();

  await page.keyboard.press('Alt+ArrowRight');
  await expect(target).toHaveCSS('transform', /matrix/);
  expect(await target.evaluate((element) => (element as HTMLElement).style.transform)).toBe('');
  expect(await target.evaluate((element) => (element as HTMLElement).style.translate)).not.toBe('');

  const handle = page.locator('.patchbrief-canvas-overlay [data-resize-dir="e"]');
  const box = await handle.boundingBox();
  await page.mouse.move(box!.x + 4, box!.y + 4);
  await page.mouse.down();
  await page.mouse.move(box!.x + 24, box!.y + 4);
  await page.mouse.up();
  expect(await target.evaluate((element) => (element as HTMLElement).style.width)).not.toBe('');
  await page.locator('#patchbrief-host [data-action="undo"]').click();
  expect(await target.evaluate((element) => (element as HTMLElement).style.width)).toBe('');
  expect(await target.evaluate((element) => (element as HTMLElement).style.height)).toBe('');
});

test('accumulates repeated movement and restores keyboard-resized intrinsic dimensions', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const target = page.locator('#delete-order');
  await target.click();
  const before = await target.boundingBox();

  await page.keyboard.press('Alt+ArrowRight');
  await page.keyboard.press('Alt+ArrowRight');
  expect((await target.boundingBox())!.x).toBeGreaterThanOrEqual(before!.x + 2);

  const eastHandle = page.locator('.patchbrief-canvas-overlay [data-resize-dir="e"]');
  await eastHandle.focus();
  await page.keyboard.press('ArrowRight');
  await page.locator('#patchbrief-host [data-action="undo"]').click();
  expect(await target.evaluate((element) => (element as HTMLElement).style.width)).toBe('');
  expect(await target.evaluate((element) => (element as HTMLElement).style.height)).toBe('');
});

test('undo restores stylesheet-owned colors and radii without inline overrides', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const target = page.locator('#delete-order');
  await target.click();
  const host = page.locator('#patchbrief-host');

  const radius = host.locator('[data-action="set-radius"]');
  await radius.fill('18');
  await radius.dispatchEvent('change');
  await host.locator('[data-action="undo"]').click();
  expect(await target.getAttribute('style')).toBeNull();

  await host.locator('[data-action="set-color"]').click();
  await host.locator('[data-color="#e66f2c"]').click();
  await host.locator('[data-action="undo"]').click();
  expect(await target.getAttribute('style')).toBeNull();
});

test('moves percentage-translated elements without losing their authored position', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const target = page.locator('#delete-order');
  await target.evaluate((element) => { (element as HTMLElement).style.translate = '-50% -50%'; });
  await target.click();
  const before = await target.boundingBox();
  await page.keyboard.press('Alt+ArrowRight');
  const after = await target.boundingBox();
  expect(after!.x - before!.x).toBeGreaterThanOrEqual(0.9);
  expect(await target.evaluate((element) => (element as HTMLElement).style.translate)).toContain('-50%');
});
