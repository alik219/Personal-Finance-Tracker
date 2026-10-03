import { describe, expect, it } from "vitest";

import { createFakeProvider } from "./fake-provider";
import type { CategoryChoice } from "./provider";

const categories: CategoryChoice[] = [
  { key: "c1", name: "Groceries", kind: "expense" },
  { key: "c2", name: "Pets", kind: "expense" },
  { key: "c3", name: "Salary", kind: "income" },
];

const item = (key: string, description: string, direction = "expense") => ({
  key,
  description,
  direction: direction as "expense" | "income",
  amountRange: "10–100 USD",
});

describe("createFakeProvider", () => {
  it("matches keywords and category names, respecting direction", async () => {
    const results = await createFakeProvider().categorize(
      [
        item("t1", "tesco stores"),
        item("t2", "pets at home"),
        item("t3", "acme payroll", "income"),
        item("t4", "acme payroll", "expense"),
        item("t5", "mystery"),
      ],
      categories,
    );
    expect(results).toEqual([
      { key: "t1", categoryKey: "c1", confidence: 0.9 },
      { key: "t2", categoryKey: "c2", confidence: 0.9 },
      { key: "t3", categoryKey: "c3", confidence: 0.9 },
      { key: "t4", categoryKey: null, confidence: 0 },
      { key: "t5", categoryKey: null, confidence: 0 },
    ]);
  });

  it("accepts custom keywords", async () => {
    const [result] = await createFakeProvider({ pets: ["vet"] }).categorize(
      [item("t1", "city vet clinic")],
      categories,
    );
    expect(result.categoryKey).toBe("c2");
  });
});
