import { expect, test } from '@playwright/test';

test('moves AI, constraints, and output preferences into settings', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const panel = page.locator('#patchbrief-host');

  await panel.locator('[data-action="settings"]').click();
  await expect(panel.locator('.settings-view')).toBeVisible();
  await expect(panel.locator('[name="ai-optimize"]')).not.toBeChecked();
  await expect(panel.locator('[name="constraint"]:checked')).toHaveCount(5);
  await expect(panel.locator('[name="include-visual"]')).toBeChecked();
  await expect(panel.locator('[name="include-html"]')).not.toBeChecked();

  await panel.locator('[name="include-html"]').check();
  await panel.locator('[name="constraint"]').first().check();
  await panel.locator('[data-action="settings-back"]').click();
  await expect(panel.locator('[name="request"]')).toBeVisible();
  await expect(panel.locator('.settings-view')).toHaveCount(0);
});

test('enables AI by default when bookmark pairing is configured', async ({ page }) => {
  await page.addInitScript(() => {
    window.__PATCHBRIEF_AI_BRIDGE__ = { url: 'https://example.test/bridge', token: 'paired-token' };
  });
  await page.goto('/tests/fixtures/basic.html');
  const panel = page.locator('#patchbrief-host');
  await panel.locator('[data-action="settings"]').click();
  await expect(panel.locator('[name="ai-optimize"]')).toBeChecked();
  await expect(panel.locator('[data-role="api-status"]')).toContainText('API 已配置');
});
