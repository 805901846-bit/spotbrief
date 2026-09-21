import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command: `${process.execPath} tests/serve.mjs`,
    url: 'http://127.0.0.1:4173/tests/fixtures/basic.html',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
