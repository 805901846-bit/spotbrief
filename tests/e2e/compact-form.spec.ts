import { expect, test } from '@playwright/test';

test('starts compact, preserves draft fields, and preselects safe constraints', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const panel = page.locator('#patchbrief-host');
  const codeSection = panel.locator('details[data-section="code"]');
  const constraintSection = panel.locator('details[data-section="constraints"]');

  await expect(codeSection).not.toHaveAttribute('open', '');
  await expect(constraintSection).not.toHaveAttribute('open', '');
  await expect(panel.locator('[name="expected"]')).toHaveCount(0);
  await expect(panel.locator('[name="constraint"]:checked')).toHaveCount(5);
  await expect(panel.locator('[data-constraint-count]')).toContainText('已选 5 项');

  await codeSection.locator('summary').click();
  await panel.locator('[name="code"]').fill('function demo() {\n  return true;\n}');
  await codeSection.locator('summary').click();
  await codeSection.locator('summary').click();
  await expect(panel.locator('[name="code"]')).toHaveValue('function demo() {\n  return true;\n}');

  await panel.locator('[name="request"]').fill('缩小卡片留白');
  await panel.locator('[data-action="generate"]').click();
  await panel.locator('[data-action="back"]').click();
  await expect(panel.locator('[name="request"]')).toHaveValue('缩小卡片留白');
  await expect(panel.locator('[name="code"]')).toHaveValue('function demo() {\n  return true;\n}');
});
