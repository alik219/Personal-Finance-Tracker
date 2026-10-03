import { describe, expect, it, vi } from "vitest";

import type { CategorizeItem, CategoryChoice } from "@/domain/ai/provider";

import {
  buildGeminiRequest,
  createGeminiProvider,
  GeminiError,
  parseGeminiResponse,
} from "./gemini";

const API_KEY = "test-key-SECRET123";

const items: CategorizeItem[] = [
  {
    key: "t1",
    description: "tesco",
    direction: "expense",
    amountRange: "10–100 USD",
  },
];
const categories: CategoryChoice[] = [
  { key: "c1", name: "Groceries", kind: "expense" },
];

/** A Gemini-shaped success body wrapping `results` as JSON text. */
const reply = (results: unknown) =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(results) }] } }],
    }),
    { status: 200 },
  );

const status = (code: number, headers?: Record<string, string>) =>
  new Response("{}", { status: code, headers });

function setup(...responses: (Response | Error)[]) {
  const fetch = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("unexpected extra request");
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = vi.fn(async () => {});
  const provider = createGeminiProvider({
    apiKey: API_KEY,
    model: "gemini-test",
    fetch: fetch as unknown as typeof globalThis.fetch,
    sleep,
  });
  return { provider, fetch, sleep };
}

describe("createGeminiProvider", () => {
  it("sends a structured-output request with the key in a header", async () => {
    const { provider, fetch } = setup(
      reply([{ key: "t1", categoryKey: "c1", confidence: 0.9 }]),
    );

    const results = await provider.categorize(items, categories);

    expect(results).toEqual([
      { key: "t1", categoryKey: "c1", confidence: 0.9 },
    ]);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
    );
    expect(url).not.toContain(API_KEY);
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      API_KEY,
    );
    expect(JSON.parse(init.body as string)).toEqual(
      buildGeminiRequest(items, categories),
    );
  });

  it("retries 429 and 5xx with backoff, honoring Retry-After", async () => {
    const { provider, fetch, sleep } = setup(
      status(429, { "retry-after": "7" }),
      status(503),
      reply([{ key: "t1", categoryKey: null, confidence: 0.1 }]),
    );

    const results = await provider.categorize(items, categories);

    expect(results).toEqual([
      { key: "t1", categoryKey: null, confidence: 0.1 },
    ]);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[7000], [2000]]);
  });

  it("retries network errors, then gives up", async () => {
    const { provider, fetch } = setup(
      new Error("ECONNRESET"),
      new Error("ECONNRESET"),
      new Error("ECONNRESET"),
      new Error("ECONNRESET"),
    );
    await expect(provider.categorize(items, categories)).rejects.toThrow(
      "Couldn't reach Gemini.",
    );
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("gives up after the retry limit on repeated 429s", async () => {
    const { provider, fetch } = setup(
      status(429),
      status(429),
      status(429),
      status(429),
    );
    const error = await provider
      .categorize(items, categories)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GeminiError);
    expect((error as GeminiError).status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("does not retry other client errors, and never puts the key in errors", async () => {
    const { provider, fetch } = setup(status(400));
    const error = (await provider
      .categorize(items, categories)
      .catch((e: unknown) => e)) as Error;
    expect(error.message).toBe("Gemini request failed (HTTP 400).");
    expect(error.message).not.toContain(API_KEY);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("buildGeminiRequest", () => {
  it("contains only the minimized payload", () => {
    const text = buildGeminiRequest(items, categories).contents[0].parts[0]
      .text;
    expect(JSON.parse(text)).toEqual({ categories, items });
  });
});

describe("parseGeminiResponse", () => {
  const wrap = (text: string) => ({
    candidates: [{ content: { parts: [{ text }] } }],
  });

  it("throws on missing content, bad JSON or a non-array", () => {
    expect(() => parseGeminiResponse({})).toThrow("no content");
    expect(() => parseGeminiResponse(wrap("not json"))).toThrow("invalid JSON");
    expect(() => parseGeminiResponse(wrap('{"a":1}'))).toThrow(
      "unexpected shape",
    );
  });

  it("keeps only well-formed entries", () => {
    const results = parseGeminiResponse(
      wrap(
        JSON.stringify([
          { key: "t1", categoryKey: "c1", confidence: 0.8 },
          { key: "t2", categoryKey: null, confidence: 0 },
          { key: 3, categoryKey: "c1", confidence: 1 },
          { key: "t4", categoryKey: 5, confidence: 1 },
          { key: "t5", categoryKey: "c1", confidence: "high" },
          null,
        ]),
      ),
    );
    expect(results).toEqual([
      { key: "t1", categoryKey: "c1", confidence: 0.8 },
      { key: "t2", categoryKey: null, confidence: 0 },
    ]);
  });
});
