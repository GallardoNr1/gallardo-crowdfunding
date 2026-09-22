import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../src/lib/html';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml('<img src=x onerror="a" data-b=\'c\'> & fin')).toBe(
      '&lt;img src=x onerror=&quot;a&quot; data-b=&#39;c&#39;&gt; &amp; fin'
    );
  });

  it('returns an empty string for null or undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('stringifies non-string values', () => {
    expect(escapeHtml(25)).toBe('25');
  });
});
