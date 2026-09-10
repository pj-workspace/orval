import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './browser',
  use: { baseURL: 'http://127.0.0.1:5179', trace: 'retain-on-failure' },
  webServer: { command: 'bun run dev', url: 'http://127.0.0.1:5179', reuseExistingServer: false },
});
