import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:80';
const API_URL = process.env.E2E_API_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 800 },
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  // Self-contained execution: spin up the API + web dev servers if they're
  // not already running, so `pnpm test` works in CI as well as in Replit
  // (where the workflows are typically already serving these ports).
  webServer: [
    {
      command: 'pnpm --filter @workspace/api-server run dev',
      url: `${API_URL}/api/healthz`,
      reuseExistingServer: true,
      stdout: 'ignore',
      stderr: 'pipe',
      timeout: 180_000,
    },
    {
      command: 'pnpm --filter @workspace/gradeflow run dev',
      url: BASE_URL,
      reuseExistingServer: true,
      stdout: 'ignore',
      stderr: 'pipe',
      timeout: 180_000,
    },
  ],
});
