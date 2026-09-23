import { describe, expect, it } from 'vitest';
import {
  isTenantNumber,
  parseTenantParam,
  projectUrl,
  siteOrigin,
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

describe('siteOrigin', () => {
  it('prefers the reverse proxy headers over the local origin', () => {
    const headers = new Headers({
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'gc.gallardcode.com',
      host: '127.0.0.1:5025',
    });
    expect(siteOrigin(headers, 'http://127.0.0.1:5025')).toBe(
      'https://gc.gallardcode.com'
    );
  });

  it('uses the Host header with the given protocol when there is no proxy', () => {
    expect(
      siteOrigin(
        new Headers({ host: 'localhost:4321' }),
        'http://localhost:4321'
      )
    ).toBe('http://localhost:4321');
  });

  it('falls back to the origin when there are no headers', () => {
    expect(siteOrigin(new Headers(), 'http://127.0.0.1:5025')).toBe(
      'http://127.0.0.1:5025'
    );
  });
});
