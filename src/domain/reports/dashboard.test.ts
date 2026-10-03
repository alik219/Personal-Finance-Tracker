import { describe, expect, it } from "vitest";

import {
  categoryBreakdown,
  monthKpis,
  percentChange,
  pickCurrency,
  trend,
  type CategorySpend,
  type MonthlyTotal,
} from "./dashboard";

const total = (
  month: string,
  incomeMinor: bigint,
  spendingMinor: bigint,
  currency = "USD",
): MonthlyTotal => ({ month, currency, incomeMinor, spendingMinor });

const TOTALS = [
  total("2026-09", 500000n, 150000n),
  total("2026-10", 520000n, 165000n),
  total("2026-10", 0n, 3000n, "EUR"),
];

describe("percentChange", () => {
  it("rounds toward zero and has no base for 0", () => {
    expect(percentChange(165000n, 150000n)).toBe(10);
    expect(percentChange(100n, 300n)).toBe(-66);
    expect(percentChange(5n, 0n)).toBeNull();
  });
});

describe("monthKpis", () => {
  it("gives income, spending, net and change vs last month", () => {
    expect(monthKpis(TOTALS, "2026-10", "USD")).toEqual({
      incomeMinor: 520000n,
      spendingMinor: 165000n,
      netMinor: 355000n,
      incomeChange: 4,
      spendingChange: 10,
    });
  });

  it("keeps currencies apart and handles missing months", () => {
    expect(monthKpis(TOTALS, "2026-10", "EUR")).toEqual({
      incomeMinor: 0n,
      spendingMinor: 3000n,
      netMinor: -3000n,
      incomeChange: null,
      spendingChange: null,
    });
    expect(monthKpis([], "2026-10", "USD").netMinor).toBe(0n);
  });
});

describe("trend", () => {
  it("covers the last N months oldest first, filling gaps with zero", () => {
    const points = trend(TOTALS, "2026-10", "USD", 3);
    expect(points).toEqual([
      { month: "2026-08", incomeMinor: 0n, spendingMinor: 0n },
      { month: "2026-09", incomeMinor: 500000n, spendingMinor: 150000n },
      { month: "2026-10", incomeMinor: 520000n, spendingMinor: 165000n },
    ]);
  });

  it("crosses year boundaries", () => {
    expect(trend([], "2026-02", "USD", 4).map((p) => p.month)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("categoryBreakdown", () => {
  const names = new Map([
    ["food", "Groceries"],
    ["rent", "Housing"],
    ["fun", "Fun"],
  ]);
  const rows: CategorySpend[] = [
    { currency: "USD", categoryId: "food", spendingMinor: 7000n },
    { currency: "USD", categoryId: "rent", spendingMinor: 150000n },
    { currency: "USD", categoryId: null, spendingMinor: 1000n },
    { currency: "USD", categoryId: "gone", spendingMinor: 500n },
    { currency: "EUR", categoryId: "food", spendingMinor: 3000n },
  ];

  it("lists one currency's categories, largest first, naming uncategorized", () => {
    expect(categoryBreakdown(rows, "USD", names)).toEqual([
      { key: "rent", name: "Housing", spendingMinor: 150000n },
      { key: "food", name: "Groceries", spendingMinor: 7000n },
      { key: "uncategorized", name: "Uncategorized", spendingMinor: 1000n },
      { key: "gone", name: "Deleted category", spendingMinor: 500n },
    ]);
  });

  it("folds the tail into Other past the limit", () => {
    const slices = categoryBreakdown(rows, "USD", names, 3);
    expect(slices.map((s) => s.name)).toEqual([
      "Housing",
      "Groceries",
      "Other (2)",
    ]);
    expect(slices[2].spendingMinor).toBe(1500n);
  });
});

describe("pickCurrency", () => {
  it("honors a valid request", () => {
    expect(pickCurrency(["EUR", "USD"], "EUR", TOTALS, "2026-10")).toBe("EUR");
  });

  it("otherwise picks the busiest currency, then the default, then the first", () => {
    expect(pickCurrency(["EUR", "USD"], "GBP", TOTALS, "2026-10")).toBe("USD");
    expect(pickCurrency(["EUR", "USD"], undefined, [], "2026-10", "USD")).toBe(
      "USD",
    );
    expect(pickCurrency(["EUR", "USD"], undefined, [], "2026-10", "JPY")).toBe(
      "EUR",
    );
    expect(pickCurrency(["EUR", "USD"], undefined, [], "2026-10")).toBe("EUR");
    expect(pickCurrency([], undefined, [], "2026-10")).toBeUndefined();
  });
});
