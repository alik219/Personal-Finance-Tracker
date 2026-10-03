import { describe, expect, it } from "vitest";

import { niceTicks } from "./axis";

describe("niceTicks", () => {
  it("picks round steps", () => {
    expect(niceTicks(3000)).toEqual([0, 1000, 2000, 3000]);
    expect(niceTicks(1370)).toEqual([0, 500, 1000, 1500]);
    expect(niceTicks(8.5)).toEqual([0, 2.5, 5, 7.5, 10]);
    expect(niceTicks(123456)).toEqual([0, 50000, 100000, 150000]);
  });

  it("always covers the maximum", () => {
    for (const max of [1, 7, 99, 101, 4999, 5001, 0.3]) {
      const ticks = niceTicks(max);
      expect(ticks[0]).toBe(0);
      expect(ticks.at(-1)!).toBeGreaterThanOrEqual(max);
      expect(ticks.length).toBeLessThanOrEqual(6);
    }
  });

  it("has a sensible axis for no data", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
