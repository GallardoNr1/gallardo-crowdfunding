import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/lib/env-schema';

const valid = {
  PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(40),
  SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(40),
};

describe('parseEnv', () => {
  it('names the missing variable when the env is empty', () => {
    expect(() => parseEnv({})).toThrow(/PUBLIC_SUPABASE_URL/);
  });

  it('rejects a Supabase URL that is not a URL', () => {
    expect(() => parseEnv({ ...valid, PUBLIC_SUPABASE_URL: 'abc' })).toThrow(
      /PUBLIC_SUPABASE_URL/
    );
  });

  it('returns typed config with an empty admin list by default', () => {
    const env = parseEnv(valid);
    expect(env.supabaseUrl).toBe('https://abc.supabase.co');
    expect(env.supabaseServiceRoleKey).toBe('b'.repeat(40));
    expect(env.adminEmails).toEqual([]);
  });

  it('splits, trims and lowercases ADMIN_EMAILS', () => {
    const env = parseEnv({ ...valid, ADMIN_EMAILS: 'a@x.com, B@X.com ,, ' });
    expect(env.adminEmails).toEqual(['a@x.com', 'b@x.com']);
  });
});
