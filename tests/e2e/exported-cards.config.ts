import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

// Only this dedicated configuration authorizes fabricated upstream fixtures.
// Ordinary test discovery leaves its real-route cases explicitly skipped.
process.env.EXPORTED_ACTIVITY_FIXTURES = "1";

/** Build first. The isolated server never uses the developer's GitHub credential. */
export default defineConfig({
  testDir: ".",
  testMatch: ["exported-activity-cards.spec.ts", "activity-export-check.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3200",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
    colorScheme: "light",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    command:
      "node --import ./tests/e2e/helpers/exported-cards-provider-fixture.mjs ./node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3200",
    url: "http://127.0.0.1:3200/en",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      EXPORTED_ACTIVITY_FIXTURES: "1",
      GITHUB_TOKEN: "fixture-public-token",
      APP_URL: "https://profiles.example.com",
      NODE_ENV: "production",
    },
  },
});
