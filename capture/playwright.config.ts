import { defineConfig } from '@playwright/test'

// Capture runs against a live oCIS instance. Point OCIS_URL at your instance
// (defaults to the local ocis-verify on https://localhost:9200). Credentials
// default to admin/admin and can be overridden with OCIS_USER / OCIS_PASSWORD.
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  timeout: 90_000,
  use: {
    baseURL: process.env.OCIS_URL ?? 'https://localhost:9200',
    ignoreHTTPSErrors: true,
    headless: true,
    viewport: { width: 1440, height: 900 }
  }
})
