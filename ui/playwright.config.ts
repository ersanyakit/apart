import { defineConfig } from "@playwright/test";
if (!process.env.E2E_DATABASE_URL)
  throw new Error(
    "E2E_DATABASE_URL must point to a disposable PostgreSQL database",
  );
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Europe/Istanbul",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {},
  },
  webServer: {
    command: "go run .",
    cwd: "..",
    url: "http://localhost:3100/health/ready",
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL,
      JWT_SECRET: "isolated-e2e-jwt-secret-32-bytes-minimum",
      PORT: "3100",
      UI_PORT: "3101",
      APP_URL: "http://localhost:3100",
      APP_ENV: "development",
      DATA_DIR: "data/e2e",
    },
  },
});
