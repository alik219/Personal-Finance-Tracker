// Money is stored as an integer count of the currency's minor unit
// (cents for USD, yen for JPY, fils for KWD) and never as a float.
// Negative amounts are outflows.

const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf("currency"));

export function isCurrencyCode(code: string): boolean {
  return SUPPORTED_CURRENCIES.has(code);
}

function assertCurrency(code: string): void {
  if (!isCurrencyCode(code)) {
    throw new RangeError(`Unsupported currency code: ${code}`);
  }
}

/** Number of minor-unit digits: JPY 0, USD 2, KWD 3. */
export function currencyDecimals(code: string): number {
  assertCurrency(code);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
  }).resolvedOptions().maximumFractionDigits!;
}

export type DecimalSeparator = "." | ",";

export type ParseAmountError = "empty" | "invalid" | "too_many_decimals";

export type ParseAmountResult =
  { ok: true; value: bigint } | { ok: false; error: ParseAmountError };

/**
 * Parses user-typed text into minor units, e.g. "1,234.5" USD -> 123450n.
 * Accepts a leading +/- and thousands separators (the separator that isn't
 * the decimal one, or spaces). Never rounds: more decimals than the
 * currency allows is an error.
 */
export function parseAmount(
  input: string,
  currency: string,
  { decimalSeparator = "." }: { decimalSeparator?: DecimalSeparator } = {},
): ParseAmountResult {
  const decimals = currencyDecimals(currency);
  const text = input.trim();
  if (text === "") return { ok: false, error: "empty" };

  // `\s` also matches the non-breaking space some locales use for thousands.
  const thousandsSplitter = decimalSeparator === "." ? /[\s,]/ : /[\s.]/;
  const match = /^([+-]?)(\d[\d\s,.]*)$/.exec(text);
  if (!match) return { ok: false, error: "invalid" };
  const [, sign, body] = match;

  const lastDecimal = body.lastIndexOf(decimalSeparator);
  const intRaw = lastDecimal === -1 ? body : body.slice(0, lastDecimal);
  const fraction = lastDecimal === -1 ? "" : body.slice(lastDecimal + 1);

  // Thousands groups must be exactly three digits: "1,234" but not "12,34".
  const groups = intRaw.split(thousandsSplitter);
  const groupsValid =
    groups.length === 1
      ? /^\d+$/.test(groups[0])
      : /^\d{1,3}$/.test(groups[0]) &&
        groups.slice(1).every((g) => /^\d{3}$/.test(g));
  if (!groupsValid || !/^\d*$/.test(fraction)) {
    return { ok: false, error: "invalid" };
  }
  if (fraction.length > decimals) {
    return { ok: false, error: "too_many_decimals" };
  }

  const digits = groups.join("") + fraction.padEnd(decimals, "0");
  const magnitude = BigInt(digits);
  return { ok: true, value: sign === "-" ? -magnitude : magnitude };
}

/** Exact plain decimal string, e.g. -123450n USD -> "-1234.50". */
export function toDecimalString(minor: bigint, currency: string): string {
  const decimals = currencyDecimals(currency);
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor)
    .toString()
    .padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals);
  return `${negative ? "-" : ""}${whole}${decimals > 0 ? `.${fraction}` : ""}`;
}

export type FormatMoneyOptions = {
  locale?: string;
  signDisplay?: Intl.NumberFormatOptions["signDisplay"];
};

/** Display string, e.g. 123450n USD -> "$1,234.50". */
export function formatMoney(
  minor: bigint,
  currency: string,
  { locale = "en-US", signDisplay = "auto" }: FormatMoneyOptions = {},
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    signDisplay,
  });
  // Intl formats decimal strings exactly, so no float conversion happens.
  return formatter.format(
    toDecimalString(minor, currency) as Intl.StringNumericLiteral,
  );
}
