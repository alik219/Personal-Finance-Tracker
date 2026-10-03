import "server-only";

import { parseAiConfig, providerFromConfig } from "./config";

/** Server env only: GEMINI_API_KEY must never reach the browser. */
const config = () =>
  parseAiConfig({
    AI_PROVIDER: process.env.AI_PROVIDER,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
  });

export const isAiEnabled = () => config().provider !== "none";

export const getCategorizationProvider = () => providerFromConfig(config());
