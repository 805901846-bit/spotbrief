import { expect, test } from '@playwright/test';

test('keeps the main task flow compact and supports shared and per-target instructions', async ({ page }) => {
  await page.goto('/tests/fixtures/basic.html');
  const panel = page.locator('#patchbrief-host');

  await expect(panel.locator('[data-role="selection-prompt"]')).toContainText('点击页面元素开始选择');
  await expect(panel.locator('[data-action="capture"]')).toHaveCount(1);
  await expect(panel.locator('[name="request"]')).toBeVisible();
  await expect(panel.getByText('全局修改目标')).toHaveCount(0);
  await expect(panel.getByText('相关代码')).toHaveCount(0);
  await expect(panel.getByText('高级选项')).toHaveCount(0);
  await expect(panel.locator('[data-action="undo"]')).toHaveCount(0);
  await expect(panel.locator('[data-action="settings"]')).toBeVisible();

  await page.locator('#delete-order').click();
  await page.locator('#secondary').click({ modifiers: ['Shift'] });
  await expect(panel.locator('[data-note]')).toHaveCount(2);
  await panel.locator('[data-note="0"]').fill('使用危险操作红色样式');
  await panel.locator('[data-note="1"]').fill('保持现有文字颜色');
  await panel.locator('[name="request"]').fill('两个按钮统一改成 8px 圆角');
  await panel.locator('[data-action="generate"]').click();

  const preview = panel.locator('.preview');
  await expect(preview).toContainText('两个按钮统一改成 8px 圆角');
  await expect(preview).toContainText('使用危险操作红色样式');
  await expect(preview).toContainText('保持现有文字颜色');
});
