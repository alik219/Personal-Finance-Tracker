// Manual check that your Gemini key and model work (backlog task 22).
// Sends three made-up transactions, the same minimized shape the app sends.
//
//   npm run ai:smoke
//
// Reads GEMINI_API_KEY (and optional GEMINI_MODEL) from .env.local.
import {
  createGeminiProvider,
  DEFAULT_GEMINI_MODEL,
} from "../src/server/ai/gemini.ts";

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in .env.local.");
}
const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

const categories = [
  { key: "c1", name: "Groceries", kind: "expense" },
  { key: "c2", name: "Dining out", kind: "expense" },
  { key: "c3", name: "Transport", kind: "expense" },
  { key: "c4", name: "Salary", kind: "income" },
];
const items = [
  {
    key: "t1",
    description: "whole foods market",
    direction: "expense",
    amountRange: "10–100 USD",
  },
  {
    key: "t2",
    description: "uber trip help uber com",
    direction: "expense",
    amountRange: "10–100 USD",
  },
  {
    key: "t3",
    description: "acme corp payroll",
    direction: "income",
    amountRange: "1,000–10,000 USD",
  },
];

// process.exitCode instead of process.exit(): exiting mid-flight trips a
// libuv assertion on Windows.
if (!apiKey) process.exitCode = 1;
else await run();

async function run() {
  console.log(`Asking ${model}…`);
  const started = Date.now();
  try {
    const results = await createGeminiProvider({ apiKey, model }).categorize(
      items,
      categories,
    );
    const names = Object.fromEntries(categories.map((c) => [c.key, c.name]));
    for (const item of items) {
      const r = results.find((x) => x.key === item.key);
      const pick = r?.categoryKey
        ? (names[r.categoryKey] ?? `unknown (${r.categoryKey})`)
        : "no match";
      console.log(
        `  ${item.description.padEnd(26)} → ${pick} (confidence ${r?.confidence ?? "–"})`,
      );
    }
    console.log(`OK in ${Date.now() - started} ms.`);
  } catch (error) {
    console.error(`Failed: ${error.message}`);
    if (error.status === 404)
      console.error(
        "The model name may be wrong; set GEMINI_MODEL in .env.local.",
      );
    if (error.status === 400 || error.status === 403)
      console.error("Check that the API key is correct.");
    if (error.status === 429)
      console.error("Free-tier limit reached; wait a minute and try again.");
    process.exitCode = 1;
  }
}
