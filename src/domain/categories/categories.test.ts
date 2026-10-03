import { describe, expect, it } from "vitest";

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  colorOrDefault,
  iconOrDefault,
} from "./categories";

describe("palette and icons", () => {
  it("has unique keys that fit the database format checks", () => {
    expect(new Set(CATEGORY_COLORS).size).toBe(CATEGORY_COLORS.length);
    expect(new Set(CATEGORY_ICONS).size).toBe(CATEGORY_ICONS.length);
    for (const c of CATEGORY_COLORS) expect(c).toMatch(/^[a-z]{1,20}$/);
    for (const i of CATEGORY_ICONS) expect(i).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it("falls back for unknown stored values", () => {
    expect(colorOrDefault("teal")).toBe("teal");
    expect(colorOrDefault("mauve")).toBe("slate");
    expect(iconOrDefault("gift")).toBe("gift");
    expect(iconOrDefault("rocket")).toBe("tag");
  });
});
