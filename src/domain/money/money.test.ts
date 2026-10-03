import { describe, expect, it } from "vitest";

import {
  currencyDecimals,
  formatMoney,
  isCurrencyCode,
  parseAmount,
  toDecimalString,
} from "./money";

const ok = (value: bigint) => ({ ok: true, value });
const fail = (error: string) => ({ ok: false, error });
// Intl output uses non-breaking spaces; compare with regular ones.
const plain = (s: string) => s.replace(/\s/g, " ");

describe("currencyDecimals", () => {
  it.each([
    ["JPY", 0],
    ["USD", 2],
    ["EUR", 2],
    ["KWD", 3],
  ])("%s has %i decimals", (code, decimals) => {
    expect(currencyDecimals(code)).toBe(decimals);
  });

  it("rejects unknown codes", () => {
    expect(() => currencyDecimals("XXQ")).toThrow(RangeError);
    expect(() => currencyDecimals("usd")).toThrow(RangeError);
  });
});

describe("isCurrencyCode", () => {
  it("accepts ISO 4217 codes only", () => {
    expect(isCurrencyCode("USD")).toBe(true);
    expect(isCurrencyCode("US")).toBe(false);
    expect(isCurrencyCode("usd")).toBe(false);
  });
});

describe("parseAmount", () => {
  it.each([
    ["1,234.5", "USD", 123450n],
    ["1234.56", "USD", 123456n],
    ["0.01", "USD", 1n],
    [".5", "USD", null],
    ["5.", "USD", 500n],
    ["  42  ", "USD", 4200n],
    ["1,000", "JPY", 1000n],
    ["1500", "JPY", 1500n],
    ["1.234", "KWD", 1234n],
    ["12,345.6", "KWD", 12345600n],
    ["1 234.50", "USD", 123450n],
    ["9007199254740993.01", "USD", 900719925474099301n],
  ])("%s %s -> %s", (input, currency, expected) => {
    expect(parseAmount(input, currency)).toEqual(
      expected === null ? fail("invalid") : ok(expected),
    );
  });

  it("handles signs", () => {
    expect(parseAmount("-12.30", "USD")).toEqual(ok(-1230n));
    expect(parseAmount("+12.30", "USD")).toEqual(ok(1230n));
    expect(parseAmount("-0", "USD")).toEqual(ok(0n));
  });

  it("never rounds extra decimals", () => {
    expect(parseAmount("1.005", "USD")).toEqual(fail("too_many_decimals"));
    expect(parseAmount("10.5", "JPY")).toEqual(fail("too_many_decimals"));
    expect(parseAmount("1.0001", "KWD")).toEqual(fail("too_many_decimals"));
  });

  it("rejects malformed input", () => {
    for (const input of [
      "abc",
      "12,34",
      "1,2345",
      "1.2.3",
      "--5",
      "$5",
      "5-",
      "1,,000",
    ]) {
      expect(parseAmount(input, "USD"), input).toEqual(fail("invalid"));
    }
    expect(parseAmount("", "USD")).toEqual(fail("empty"));
    expect(parseAmount("   ", "USD")).toEqual(fail("empty"));
  });

  it("supports comma decimal separator for European formats", () => {
    const opts = { decimalSeparator: "," } as const;
    expect(parseAmount("1.234,5", "EUR", opts)).toEqual(ok(123450n));
    expect(parseAmount("-12,30", "EUR", opts)).toEqual(ok(-1230n));
    expect(parseAmount("1,234.5", "EUR", opts)).toEqual(fail("invalid"));
  });
});

describe("toDecimalString", () => {
  it.each([
    [123450n, "USD", "1234.50"],
    [-1230n, "USD", "-12.30"],
    [5n, "USD", "0.05"],
    [-5n, "USD", "-0.05"],
    [0n, "USD", "0.00"],
    [1500n, "JPY", "1500"],
    [-7n, "JPY", "-7"],
    [1234n, "KWD", "1.234"],
    [1n, "KWD", "0.001"],
  ])("%s %s -> %s", (minor, currency, expected) => {
    expect(toDecimalString(minor, currency)).toBe(expected);
  });

  it("round-trips with parseAmount", () => {
    for (const [minor, currency] of [
      [123456789n, "USD"],
      [-42n, "KWD"],
      [99n, "JPY"],
    ] as const) {
      expect(parseAmount(toDecimalString(minor, currency), currency)).toEqual(
        ok(minor),
      );
    }
  });
});

describe("formatMoney", () => {
  it("formats per currency", () => {
    expect(formatMoney(123450n, "USD")).toBe("$1,234.50");
    expect(formatMoney(1500n, "JPY")).toBe("¥1,500");
    expect(plain(formatMoney(1234n, "KWD"))).toBe("KWD 1.234");
  });

  it("formats negatives and explicit signs", () => {
    expect(formatMoney(-1230n, "USD")).toBe("-$12.30");
    expect(formatMoney(1230n, "USD", { signDisplay: "always" })).toBe(
      "+$12.30",
    );
  });

  it("respects locale", () => {
    expect(plain(formatMoney(123450n, "EUR", { locale: "de-DE" }))).toBe(
      "1.234,50 €",
    );
  });

  it("stays exact beyond float precision", () => {
    expect(formatMoney(900719925474099301n, "USD")).toBe(
      "$9,007,199,254,740,993.01",
    );
  });
});
