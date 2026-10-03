import { describe, expect, it } from "vitest";

import { parseCreateCategory, parseUpdateCategory } from "./categories";
import { fieldErrorsOf } from "./form";

const valid = {
  name: "  Pets ",
  kind: "expense",
  color: "amber",
  icon: "paw-print",
};

describe("parseCreateCategory", () => {
  it("trims the name and keeps the chosen kind, color and icon", () => {
    const result = parseCreateCategory(valid);
    expect(result.success && result.data).toEqual({
      name: "Pets",
      kind: "expense",
      color: "amber",
      icon: "paw-print",
    });
  });

  it("reports invalid fields", () => {
    const result = parseCreateCategory({
      name: " ",
      kind: "transfer",
      color: "#ff0000",
      icon: "rocket-ship",
    });
    const errors = fieldErrorsOf(result.error!);
    expect(errors?.name).toEqual(["Enter a name."]);
    expect(errors?.kind).toEqual(["Choose income or expense."]);
    expect(errors?.color).toEqual(["Choose a color."]);
    expect(errors?.icon).toEqual(["Choose an icon."]);
  });

  it("limits names to 40 characters", () => {
    const result = parseCreateCategory({ ...valid, name: "x".repeat(41) });
    expect(fieldErrorsOf(result.error!)?.name).toEqual([
      "Use at most 40 characters.",
    ]);
  });
});

describe("parseUpdateCategory", () => {
  it("ignores kind, which can't change", () => {
    const result = parseUpdateCategory({ ...valid, kind: "income" });
    expect(result.success && result.data).toEqual({
      name: "Pets",
      color: "amber",
      icon: "paw-print",
    });
  });
});
