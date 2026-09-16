// @ts-check
import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;
// site já publicado (ex.: smoke da homologação): testa essa URL e não sobe o Vite
const baseExterna = process.env.CITMAIL_BASE_URL ? process.env.CITMAIL_BASE_URL.replace(/\/?$/, '/') : undefined;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: 'list',
  use: {
    // barra final obrigatória: specs usam caminhos relativos (page.goto('login.html'))
    baseURL: baseExterna || 'http://127.0.0.1:4200/citmail/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // mesmo servidor do desenvolvimento (vite.config.js)
  webServer: baseExterna ? undefined : {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4200/citmail/',
    // em CI nunca reaproveitar: outro processo na porta faria os testes rodarem contra o site errado
    reuseExistingServer: !CI,
  },
});
