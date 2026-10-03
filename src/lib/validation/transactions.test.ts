import { describe, expect, it } from "vitest";

import { fieldErrorsOf } from "./form";
import { isUuid, parseTransaction } from "./transactions";

const CATEGORY = "3f1c2b7e-8d2a-4c1e-9b5f-2a6d7e8f9a0b";

const valid = {
  type: "expense",
  amount: "1,234.50",
  description: "  Weekly groceries ",
  date: "2026-03-05",
  categoryId: CATEGORY,
};

describe("parseTransaction", () => {
  it("makes expenses negative and trims the description", () => {
    const result = parseTransaction(valid, "USD");
    expect(result.success && result.data).toEqual({
      amountMinor: -123450n,
      description: "Weekly groceries",
      date: "2026-03-05",
      categoryId: CATEGORY,
    });
  });

  it("keeps income positive and treats a blank category as none", () => {
    const result = parseTransaction(
      { ...valid, type: "income", amount: "3000", categoryId: "" },
      "USD",
    );
    expect(result.success && result.data).toMatchObject({
      amountMinor: 300000n,
      categoryId: null,
    });
  });

  it("parses in the account's currency", () => {
    const jpy = parseTransaction({ ...valid, amount: "1500" }, "JPY");
    expect(jpy.success && jpy.data.amountMinor).toBe(-1500n);

    const bad = parseTransaction({ ...valid, amount: "15.5" }, "JPY");
    expect(fieldErrorsOf(bad.error!)?.amount).toEqual([
      "Too many decimal places for this currency.",
    ]);
  });

  it("rejects zero and signed amounts", () => {
    for (const amount of ["0", "0.00", "-5"]) {
      const result = parseTransaction({ ...valid, amount }, "USD");
      expect(fieldErrorsOf(result.error!)?.amount).toEqual([
        "Enter an amount above zero. Use Expense or Income for the direction.",
      ]);
    }
  });

  it("reports every invalid field", () => {
    const result = parseTransaction(
      {
        type: "transfer",
        amount: "",
        description: " ",
        date: "2026-02-30",
        categoryId: "groceries",
      },
      "USD",
    );
    const errors = fieldErrorsOf(result.error!);
    expect(errors?.type).toEqual(["Choose expense or income."]);
    expect(errors?.amount).toEqual(["Enter an amount."]);
    expect(errors?.description).toEqual(["Enter a description."]);
    expect(errors?.date).toEqual(["Enter a valid date."]);
    expect(errors?.categoryId).toEqual(["Choose a category."]);
  });

  it("rejects dates outside what the database stores", () => {
    const result = parseTransaction({ ...valid, date: "1899-12-31" }, "USD");
    expect(fieldErrorsOf(result.error!)?.date).toEqual([
      "Enter a date between 1900 and 2999.",
    ]);
  });
});

describe("isUuid", () => {
  it("accepts uuids only", () => {
    expect(isUuid(CATEGORY)).toBe(true);
    expect(isUuid("")).toBe(false);
    expect(isUuid("abc")).toBe(false);
  });
});
