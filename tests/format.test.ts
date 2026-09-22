import { describe, expect, it } from 'vitest';
import { currencySymbol, formatAmount } from '../src/lib/format';

describe('currencySymbol', () => {
  it('maps known ISO codes to their symbol', () => {
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('usd')).toBe('$');
    expect(currencySymbol('GBP')).toBe('£');
  });

  it('falls back to the code itself, or € when empty', () => {
    expect(currencySymbol('CHF')).toBe('CHF');
    expect(currencySymbol(undefined)).toBe('€');
    expect(currencySymbol('')).toBe('€');
  });
});

describe('formatAmount', () => {
  it('formats with two decimals and the currency symbol', () => {
    expect(formatAmount(160, 'EUR')).toBe('160.00 €');
    expect(formatAmount('12.5', 'EUR')).toBe('12.50 €');
  });

  it('treats non-numeric input as zero', () => {
    expect(formatAmount(undefined, 'EUR')).toBe('0.00 €');
  });
});
