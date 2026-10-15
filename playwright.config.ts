import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  expect: { timeout: 15_000 },
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3000', storageState: 'tests/e2e/.auth/alice.json' },
  webServer: { command: 'npm run dev', port: 3000, reuseExistingServer: true },
})
