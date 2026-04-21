import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  testMatch: "**/*.spec.ts",
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "bun run dev",
      cwd: "../server",
      url: "http://localhost:3001/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "bun run dev",
      cwd: "../web",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
