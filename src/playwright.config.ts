import os from 'node:os';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT || 3200);
const WORKSPACE = path.join(os.tmpdir(), 'brand-os-e2e-workspace');
const FAKE_BIN = path.join(__dirname, 'tests', 'fixtures', 'bin');

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  globalTimeout: 30 * 60 * 1000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    viewport: { width: 1366, height: 768 },
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : undefined,
  },
  webServer: {
    command: `node src/tests/fixtures/prepare-workspace.mjs && npx next dev -p ${PORT}`,
    cwd: path.join(__dirname, '..'),
    url: `http://localhost:${PORT}/api/health`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      WORKSPACE,
      PATH: `${FAKE_BIN}${path.delimiter}${process.env.PATH}`,
    },
  },

  // NB: only chromium will run in Docker (arm64).
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
});
