import { describe, expect, it } from "vitest";

import {
  alertMessage,
  budgetAlerts,
  budgetStatus,
  percentUsed,
} from "./alerts";

describe("budgetStatus", () => {
  it("is ok below 80%", () => {
    expect(budgetStatus(0n, 10000n)).toBe("ok");
    expect(budgetStatus(7999n, 10000n)).toBe("ok");
  });

  it("warns from exactly 80% up to the full budget", () => {
    expect(budgetStatus(8000n, 10000n)).toBe("warning");
    expect(budgetStatus(10000n, 10000n)).toBe("warning");
  });

  it("is over once spending passes the budget", () => {
    expect(budgetStatus(10001n, 10000n)).toBe("over");
  });

  it("has no rounding at the 80% edge for odd amounts", () => {
    // 80% of 333 is 266.4: 266 is under, 267 is over the line.
    expect(budgetStatus(266n, 333n)).toBe("ok");
    expect(budgetStatus(267n, 333n)).toBe("warning");
  });
});

describe("percentUsed", () => {
  it("rounds down and can pass 100", () => {
    expect(percentUsed(2550n, 10000n)).toBe(25);
    expect(percentUsed(9999n, 10000n)).toBe(99);
    expect(percentUsed(15000n, 10000n)).toBe(150);
  });

  it("is 0 for no or negative spending", () => {
    expect(percentUsed(0n, 10000n)).toBe(0);
    expect(percentUsed(-500n, 10000n)).toBe(0);
  });
});

describe("budgetAlerts", () => {
  it("splits budgets needing attention", () => {
    const budgets = [
      { id: "a", status: "ok" as const },
      { id: "b", status: "over" as const },
      { id: "c", status: "warning" as const },
    ];
    expect(budgetAlerts(budgets)).toEqual({
      over: [budgets[1]],
      warning: [budgets[2]],
    });
  });
});

describe("alertMessage", () => {
  it("is null when nothing needs attention", () => {
    expect(alertMessage([], [])).toBeNull();
  });

  it("names over and near-limit budgets", () => {
    expect(alertMessage(["Groceries"], [])).toBe("Groceries is over budget.");
    expect(alertMessage([], ["Travel", "Health", "Shopping"])).toBe(
      "Travel, Health and Shopping are close to the limit.",
    );
    expect(alertMessage(["Groceries", "Dining out"], ["Travel"])).toBe(
      "Groceries and Dining out are over budget. Travel is close to the limit.",
    );
  });

  it("mentions a category once, at its worst, across currencies", () => {
    expect(alertMessage(["Travel"], ["Travel", "Travel"])).toBe(
      "Travel is over budget.",
    );
  });
});
