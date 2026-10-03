import { describe, expect, it } from "vitest";

import {
  escapeLike,
  filtersToSearchParams,
  hasFilters,
  parseTransactionFilters,
} from "./transaction-filters";

const ACCOUNT = "3f1c2b7e-8d2a-4c1e-9b5f-2a6d7e8f9a0b";

describe("parseTransactionFilters", () => {
  it("defaults to page 1 with no filters", () => {
    expect(parseTransactionFilters({})).toEqual({ page: 1 });
  });

  it("reads every filter", () => {
    expect(
      parseTransactionFilters({
        account: ACCOUNT,
        category: "none",
        from: "2026-03-01",
        to: "2026-03-31",
        q: "  coffee ",
        page: "3",
      }),
    ).toEqual({
      accountId: ACCOUNT,
      category: "none",
      from: "2026-03-01",
      to: "2026-03-31",
      q: "coffee",
      page: 3,
    });
  });

  it("treats empty form fields as unset", () => {
    expect(
      parseTransactionFilters({ account: "", category: "", q: "  ", from: "" }),
    ).toEqual({ page: 1 });
  });

  it("ignores values that don't parse", () => {
    expect(
      parseTransactionFilters({
        account: "not-a-uuid",
        category: "groceries",
        from: "2026-02-30",
        to: "yesterday",
        q: "x".repeat(101),
        page: "-2",
      }),
    ).toEqual({ page: 1 });
    expect(parseTransactionFilters({ page: "abc" }).page).toBe(1);
  });

  it("uses the first value of a repeated param", () => {
    expect(parseTransactionFilters({ q: ["tea", "coffee"] }).q).toBe("tea");
  });
});

describe("hasFilters", () => {
  it("ignores the page number", () => {
    expect(hasFilters({ page: 4 })).toBe(false);
    expect(hasFilters({ page: 1, q: "tea" })).toBe(true);
  });
});

describe("filtersToSearchParams", () => {
  it("round-trips and omits defaults", () => {
    const filters = { accountId: ACCOUNT, q: "tea & cake", page: 2 };
    const params = filtersToSearchParams(filters);
    expect(params.toString()).toBe(`account=${ACCOUNT}&q=tea+%26+cake&page=2`);
    expect(parseTransactionFilters(Object.fromEntries(params))).toEqual(
      filters,
    );
    expect(filtersToSearchParams({ page: 1 }).toString()).toBe("");
  });
});

describe("escapeLike", () => {
  it("escapes wildcards and backslashes", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(escapeLike("coffee")).toBe("coffee");
  });
});
