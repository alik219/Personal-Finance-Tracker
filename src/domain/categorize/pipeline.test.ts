import { describe, expect, it, vi } from "vitest";

import { createFakeProvider } from "@/domain/ai/fake-provider";
import type {
  CategorizationProvider,
  CategorizeItem,
  CategorizeResult,
  CategoryChoice,
} from "@/domain/ai/provider";

import {
  categorizeTransactions,
  type PipelineCategory,
  type PipelineTransaction,
} from "./pipeline";

const CATEGORIES: PipelineCategory[] = [
  { id: "cat-groceries", name: "Groceries", kind: "expense", hidden: false },
  { id: "cat-dining", name: "Dining out", kind: "expense", hidden: false },
  { id: "cat-old", name: "Old stuff", kind: "expense", hidden: true },
  { id: "cat-salary", name: "Salary", kind: "income", hidden: false },
];

let nextId = 1;
function tx(
  description: string,
  amountMinor: bigint,
  extra: Partial<PipelineTransaction> = {},
): PipelineTransaction {
  return {
    id: `tx-${nextId++}`,
    normalizedDescription: description,
    amountMinor,
    currency: "USD",
    categoryId: null,
    categorySource: "none",
    ...extra,
  };
}

/** A provider that records what it was sent and answers with `answer`. */
function spyProvider(
  answer: (
    items: CategorizeItem[],
    categories: CategoryChoice[],
  ) => CategorizeResult[] = () => [],
) {
  const calls: { items: CategorizeItem[]; categories: CategoryChoice[] }[] = [];
  const provider: CategorizationProvider = {
    async categorize(items, categories) {
      calls.push({ items, categories });
      return answer(items, categories);
    },
  };
  return { provider, calls };
}

/** Answers every item with the category of the given name. */
const answerWith =
  (name: string, confidence = 0.9) =>
  (items: CategorizeItem[], categories: CategoryChoice[]) =>
    items.map((i) => ({
      key: i.key,
      categoryKey: categories.find((c) => c.name === name)?.key ?? "c999",
      confidence,
    }));

