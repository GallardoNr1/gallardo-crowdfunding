import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryStorage,
  finishOAuth,
  findCodeVerifier,
  startGoogleLogin,
  type PkceAuthLike,
} from '../src/lib/oauth-server';

/** Cliente de Auth falso: al pedir la URL guarda el verificador PKCE en el storage, como hace supabase-js. */
function fakeAuthFactory(
  opts: { url?: string | null; sessionFor?: string } = {}
) {
  const calls: { exchangeVerifier: string | null } = { exchangeVerifier: null };
  const makeAuth = (
    storage: ReturnType<typeof createMemoryStorage>
  ): PkceAuthLike => ({
    signInWithOAuth: vi.fn(async ({ options }) => {
      storage.setItem('gc-oauth-code-verifier', 'verifier-abc/signin');
      return {
        data: {
          url:
            opts.url === undefined
              ? `https://accounts.google.com/o?redirect=${options.redirectTo}`
              : opts.url,
        },
        error: opts.url === null ? { message: 'provider disabled' } : null,
      };
    }),
    exchangeCodeForSession: vi.fn(async (code: string) => {
      calls.exchangeVerifier = storage.getItem('gc-oauth-code-verifier');
      if (code !== (opts.sessionFor ?? 'code-1'))
        return { data: { session: null }, error: { message: 'bad code' } };
      return {
        data: {
          session: {
            access_token: 'at',
            refresh_token: 'rt',
            user: {
              id: 'u1',
              email: 'g@example.com',
              app_metadata: {},
              user_metadata: { full_name: 'G' },
            },
          },
        },
        error: null,
      };
    }),
  });
  return { makeAuth, calls };
}

describe('findCodeVerifier', () => {
  it('returns the value stored under the *-code-verifier key', () => {
    const storage = createMemoryStorage({
      'gc-oauth-code-verifier': 'v/signin',
      other: 'x',
    });
    expect(findCodeVerifier(storage)).toBe('v/signin');
    expect(findCodeVerifier(createMemoryStorage())).toBeNull();
  });
});

describe('startGoogleLogin', () => {
  it('returns the provider url and the PKCE verifier to keep in a cookie', async () => {
    const { makeAuth } = fakeAuthFactory();
    const r = await startGoogleLogin(
      makeAuth,
      'https://gc.example/auth/callback'
    );
    expect(r).toEqual({
      ok: true,
      url: 'https://accounts.google.com/o?redirect=https://gc.example/auth/callback',
      codeVerifier: 'verifier-abc/signin',
    });
  });

  it('fails cleanly when Supabase does not return a url', async () => {
    const { makeAuth } = fakeAuthFactory({ url: null });
    const r = await startGoogleLogin(
      makeAuth,
      'https://gc.example/auth/callback'
    );
    expect(r.ok).toBe(false);
  });
});

describe('finishOAuth', () => {
  it('restores the verifier and exchanges the code for a session', async () => {
    const { makeAuth, calls } = fakeAuthFactory();
    const session = await finishOAuth(
      makeAuth,
      'code-1',
      'verifier-abc/signin'
    );
    expect(calls.exchangeVerifier).toBe('verifier-abc/signin');
    expect(session).toEqual({
      access_token: 'at',
      refresh_token: 'rt',
      user: {
        id: 'u1',
        email: 'g@example.com',
        app_metadata: {},
        user_metadata: { full_name: 'G' },
      },
    });
  });

  it('returns null for a bad code', async () => {
    const { makeAuth } = fakeAuthFactory();
    expect(
      await finishOAuth(makeAuth, 'wrong', 'verifier-abc/signin')
    ).toBeNull();
  });
});
