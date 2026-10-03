import { describe, expect, it } from "vitest";

import { parseCreateAccount, parseUpdateAccount } from "./accounts";
import { fieldErrorsOf } from "./form";

const valid = {
  name: "  Main Checking ",
  type: "checking",
  currency: "USD",
  openingBalance: "1,234.50",
};

describe("parseCreateAccount", () => {
  it("trims the name and parses the balance in the chosen currency", () => {
    const result = parseCreateAccount(valid);
    expect(result.success && result.data).toEqual({
      name: "Main Checking",
      type: "checking",
      currency: "USD",
      openingBalance: 123450n,
    });
  });

  it("treats a blank balance as zero", () => {
    const result = parseCreateAccount({ ...valid, openingBalance: " " });
    expect(result.success && result.data.openingBalance).toBe(0n);
  });

  it("accepts negative balances for money owed", () => {
    const result = parseCreateAccount({ ...valid, openingBalance: "-500" });
    expect(result.success && result.data.openingBalance).toBe(-50000n);
  });

  it("uses the currency's decimal places", () => {
    const jpy = parseCreateAccount({
      ...valid,
      currency: "JPY",
      openingBalance: "1500",
    });
    expect(jpy.success && jpy.data.openingBalance).toBe(1500n);

    const bad = parseCreateAccount({
      ...valid,
      currency: "JPY",
      openingBalance: "15.5",
    });
    expect(fieldErrorsOf(bad.error!)?.openingBalance).toEqual([
      "Too many decimal places for this currency.",
    ]);
  });

  it("reports invalid fields", () => {
    const result = parseCreateAccount({
      name: " ",
      type: "piggy_bank",
      currency: "XXQ",
      openingBalance: "abc",
    });
    const errors = fieldErrorsOf(result.error!);
    expect(errors?.name).toEqual(["Enter a name."]);
    expect(errors?.type).toEqual(["Choose an account type."]);
    expect(errors?.currency).toEqual(["Choose a currency."]);
  });
});

describe("parseUpdateAccount", () => {
  it("parses the balance in the stored currency", () => {
    const result = parseUpdateAccount(
      { name: "Wallet", type: "cash", openingBalance: "1.234" },
      "KWD",
    );
    expect(result.success && result.data.openingBalance).toBe(1234n);
  });

  it("rejects malformed amounts", () => {
    const result = parseUpdateAccount(
      { name: "Wallet", type: "cash", openingBalance: "12,34" },
      "USD",
    );
    expect(fieldErrorsOf(result.error!)?.openingBalance).toEqual([
      "Enter a number like 1,234.56.",
    ]);
  });
});
