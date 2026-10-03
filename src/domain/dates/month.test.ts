import { describe, expect, it } from "vitest";

import {
  addMonths,
  currentMonth,
  daysInMonth,
  formatDate,
  formatMonth,
  isISODate,
  isMonthKey,
  isValidTimeZone,
  monthOf,
  monthRange,
  today,
} from "./month";

describe("daysInMonth", () => {
  it("handles month lengths and leap years", () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });
});

describe("isISODate / isMonthKey", () => {
  it("accepts real calendar dates only", () => {
    expect(isISODate("2026-10-02")).toBe(true);
    expect(isISODate("2028-02-29")).toBe(true);
    expect(isISODate("2026-02-29")).toBe(false);
    expect(isISODate("2026-13-01")).toBe(false);
    expect(isISODate("2026-10-2")).toBe(false);
    expect(isISODate("02/10/2026")).toBe(false);
  });

  it("accepts YYYY-MM months only", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
  });
});

describe("today / currentMonth across timezones", () => {
  // 2026-10-01 02:30 UTC: still Sept 30 in the Americas, Oct 1 elsewhere.
  const instant = new Date("2026-10-01T02:30:00Z");

  it.each([
    ["UTC", "2026-10-01"],
    ["America/New_York", "2026-09-30"],
    ["America/Los_Angeles", "2026-09-30"],
    ["Europe/London", "2026-10-01"],
    ["Asia/Karachi", "2026-10-01"],
    ["Pacific/Auckland", "2026-10-01"],
  ])("%s -> %s", (timeZone, expected) => {
    expect(today(timeZone, instant)).toBe(expected);
    expect(currentMonth(timeZone, instant)).toBe(expected.slice(0, 7));
  });

  it("rolls the year over at different instants per zone", () => {
    const newYearUtc = new Date("2027-01-01T00:00:00Z");
    expect(currentMonth("Pacific/Auckland", newYearUtc)).toBe("2027-01");
    expect(currentMonth("America/Los_Angeles", newYearUtc)).toBe("2026-12");
  });

  it("rejects unknown timezones", () => {
    expect(isValidTimeZone("Asia/Karachi")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(() => today("Mars/Olympus")).toThrow(RangeError);
  });
});

describe("monthOf", () => {
  it("returns the month of a date", () => {
    expect(monthOf("2026-10-02")).toBe("2026-10");
    expect(() => monthOf("2026-02-30")).toThrow(RangeError);
  });
});

describe("addMonths", () => {
  it.each([
    ["2026-10", 1, "2026-11"],
    ["2026-12", 1, "2027-01"],
    ["2026-01", -1, "2025-12"],
    ["2026-10", -22, "2024-12"],
    ["2026-10", 15, "2028-01"],
    ["2026-10", 0, "2026-10"],
  ])("%s %+i -> %s", (month, count, expected) => {
    expect(addMonths(month, count)).toBe(expected);
  });
});

describe("monthRange", () => {
  it("covers a normal month", () => {
    expect(monthRange("2026-10")).toEqual({
      start: "2026-10-01",
      end: "2026-10-31",
      endExclusive: "2026-11-01",
    });
  });

  it("handles February in leap and non-leap years", () => {
    expect(monthRange("2026-02").end).toBe("2026-02-28");
    expect(monthRange("2028-02").end).toBe("2028-02-29");
  });

  it("crosses the year boundary", () => {
    expect(monthRange("2026-12").endExclusive).toBe("2027-01-01");
  });

  it("rejects invalid months", () => {
    expect(() => monthRange("2026-13")).toThrow(RangeError);
  });
});

describe("formatMonth", () => {
  it("formats in the given locale", () => {
    expect(formatMonth("2026-10")).toBe("October 2026");
    expect(formatMonth("2026-01", { locale: "de-DE" })).toBe("Januar 2026");
  });
});

describe("formatDate", () => {
  it("formats the calendar date without shifting it by time zone", () => {
    expect(formatDate("2026-03-05")).toBe("Mar 5, 2026");
    expect(formatDate("2026-12-31")).toBe("Dec 31, 2026");
    expect(formatDate("2026-01-01", { locale: "en-GB" })).toBe("1 Jan 2026");
  });
});
