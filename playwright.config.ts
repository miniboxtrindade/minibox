import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PW_BASE_URL ?? 'https://minibox-five.vercel.app';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.(setup|spec)\.ts$/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 1,
  workers: 1,
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts$/,
    },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/admin.json' },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      testMatch: /.*\.mobile\.spec\.ts$/,
      use: { ...devices['Pixel 7'], storageState: 'tests/.auth/admin.json' },
      dependencies: ['setup'],
      retries: 1,
    },
  ],
});
