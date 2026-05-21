/**
 * Money formatting helpers. Internally we store amounts in the smallest
 * currency unit (cents / KES "smallest"). Pesapal expects decimals, hence
 * `centsToDecimal`. KES has 2 decimal places; we use Intl for display.
 */

export const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY ?? "KES";

export function centsToDecimal(amountCents: number): number {
  return Math.round(amountCents) / 100;
}

export function decimalToCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Render amountCents in the given currency, e.g. 1234 → "KSh 12.34". */
export function formatMoney(amountCents: number, currency = DEFAULT_CURRENCY): string {
  const value = centsToDecimal(amountCents);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: currency === "KES" ? "symbol" : "narrowSymbol",
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Convenience: render an integer dollar/shilling-like budget (no cents). */
export function formatWholeAmount(
  amount: number,
  currency = DEFAULT_CURRENCY,
): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      currencyDisplay: currency === "KES" ? "symbol" : "narrowSymbol",
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
