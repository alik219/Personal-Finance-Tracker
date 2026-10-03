// Transactions carry a plain calendar date ("2026-10-02"), never a time.
// A timezone only matters when asking "what is today?", which decides the
// current month for budgets and the dashboard.

/** Calendar date, "YYYY-MM-DD". */
export type ISODate = string;
/** Calendar month, "YYYY-MM". */
export type MonthKey = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isISODate(value: string): value is ISODate {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  );
}

export function isMonthKey(value: string): value is MonthKey {
  const m = MONTH_KEY.exec(value);
  return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

function parseMonth(month: MonthKey): { year: number; month: number } {
  if (!isMonthKey(month)) throw new RangeError(`Invalid month: ${month}`);
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) };
}

function toMonthKey(year: number, month: number): MonthKey {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Today's calendar date in the given IANA timezone. */
export function today(timeZone: string, now: Date = new Date()): ISODate {
  if (!isValidTimeZone(timeZone)) {
    throw new RangeError(`Invalid time zone: ${timeZone}`);
  }
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function monthOf(date: ISODate): MonthKey {
  if (!isISODate(date)) throw new RangeError(`Invalid date: ${date}`);
  return date.slice(0, 7);
}

export function currentMonth(
  timeZone: string,
  now: Date = new Date(),
): MonthKey {
  return monthOf(today(timeZone, now));
}

export function addMonths(month: MonthKey, count: number): MonthKey {
  const { year, month: m } = parseMonth(month);
  const index = year * 12 + (m - 1) + count;
  return toMonthKey(Math.floor(index / 12), (index % 12) + 1);
}

export type MonthRange = {
  /** First day of the month, inclusive. */
  start: ISODate;
  /** Last day of the month, inclusive (for display). */
  end: ISODate;
  /** First day of the next month, for `date >= start and date < endExclusive`. */
  endExclusive: ISODate;
};

export function monthRange(month: MonthKey): MonthRange {
  const { year, month: m } = parseMonth(month);
  const last = String(daysInMonth(year, m)).padStart(2, "0");
  return {
    start: `${month}-01`,
    end: `${month}-${last}`,
    endExclusive: `${addMonths(month, 1)}-01`,
  };
}

/** E.g. "2026-10" -> "October 2026". */
export function formatMonth(
  month: MonthKey,
  { locale = "en-US" }: { locale?: string } = {},
): string {
  const { year, month: m } = parseMonth(month);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(year, m - 1, 1)));
}

/** E.g. "2026-03-05" -> "Mar 5, 2026". Calendar dates have no time zone. */
export function formatDate(
  date: ISODate,
  { locale = "en-US" }: { locale?: string } = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}
