export type CurrencyOption = { code: string; label: string };

/** Every supported ISO 4217 currency, e.g. { code: "USD", label: "USD · US Dollar" }. */
export function currencyOptions(locale = "en-US"): CurrencyOption[] {
  const names = new Intl.DisplayNames([locale], { type: "currency" });
  return Intl.supportedValuesOf("currency").map((code) => ({
    code,
    label: `${code} · ${names.of(code) ?? code}`,
  }));
}
