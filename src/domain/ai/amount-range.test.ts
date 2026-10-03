import { describe, expect, it } from "vitest";

import { amountRange } from "./amount-range";

describe("amountRange", () => {
  it("buckets by size in major units, ignoring the sign", () => {
    expect(amountRange(-450n, "USD")).toBe("under 10 USD");
    expect(amountRange(-1000n, "USD")).toBe("10–100 USD");
    expect(amountRange(12_345n, "USD")).toBe("100–1,000 USD");
    expect(amountRange(-250_000n, "USD")).toBe("1,000–10,000 USD");
    expect(amountRange(5_000_000n, "USD")).toBe("over 10,000 USD");
  });

  it("uses each currency's decimal places", () => {
    expect(amountRange(-1500n, "JPY")).toBe("1,000–10,000 JPY");
    expect(amountRange(-1500n, "KWD")).toBe("under 10 KWD");
  });
});
