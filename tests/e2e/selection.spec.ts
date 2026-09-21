import { test, expect } from '@playwright/test';
test('selects elements, generates a brief, and destroys cleanly', async ({page}) => {
  await page.goto('/tests/fixtures/basic.html');
  await expect(page.locator('#patchbrief-host')).toHaveCount(1);
  await page.locator('#delete-order').hover(); await expect(page.locator('.patchbrief-hover-overlay')).toBeVisible();
  await page.locator('#delete-order').click();
  const panel=page.locator('#patchbrief-host');const request=panel.locator('textarea[name=request]');await request.fill('改成危险操作样式');
  await expect(panel.locator('.brand')).toHaveText('SpotBrief');
  expect(await page.evaluate(()=>window.__PATCHBRIEF__?.version)).toBe('0.2.0');
  await expect(panel.locator('[name=ai-optimize]')).toBeVisible();
  await panel.locator('[data-action=generate]').click();await expect(panel.locator('.preview')).toContainText('Frontend Change Brief');
  await page.evaluate(()=>window.__PATCHBRIEF__?.destroy());await expect(page.locator('#patchbrief-host')).toHaveCount(0);await expect(page.locator('[class^=patchbrief-]')).toHaveCount(0);
});
