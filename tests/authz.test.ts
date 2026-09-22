import { describe, expect, it } from 'vitest';
import { isAdminUser } from '../src/lib/authz';

describe('isAdminUser', () => {
  it('allows a user whose app_metadata.role is admin', () => {
    expect(
      isAdminUser({ email: 'x@y.com', app_metadata: { role: 'admin' } }, [])
    ).toBe(true);
  });

  it('allows a user whose email is in the allowlist, case-insensitively', () => {
    expect(
      isAdminUser({ email: 'Ana@Gallardo.com', app_metadata: {} }, [
        'ana@gallardo.com',
      ])
    ).toBe(true);
  });

  it('denies everyone else', () => {
    expect(isAdminUser({ email: 'x@y.com', app_metadata: {} }, [])).toBe(false);
    expect(
      isAdminUser({ email: 'x@y.com', app_metadata: { role: 'user' } }, [
        'other@y.com',
      ])
    ).toBe(false);
  });

  it('denies a user without email or metadata', () => {
    expect(isAdminUser(null, ['x@y.com'])).toBe(false);
    expect(isAdminUser({}, ['x@y.com'])).toBe(false);
  });
});
