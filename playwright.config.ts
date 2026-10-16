import { defineConfig } from '@playwright/test'

// e2e runs against the local Docker Supabase. Vars loaded here win over .env.local
// (Node and Next never overwrite an already-set env var), including in the dev server.
try { process.loadEnvFile('.env.e2e.local') } catch {}

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  expect: { timeout: 15_000 },
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: { baseURL: 'http://localhost:3100', storageState: 'tests/e2e/.auth/alice.json' },
  webServer: { command: 'npx next dev -p 3100', port: 3100, reuseExistingServer: false },
})
