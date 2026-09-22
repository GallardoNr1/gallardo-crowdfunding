const SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' };

/** Símbolo para un código ISO 4217; si no se conoce, el propio código. Vacío → €. */
export function currencySymbol(code?: string | null): string {
  const c = (code ?? '').trim().toUpperCase();
  if (!c) return '€';
  return SYMBOLS[c] ?? c;
}

/** "160.00 €" — entrada no numérica cuenta como 0. */
export function formatAmount(value: unknown, code?: string | null): string {
  const n = Number(value);
  return `${(Number.isFinite(n) ? n : 0).toFixed(2)} ${currencySymbol(code)}`;
}
