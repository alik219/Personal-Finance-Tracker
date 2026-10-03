import { describe, expect, it } from "vitest";

import { isActivePath, NAV_ITEMS } from "./nav-items";

describe("isActivePath", () => {
  it("matches the page itself and nested pages", () => {
    expect(isActivePath("/settings", "/settings")).toBe(true);
    expect(isActivePath("/settings/categories", "/settings")).toBe(true);
  });

  it("does not match pages that merely share a prefix", () => {
    expect(isActivePath("/budgetsx", "/budgets")).toBe(false);
    expect(isActivePath("/dashboard", "/transactions")).toBe(false);
  });
});

describe("NAV_ITEMS", () => {
  it("fits four primary items in the phone bottom bar (plus More)", () => {
    expect(NAV_ITEMS.filter((item) => item.primaryOnMobile)).toHaveLength(4);
  });

  it("has unique destinations", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
