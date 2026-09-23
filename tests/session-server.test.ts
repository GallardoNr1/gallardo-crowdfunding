import { SignJWT } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import {
  resolveSession,
  verifyAccessToken,
  type AuthUser,
  type SessionCookieStore,
} from '../src/lib/session-server';

const SECRET = 'super-secret-jwt-key-for-tests-0123456789';
const secretBytes = new TextEncoder().encode(SECRET);

async function sign(overrides: { exp?: string; secret?: Uint8Array } = {}) {
  return new SignJWT({
    email: 'ana@example.com',
    app_metadata: { role: 'admin' },
    user_metadata: { space_name: 'Familia Ana' },
    role: 'authenticated',
    aud: 'authenticated',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-1')
    .setIssuedAt()
    .setExpirationTime(overrides.exp ?? '1h')
    .sign(overrides.secret ?? secretBytes);
}

describe('verifyAccessToken', () => {
  it('returns the user from a valid HS256 token without calling Supabase', async () => {
    const getUser = vi.fn();
    const user = await verifyAccessToken(await sign(), {
      secret: SECRET,
      getUser,
    });
    expect(user).toEqual({
      id: 'user-1',
      email: 'ana@example.com',
      app_metadata: { role: 'admin' },
      user_metadata: { space_name: 'Familia Ana' },
    });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('rejects expired tokens and bad signatures', async () => {
    expect(
      await verifyAccessToken(await sign({ exp: '-1h' }), { secret: SECRET })
    ).toBeNull();
    const other = new TextEncoder().encode(
      'another-secret-that-is-long-enough-123456'
    );
    expect(
      await verifyAccessToken(await sign({ secret: other }), { secret: SECRET })
    ).toBeNull();
    expect(await verifyAccessToken('not-a-jwt', { secret: SECRET })).toBeNull();
  });

  it('falls back to getUser when there is no secret', async () => {
    const remote: AuthUser = {
      id: 'u9',
      email: 'x@y.z',
      app_metadata: {},
      user_metadata: {},
    };
    const getUser = vi.fn(async () => remote);
    const token = await sign();
    expect(await verifyAccessToken(token, { secret: null, getUser })).toEqual(
      remote
    );
    expect(getUser).toHaveBeenCalledWith(token);
  });
});

function store(initial: Record<string, string>): SessionCookieStore & {
  set: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
} {
  const values = { ...initial };
  return {
    get: (name) => values[name],
    set: vi.fn(),
    clear: vi.fn(),
  };
}

describe('resolveSession', () => {
  it('returns null without cookies and never calls refresh', async () => {
    const refresh = vi.fn();
    expect(
      await resolveSession(store({}), { secret: SECRET, refresh })
    ).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('uses the access token when it is valid', async () => {
    const refresh = vi.fn();
    const cookies = store({
      'sb-access-token': await sign(),
      'sb-refresh-token': 'r1',
    });
    const user = await resolveSession(cookies, { secret: SECRET, refresh });
    expect(user?.id).toBe('user-1');
    expect(refresh).not.toHaveBeenCalled();
    expect(cookies.set).not.toHaveBeenCalled();
  });

  it('refreshes with the refresh token when the access token is expired and stores the new cookies', async () => {
    const fresh = await sign();
    const refreshed: AuthUser = {
      id: 'user-1',
      email: 'ana@example.com',
      app_metadata: {},
      user_metadata: {},
    };
    const refresh = vi.fn(async () => ({
      access_token: fresh,
      refresh_token: 'r2',
      user: refreshed,
    }));
    const cookies = store({
      'sb-access-token': await sign({ exp: '-1h' }),
      'sb-refresh-token': 'r1',
    });
    const user = await resolveSession(cookies, { secret: SECRET, refresh });
    expect(user).toEqual(refreshed);
    expect(refresh).toHaveBeenCalledWith('r1');
    expect(cookies.set).toHaveBeenCalledWith({
      access_token: fresh,
      refresh_token: 'r2',
    });
  });

  it('clears the cookies when the refresh fails', async () => {
    const refresh = vi.fn(async () => null);
    const cookies = store({
      'sb-access-token': 'garbage',
      'sb-refresh-token': 'r1',
    });
    expect(
      await resolveSession(cookies, { secret: SECRET, refresh })
    ).toBeNull();
    expect(cookies.clear).toHaveBeenCalled();
  });
});
