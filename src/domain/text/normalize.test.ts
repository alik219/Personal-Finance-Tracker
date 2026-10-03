import { describe, expect, it } from "vitest";

import { normalizeDescription } from "./normalize";

describe("normalizeDescription", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeDescription("  Whole   FOODS\tMarket ")).toBe(
      "whole foods market",
    );
  });

  it("strips masked card numbers", () => {
    expect(normalizeDescription("AMAZON MKTPLACE XXXX1234")).toBe(
      "amazon mktplace",
    );
    expect(normalizeDescription("Netflix ****9876")).toBe("netflix");
    expect(normalizeDescription("Uber #### 4321")).toBe("uber");
  });

  it("strips dates in common formats", () => {
    expect(normalizeDescription("POS 12/03 STARBUCKS")).toBe("pos starbucks");
    expect(normalizeDescription("Rent 2026-03-01")).toBe("rent");
    expect(normalizeDescription("Gym 01.03.26 fee")).toBe("gym fee");
    expect(normalizeDescription("Payment 12/03/2026")).toBe("payment");
  });

  it("strips long reference numbers", () => {
    expect(normalizeDescription("STARBUCKS #4471")).toBe("starbucks");
    expect(normalizeDescription("Transfer ref 0012345678")).toBe(
      "transfer ref",
    );
  });

  it("keeps short numbers that are part of a name", () => {
    expect(normalizeDescription("7-ELEVEN 123")).toBe("7 eleven 123");
    expect(normalizeDescription("Route 66 Diner")).toBe("route 66 diner");
  });

  it("keeps ampersands, apostrophes and non-English letters", () => {
    expect(normalizeDescription("Marks & Spencer")).toBe("marks & spencer");
    expect(normalizeDescription("McDonald's")).toBe("mcdonald's");
    expect(normalizeDescription("Café Zürich")).toBe("café zürich");
  });

  it("gives the same result for the same merchant on different days", () => {
    expect(normalizeDescription("POS 03/14 TESCO STORES #2231 XXXX1111")).toBe(
      normalizeDescription("POS 04/02 TESCO STORES #2231 XXXX1111"),
    );
  });

  it("can return an empty string for number-only descriptions", () => {
    expect(normalizeDescription("12345678")).toBe("");
  });
});
