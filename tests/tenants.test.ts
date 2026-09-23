import { describe, expect, it } from 'vitest';
import {
  isTenantNumber,
  parseTenantParam,
  projectUrl,
  tenantInitials,
  tenantUrl,
} from '../src/lib/tenants';

describe('isTenantNumber', () => {
  it('accepts exactly six digits', () => {
    expect(isTenantNumber('123456')).toBe(true);
    expect(isTenantNumber('000001')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isTenantNumber('12345')).toBe(false);
    expect(isTenantNumber('1234567')).toBe(false);
    expect(isTenantNumber('abc123')).toBe(false);
    expect(isTenantNumber(' 123456')).toBe(false);
    expect(isTenantNumber(123456)).toBe(false);
    expect(isTenantNumber(undefined)).toBe(false);
  });
});

describe('parseTenantParam', () => {
  it('returns the number for a valid route param and null otherwise', () => {
    expect(parseTenantParam('123456')).toBe(123456);
    expect(parseTenantParam('admin')).toBeNull();
    expect(parseTenantParam(undefined)).toBeNull();
  });
});

describe('urls', () => {
  it('builds the space and project urls', () => {
    expect(tenantUrl(123456)).toBe('/123456');
    expect(projectUrl(123456, 'bici-maximo')).toBe(
      '/123456/projects/bici-maximo'
    );
  });
});

describe('tenantInitials', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(tenantInitials('Familia Gallardo')).toBe('FG');
    expect(tenantInitials('máximo')).toBe('M');
    expect(tenantInitials('  los  tres   cerditos ')).toBe('LT');
  });

  it('falls back to a question mark for an empty name', () => {
    expect(tenantInitials('')).toBe('?');
    expect(tenantInitials('   ')).toBe('?');
  });
});
