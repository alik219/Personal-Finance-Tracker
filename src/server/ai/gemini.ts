import type {
  CategorizationProvider,
  CategorizeItem,
  CategorizeResult,
  CategoryChoice,
} from "@/domain/ai/provider";

// No "server-only" import: this file holds no secrets (the key is passed in),
// so the smoke-test script can run it directly with Node.

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiOptions = {
  apiKey: string;
  model?: string;
  /** Retries after the first attempt, for 429 and 5xx responses. */
  maxRetries?: number;
  timeoutMs?: number;
  /** Injectable for tests. */
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export class GeminiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

const SYSTEM_INSTRUCTION = `You categorize personal finance transactions.
For each item, pick the single best category key from the given categories.
Only use a category whose kind matches the item's direction (expense or income).
If no category clearly fits, return null for categoryKey.
confidence is your certainty from 0 to 1.
Return exactly one result per item, using the item's key.`;

// OpenAPI-style schema, as Gemini's responseSchema expects.
const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      key: { type: "STRING" },
      categoryKey: { type: "STRING", nullable: true },
      confidence: { type: "NUMBER" },
    },
    required: ["key", "categoryKey", "confidence"],
  },
};

/** The request body; exported so tests can check what leaves the app. */
export function buildGeminiRequest(
  items: CategorizeItem[],
  categories: CategoryChoice[],
) {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: "user",
        parts: [{ text: JSON.stringify({ categories, items }) }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
    },
  };
}

/** Reads Gemini's reply into results; throws on anything unexpected. */
export function parseGeminiResponse(body: unknown): CategorizeResult[] {
  const text = (
    body as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }
  )?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new GeminiError("Gemini returned no content.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiError("Gemini returned invalid JSON.");
  }
  if (!Array.isArray(parsed)) {
    throw new GeminiError("Gemini returned an unexpected shape.");
  }

  // Keep well-formed entries; the pipeline validates keys and categories.
  return parsed.flatMap((r): CategorizeResult[] => {
    if (typeof r !== "object" || r === null) return [];
    const { key, categoryKey, confidence } = r as Record<string, unknown>;
    if (typeof key !== "string") return [];
    if (categoryKey !== null && typeof categoryKey !== "string") return [];
    if (typeof confidence !== "number") return [];
    return [{ key, categoryKey, confidence }];
  });
}

const isRetryable = (status: number) => status === 429 || status >= 500;

/** Wait before retry `attempt` (0-based): Retry-After if given, else 1s, 2s, 4s… */
function retryDelay(response: Response, attempt: number): number {
  const header = Number(response.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return Math.min(header, 60) * 1000;
  return 1000 * 2 ** attempt;
}

export function createGeminiProvider({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  maxRetries = 3,
  timeoutMs = 30_000,
  fetch: fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: GeminiOptions): CategorizationProvider {
  const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent`;

  return {
    async categorize(items, categories) {
      const body = JSON.stringify(buildGeminiRequest(items, categories));

      for (let attempt = 0; ; attempt++) {
        let response: Response;
        try {
          response = await fetchImpl(url, {
            method: "POST",
            // The key goes in a header, never the URL, so it can't end up
            // in logs of request URLs.
            headers: {
              "content-type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body,
            signal: AbortSignal.timeout(timeoutMs),
          });
        } catch {
          if (attempt < maxRetries) {
            await sleep(1000 * 2 ** attempt);
            continue;
          }
          throw new GeminiError("Couldn't reach Gemini.");
        }

        if (response.ok) return parseGeminiResponse(await response.json());

        if (isRetryable(response.status) && attempt < maxRetries) {
          await sleep(retryDelay(response, attempt));
          continue;
        }
        // Status only: error bodies can echo request details.
        throw new GeminiError(
          `Gemini request failed (HTTP ${response.status}).`,
          response.status,
        );
      }
    },
  };
}
