import { describe, expect, it } from "vitest";

import { sumByCurrency } from "./group";

describe("sumByCurrency", () => {
  it("keeps each currency separate", () => {
    expect(
      sumByCurrency([
        { currency: "USD", amountMinor: 1000n },
        { currency: "JPY", amountMinor: 500n },
        { currency: "USD", amountMinor: -250n },
      ]),
    ).toEqual({ USD: 750n, JPY: 500n });
  });

  it("returns an empty object for no items", () => {
    expect(sumByCurrency([])).toEqual({});
  });
});
