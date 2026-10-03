import { describe, expect, it } from "vitest";

import { nextCategorySource } from "./category-source";

describe("nextCategorySource", () => {
  it("marks a new pick as manual and no category as none", () => {
    expect(nextCategorySource("cat-1")).toBe("manual");
    expect(nextCategorySource(null)).toBe("none");
  });

  it("keeps the source when the category is unchanged", () => {
    const existing = { categoryId: "cat-1", source: "ai" as const };
    expect(nextCategorySource("cat-1", existing)).toBe("ai");
  });

  it("makes a changed category manual, even over an AI pick", () => {
    const existing = { categoryId: "cat-1", source: "ai" as const };
    expect(nextCategorySource("cat-2", existing)).toBe("manual");
    expect(nextCategorySource(null, existing)).toBe("none");
  });
});
