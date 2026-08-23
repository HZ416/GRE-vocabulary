import { defineConfig, devices } from '@playwright/test'

const localHosts = '127.0.0.1,localhost'
process.env.NO_PROXY = [process.env.NO_PROXY, localHosts].filter(Boolean).join(',')
process.env.no_proxy = [process.env.no_proxy, localHosts].filter(Boolean).join(',')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:1421',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev:e2e',
    url: 'http://127.0.0.1:1421/dashboard',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