describe("categorizeTransactions", () => {
  it("never sends or changes manual or already-categorized rows", async () => {
    const manual = tx("whole foods", -500n, {
      categoryId: "cat-dining",
      categorySource: "manual",
    });
    const ai = tx("whole foods market", -700n, {
      categoryId: "cat-dining",
      categorySource: "ai",
    });
    const open = tx("tesco", -300n);
    const { provider, calls } = spyProvider(answerWith("Groceries"));

    const result = await categorizeTransactions(
      [manual, ai, open],
      CATEGORIES,
      provider,
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].items.map((i) => i.description)).toEqual(["tesco"]);
    expect(result.updates).toEqual([
      { id: open.id, categoryId: "cat-groceries" },
    ]);
    expect(result.skipped).toBe(2);
    expect(result.leftUncategorized).toBe(0);
  });

  it("sends only what the privacy rule allows", async () => {
    const { provider, calls } = spyProvider();
    await categorizeTransactions(
      [tx("starbucks", -1234n), tx("acme payroll", 250000n)],
      CATEGORIES,
      provider,
    );

    const [{ items, categories }] = calls;
    expect(items).toEqual([
      {
        key: "t1",
        description: "starbucks",
        direction: "expense",
        amountRange: "10–100 USD",
      },
      {
        key: "t2",
        description: "acme payroll",
        direction: "income",
        amountRange: "1,000–10,000 USD",
      },
    ]);
    // Names and kinds only; hidden categories aren't offered.
    expect(categories).toEqual([
      { key: "c1", name: "Groceries", kind: "expense" },
      { key: "c2", name: "Dining out", kind: "expense" },
      { key: "c3", name: "Salary", kind: "income" },
    ]);
    const payload = JSON.stringify(calls);
    expect(payload).not.toMatch(/tx-|cat-|1234|250000/);
  });

  it("drops invalid, mismatched and unsure answers", async () => {
    const rows = [
      tx("unknown key", -100n),
      tx("hidden category", -100n),
      tx("income category on expense", -100n),
      tx("low confidence", -100n),
      tx("null answer", -100n),
      tx("good", -100n),
    ];
    const { provider } = spyProvider((items) => [
      { key: items[0].key, categoryKey: "c999", confidence: 1 },
      { key: items[1].key, categoryKey: "cat-old", confidence: 1 },
      { key: items[2].key, categoryKey: "c3", confidence: 1 },
      { key: items[3].key, categoryKey: "c1", confidence: 0.2 },
      { key: items[4].key, categoryKey: null, confidence: 0.99 },
      { key: items[5].key, categoryKey: "c2", confidence: 0.8 },
      // Answers for items that weren't asked about are ignored.
      { key: "t42", categoryKey: "c1", confidence: 1 },
    ]);

    const result = await categorizeTransactions(rows, CATEGORIES, provider);

    expect(result.updates).toEqual([
      { id: rows[5].id, categoryId: "cat-dining" },
    ]);
    expect(result.leftUncategorized).toBe(5);
  });

  it("uses the first answer when an item is answered twice", async () => {
    const row = tx("coffee", -100n);
    const { provider } = spyProvider((items) => [
      { key: items[0].key, categoryKey: "c2", confidence: 0.9 },
      { key: items[0].key, categoryKey: "c1", confidence: 0.9 },
    ]);
    const result = await categorizeTransactions([row], CATEGORIES, provider);
    expect(result.updates).toEqual([{ id: row.id, categoryId: "cat-dining" }]);
  });

  it("rejects non-numeric confidence", async () => {
    const { provider } = spyProvider((items) => [
      { key: items[0].key, categoryKey: "c1", confidence: Number.NaN },
    ]);
    const result = await categorizeTransactions(
      [tx("tesco", -100n)],
      CATEGORIES,
      provider,
    );
    expect(result.updates).toEqual([]);
  });

  it("sends each description once per direction and applies it to every row", async () => {
    const rows = [
      tx("tesco", -100n),
      tx("tesco", -2500n),
      tx("tesco", 300n), // a refund: same text, other direction
    ];
    const { provider, calls } = spyProvider((items, categories) =>
      items.map((i) => ({
        key: i.key,
        categoryKey:
          categories.find((c) =>
            i.direction === "expense"
              ? c.name === "Groceries"
              : c.name === "Salary",
          )?.key ?? null,
        confidence: 0.9,
      })),
    );

    const result = await categorizeTransactions(rows, CATEGORIES, provider);

    expect(calls[0].items).toHaveLength(2);
    expect(result.updates).toEqual([
      { id: rows[0].id, categoryId: "cat-groceries" },
      { id: rows[1].id, categoryId: "cat-groceries" },
      { id: rows[2].id, categoryId: "cat-salary" },
    ]);
  });

  it("batches unique descriptions", async () => {
    const rows = Array.from({ length: 120 }, (_, i) => tx(`shop ${i}`, -100n));
    const { provider, calls } = spyProvider(answerWith("Groceries"));

    const result = await categorizeTransactions(rows, CATEGORIES, provider, {
      batchSize: 50,
    });

    expect(calls.map((c) => c.items.length)).toEqual([50, 50, 20]);
    expect(result.updates).toHaveLength(120);
  });

  it("keeps going when a batch fails, leaving its rows uncategorized", async () => {
    const rows = Array.from({ length: 6 }, (_, i) => tx(`shop ${i}`, -100n));
    let call = 0;
    const provider: CategorizationProvider = {
      async categorize(items, categories) {
        call += 1;
        if (call === 1) throw new Error("429 Too Many Requests");
        return answerWith("Groceries")(items, categories);
      },
    };

    const result = await categorizeTransactions(rows, CATEGORIES, provider, {
      batchSize: 3,
    });

    expect(result.failedBatches).toBe(1);
    expect(result.updates.map((u) => u.id)).toEqual(
      rows.slice(3).map((r) => r.id),
    );
    expect(result.leftUncategorized).toBe(3);
  });

  it("skips rows with nothing readable and calls nothing when there's no work", async () => {
    const categorize = vi.fn();
    const result = await categorizeTransactions([tx("", -100n)], CATEGORIES, {
      categorize,
    });
    expect(categorize).not.toHaveBeenCalled();
    expect(result).toEqual({
      updates: [],
      leftUncategorized: 1,
      skipped: 0,
      failedBatches: 0,
    });

    await categorizeTransactions([], CATEGORIES, { categorize });
    await categorizeTransactions([tx("tesco", -1n)], [], { categorize });
    expect(categorize).not.toHaveBeenCalled();
  });

  it("works end to end with the fake provider", async () => {
    const rows = [
      tx("whole foods market", -4599n),
      tx("starbucks", -450n),
      tx("acme payroll", 300000n),
      tx("mystery shop", -1000n),
    ];
    const result = await categorizeTransactions(
      rows,
      CATEGORIES,
      createFakeProvider(),
    );
    expect(result.updates).toEqual([
      { id: rows[0].id, categoryId: "cat-groceries" },
      { id: rows[1].id, categoryId: "cat-dining" },
      { id: rows[2].id, categoryId: "cat-salary" },
    ]);
    expect(result.leftUncategorized).toBe(1);
  });
});
