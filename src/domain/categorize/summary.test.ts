import { describe, expect, it } from "vitest";

import { summarizeRun } from "./summary";

const base = {
  considered: 20,
  categorized: 12,
  failedBatches: 0,
  moreRemain: false,
};

describe("summarizeRun", () => {
  it("reports how many were categorized", () => {
    expect(summarizeRun(base)).toEqual({
      success: "Categorized 12 of 20 transactions.",
    });
    expect(
      summarizeRun({ ...base, considered: 1, categorized: 1 }).success,
    ).toBe("Categorized 1 of 1 transaction.");
  });

  it("mentions busy batches and leftovers", () => {
    expect(
      summarizeRun({ ...base, failedBatches: 1, moreRemain: true }).success,
    ).toBe(
      "Categorized 12 of 20 transactions. Gemini was busy for some; try again in a minute. Run it again for the rest.",
    );
  });

  it("is an error when nothing worked because Gemini was busy", () => {
    expect(summarizeRun({ ...base, categorized: 0, failedBatches: 2 })).toEqual(
      {
        error: "Gemini is busy right now. Please try again in a minute.",
      },
    );
  });

  it("explains when there were simply no confident matches", () => {
    expect(summarizeRun({ ...base, categorized: 0 }).success).toMatch(
      /No confident matches/,
    );
  });
});
