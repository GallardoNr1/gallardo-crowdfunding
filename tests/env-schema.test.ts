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

  it('keeps the optional Supabase JWT secret and nulls it when blank', () => {
    expect(parseEnv(valid).supabaseJwtSecret).toBeNull();
    expect(
      parseEnv({ ...valid, SUPABASE_JWT_SECRET: ' ' }).supabaseJwtSecret
    ).toBeNull();
    expect(
      parseEnv({ ...valid, SUPABASE_JWT_SECRET: 's'.repeat(40) })
        .supabaseJwtSecret
    ).toBe('s'.repeat(40));
  });

  it('builds the SMTP config only when a host is given', () => {
    expect(parseEnv(valid).smtp).toBeNull();
    const env = parseEnv({
      ...valid,
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'u',
      SMTP_PASS: 'p',
    });
    expect(env.smtp).toEqual({
      host: 'smtp.example.com',
      port: 587,
      user: 'u',
      pass: 'p',
      secure: false,
      from: 'Gallardo Crowdfunding <no-reply@smtp.example.com>',
    });
    expect(
      parseEnv({
        ...valid,
        SMTP_HOST: 'h',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        MAIL_FROM: 'GC <a@b.co>',
      }).smtp
    ).toMatchObject({
      port: 465,
      secure: true,
      from: 'GC <a@b.co>',
    });
  });

  it('leaves the Anthropic key null when missing or blank', () => {
    expect(parseEnv(valid).anthropicApiKey).toBeNull();
    expect(
      parseEnv({ ...valid, ANTHROPIC_API_KEY: '  ' }).anthropicApiKey
    ).toBeNull();
  });

  it('keeps the Anthropic key when present and rejects an obviously short one', () => {
    expect(
      parseEnv({ ...valid, ANTHROPIC_API_KEY: 'sk-ant-' + 'k'.repeat(30) })
        .anthropicApiKey
    ).toBe('sk-ant-' + 'k'.repeat(30));
    expect(() => parseEnv({ ...valid, ANTHROPIC_API_KEY: 'short' })).toThrow(
      /ANTHROPIC_API_KEY/
    );
  });

  it('keeps the optional Anthropic workspace id and nulls it when blank', () => {
    expect(parseEnv(valid).anthropicWorkspaceId).toBeNull();
    expect(
      parseEnv({ ...valid, ANTHROPIC_WORKSPACE_ID: ' ' }).anthropicWorkspaceId
    ).toBeNull();
    expect(
      parseEnv({ ...valid, ANTHROPIC_WORKSPACE_ID: ' wrkspc_abc ' })
        .anthropicWorkspaceId
    ).toBe('wrkspc_abc');
  });

  it('splits, trims and lowercases ADMIN_EMAILS', () => {
    const env = parseEnv({ ...valid, ADMIN_EMAILS: 'a@x.com, B@X.com ,, ' });
    expect(env.adminEmails).toEqual(['a@x.com', 'b@x.com']);
  });
});
