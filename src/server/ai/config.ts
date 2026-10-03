import type { CategorizationProvider } from "@/domain/ai/provider";
import { createFakeProvider } from "@/domain/ai/fake-provider";

import { createGeminiProvider, DEFAULT_GEMINI_MODEL } from "./gemini";

export type AiConfig =
  | { provider: "fake" }
  | { provider: "gemini"; apiKey: string; model: string }
  | { provider: "none" };

/**
 * Which categorizer to use, from server env vars:
 * - AI_PROVIDER=fake: keyword matcher, no network (E2E tests).
 * - GEMINI_API_KEY set: Gemini (GEMINI_MODEL optional).
 * - neither: auto-categorize is off.
 */
export function parseAiConfig(
  env: Record<string, string | undefined>,
): AiConfig {
  if (env.AI_PROVIDER === "fake") return { provider: "fake" };
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { provider: "none" };
  return {
    provider: "gemini",
    apiKey,
    model: env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
  };
}

export function providerFromConfig(
  config: AiConfig,
): CategorizationProvider | null {
  switch (config.provider) {
    case "fake":
      return createFakeProvider();
    case "gemini":
      return createGeminiProvider({
        apiKey: config.apiKey,
        model: config.model,
      });
    case "none":
      return null;
  }
}
