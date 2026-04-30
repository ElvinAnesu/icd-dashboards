export type CashflowCurrency = "TZS" | "USD";

const TZS_PER_USD = 2500;

export function convertTzsMillions(valueInTzsMillions: number, currency: CashflowCurrency): number {
  return currency === "USD" ? valueInTzsMillions / TZS_PER_USD : valueInTzsMillions;
}

export function formatCurrencyMillions(valueInTzsMillions: number, currency: CashflowCurrency): string {
  const converted = convertTzsMillions(valueInTzsMillions, currency);
  const decimals = currency === "USD" ? 2 : 0;
  return `${currency} ${converted.toFixed(decimals)}M`;
}

export function formatAxisTick(value: number | string, currency: CashflowCurrency): string {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return `${currency} 0M`;
  return `${currency} ${num}M`;
}
