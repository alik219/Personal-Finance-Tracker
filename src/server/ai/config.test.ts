import { describe, expect, it } from "vitest";

import { parseAiConfig, providerFromConfig } from "./config";
import { DEFAULT_GEMINI_MODEL } from "./gemini";

describe("parseAiConfig", () => {
  it("is off without a key", () => {
    expect(parseAiConfig({})).toEqual({ provider: "none" });
    expect(parseAiConfig({ GEMINI_API_KEY: "  " })).toEqual({
      provider: "none",
    });
    expect(providerFromConfig({ provider: "none" })).toBeNull();
  });

  it("uses Gemini with the default model when a key is set", () => {
    expect(parseAiConfig({ GEMINI_API_KEY: " abc " })).toEqual({
      provider: "gemini",
      apiKey: "abc",
      model: DEFAULT_GEMINI_MODEL,
    });
    expect(
      parseAiConfig({ GEMINI_API_KEY: "abc", GEMINI_MODEL: "gemini-x" }),
    ).toMatchObject({ model: "gemini-x" });
  });

  it("prefers the fake provider when asked, even with a key", () => {
    expect(
      parseAiConfig({ AI_PROVIDER: "fake", GEMINI_API_KEY: "abc" }),
    ).toEqual({ provider: "fake" });
    expect(providerFromConfig({ provider: "fake" })).not.toBeNull();
  });
});
