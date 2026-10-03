import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Same .env files Next.js reads, so test helpers see the Supabase keys.
loadEnvConfig(process.cwd());

// Own port and a production build, so tests never hit a stale `npm run dev`
// on 3000 and aren't slowed by dev-mode compiling.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One Next server and one local Supabase serve every worker; past ~4
  // parallel browsers, logins and page loads start hitting timeouts.
  workers: Number(process.env.E2E_WORKERS ?? 4),
  reporter: process.env.CI ? "github" : "list",
  // Auth flows hash passwords and send email; 5s is tight with parallel workers.
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // Tests use the keyword-matching fake, never the real Gemini API (even
    // when GEMINI_API_KEY is in .env.local).
    env: { AI_PROVIDER: "fake" },
  },
});
