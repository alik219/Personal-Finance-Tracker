import { describe, expect, it } from "vitest";

import { budgetProgress, type BudgetTransaction } from "./progress";

const food = {
  id: "b-food",
  categoryId: "cat-food",
  currency: "USD",
  amountMinor: 30000n,
};

const tx = (
  amountMinor: bigint,
  extra: Partial<BudgetTransaction> = {},
): BudgetTransaction => ({
  date: "2026-10-15",
  categoryId: "cat-food",
  currency: "USD",
  amountMinor,
  ...extra,
});

describe("budgetProgress", () => {
  it("sums spending in the budget's category, currency and month", () => {
    const [progress] = budgetProgress(
      [food],
      [
        tx(-10000n, { date: "2026-10-01" }),
        tx(-5000n, { date: "2026-10-31" }),
        tx(-99999n, { date: "2026-09-30" }), // last month
        tx(-99999n, { date: "2026-11-01" }), // next month
        tx(-99999n, { categoryId: "cat-fun" }), // other category
        tx(-99999n, { categoryId: null }), // uncategorized
      ],
      "2026-10",
    );
    expect(progress).toEqual({
      ...food,
      spentMinor: 15000n,
      remainingMinor: 15000n,
      percent: 50,
      status: "ok",
    });
  });

  it("keeps currencies separate", () => {
    const eur = {
      ...food,
      id: "b-food-eur",
      currency: "EUR",
      amountMinor: 10000n,
    };
    const [usd, euro] = budgetProgress(
      [food, eur],
      [
        tx(-6000n),
        tx(-9000n, { currency: "EUR" }),
        tx(-1000n, { currency: "GBP" }),
      ],
      "2026-10",
    );
    expect(usd.spentMinor).toBe(6000n);
    expect(usd.status).toBe("ok");
    expect(euro.spentMinor).toBe(9000n);
    expect(euro.status).toBe("warning");
  });

  it("subtracts refunds, never going below zero", () => {
    const [partly] = budgetProgress(
      [food],
      [tx(-10000n), tx(2500n)],
      "2026-10",
    );
    expect(partly.spentMinor).toBe(7500n);

    const [refunded] = budgetProgress(
      [food],
      [tx(-1000n), tx(5000n)],
      "2026-10",
    );
    expect(refunded.spentMinor).toBe(0n);
    expect(refunded.remainingMinor).toBe(30000n);
  });

  it("reports warning and over with a negative remainder", () => {
    const [warning] = budgetProgress([food], [tx(-24000n)], "2026-10");
    expect(warning).toMatchObject({ percent: 80, status: "warning" });

    const [over] = budgetProgress([food], [tx(-36000n)], "2026-10");
    expect(over).toMatchObject({
      percent: 120,
      status: "over",
      remainingMinor: -6000n,
    });
  });

  it("returns zero spending for a budget with no transactions", () => {
    const [progress] = budgetProgress([food], [], "2026-10");
    expect(progress).toMatchObject({
      spentMinor: 0n,
      percent: 0,
      status: "ok",
    });
  });
});
