import { defineConfig } from '@playwright/test'

/** Demo recording config: one worker, video on, generous viewport. */
export default defineConfig({
  testDir: './demo',
  outputDir: './demo-results',
  workers: 1,
  timeout: 300_000,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 800 },
    video: { mode: 'on', size: { width: 1280, height: 800 } },
  },
  webServer: [
    {
      command: 'dotnet run --project ../server/EstatePlanner.Api',
      url: 'http://localhost:5100/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      cwd: '../client',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
