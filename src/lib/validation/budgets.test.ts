import { describe, expect, it } from "vitest";

import { parseCreateBudget, parseMonth, parseUpdateBudget } from "./budgets";
import { fieldErrorsOf } from "./form";

const CATEGORY = "3f1c2b7e-8d2a-4c1e-9b5f-2a6d7e8f9a0b";
const valid = {
  month: "2026-10",
  categoryId: CATEGORY,
  currency: "USD",
  amount: "300",
};

describe("parseCreateBudget", () => {
  it("parses the amount in the chosen currency", () => {
    const result = parseCreateBudget(valid);
    expect(result.success && result.data).toEqual({
      ...valid,
      amount: 30000n,
    });
    const jpy = parseCreateBudget({
      ...valid,
      currency: "JPY",
      amount: "30,000",
    });
    expect(jpy.success && jpy.data.amount).toBe(30000n);
  });

  it("rejects zero, negative and malformed amounts", () => {
    for (const [amount, message] of [
      ["0", "Enter an amount above zero."],
      ["-5", "Enter an amount above zero."],
      ["abc", "Enter a number like 1,234.56."],
    ]) {
      const result = parseCreateBudget({ ...valid, amount });
      expect(fieldErrorsOf(result.error!)?.amount).toEqual([message]);
    }
  });

  it("reports invalid fields", () => {
    const result = parseCreateBudget({
      month: "2026-13",
      categoryId: "food",
      currency: "XXQ",
      amount: "",
    });
    const errors = fieldErrorsOf(result.error!);
    expect(errors?.month).toEqual(["Choose a month."]);
    expect(errors?.categoryId).toEqual(["Choose a category."]);
    expect(errors?.currency).toEqual(["Choose a currency."]);
  });
});

describe("parseUpdateBudget", () => {
  it("uses the stored currency", () => {
    const result = parseUpdateBudget({ amount: "1.5" }, "KWD");
    expect(result.success && result.data.amount).toBe(1500n);
    const bad = parseUpdateBudget({ amount: "1.5" }, "JPY");
    expect(fieldErrorsOf(bad.error!)?.amount).toEqual([
      "Too many decimal places for this currency.",
    ]);
  });
});

describe("parseMonth", () => {
  it("accepts YYYY-MM only", () => {
    expect(parseMonth("2026-10")).toBe("2026-10");
    expect(parseMonth("2026-1")).toBeNull();
    expect(parseMonth("")).toBeNull();
  });
});
