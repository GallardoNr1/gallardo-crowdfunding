import { describe, expect, it, vi } from 'vitest';
import {
  handleConfirm,
  handleEmailChange,
  handleLogin,
  handlePasswordChange,
  handleRecover,
  handleRegister,
  type AuthApi,
  type AuthSession,
} from '../src/lib/auth-routes';

const session: AuthSession = {
  access_token: 'a',
  refresh_token: 'r',
  user: {
    id: 'u1',
    email: 'ana@example.com',
    app_metadata: {},
    user_metadata: {},
  },
};

function fakeAuth(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    signInWithPassword: vi.fn(async () => ({ session, error: null })),
    signUp: vi.fn(async () => ({ session: null, error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    verifyOtp: vi.fn(async () => ({ session, error: null })),
    updatePassword: vi.fn(async () => ({ error: null })),
    updateEmail: vi.fn(async () => ({ error: null })),
    ...overrides,
  };
}

const okLimiter = { hit: () => ({ ok: true, retryAfterMs: 0 }) };
const blockedLimiter = { hit: () => ({ ok: false, retryAfterMs: 30_000 }) };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe('handleLogin', () => {
  it('returns the session for valid credentials', async () => {
    const auth = fakeAuth();
    const r = await handleLogin(
      form({ email: ' Ana@Example.com ', password: 'secret123' }),
      '1.1.1.1',
      {
        auth,
        limiter: okLimiter,
      }
    );
    expect(r).toEqual({ ok: true, session });
    expect(auth.signInWithPassword).toHaveBeenCalledWith(
      'ana@example.com',
      'secret123'
    );
  });

  it('rejects an invalid form with field errors', async () => {
    const r = await handleLogin(
      form({ email: 'nope', password: '' }),
      '1.1.1.1',
      {
        auth: fakeAuth(),
        limiter: okLimiter,
      }
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
    expect(r.fields).toHaveProperty('email');
  });

  it('answers 401 with a neutral message when Supabase rejects the credentials', async () => {
    const auth = fakeAuth({
      signInWithPassword: vi.fn(async () => ({
        session: null,
        error: 'Invalid login credentials',
      })),
    });
    const r = await handleLogin(
      form({ email: 'ana@example.com', password: 'wrong-one' }),
      '1.1.1.1',
      {
        auth,
        limiter: okLimiter,
      }
    );
    expect(r).toEqual({
      ok: false,
      status: 401,
      error: 'Email o contraseña incorrectos.',
    });
  });

  it('answers 429 when the IP is rate limited, without calling Supabase', async () => {
    const auth = fakeAuth();
    const r = await handleLogin(
      form({ email: 'ana@example.com', password: 'secret123' }),
      '1.1.1.1',
      {
        auth,
        limiter: blockedLimiter,
      }
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(429);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe('handleRegister', () => {
  const valid = {
    space_name: ' Familia Ana ',
    email: 'ana@example.com',
    password: 'secret123',
    accept_privacy: 'on',
  };

  it('signs up with the space name and the confirmation redirect, and reports when confirmation is pending', async () => {
    const auth = fakeAuth();
    const r = await handleRegister(
      form(valid),
      '1.1.1.1',
      'https://gc.example',
      { auth, limiter: okLimiter }
    );
    expect(r).toEqual({ ok: true, session: null });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'secret123',
      spaceName: 'Familia Ana',
      emailRedirectTo: 'https://gc.example/auth/confirm',
    });
  });

  it('returns the session when Supabase creates it directly (confirmation disabled)', async () => {
    const auth = fakeAuth({
      signUp: vi.fn(async () => ({ session, error: null })),
    });
    const r = await handleRegister(
      form(valid),
      '1.1.1.1',
      'https://gc.example',
      { auth, limiter: okLimiter }
    );
    expect(r).toEqual({ ok: true, session });
  });

  it('requires the privacy checkbox and a password of at least 8 characters', async () => {
    const noPrivacy = await handleRegister(
      form({ ...valid, accept_privacy: '' }),
      '1.1.1.1',
      'https://gc.example',
      {
        auth: fakeAuth(),
        limiter: okLimiter,
      }
    );
    expect(noPrivacy.ok).toBe(false);
    if (!noPrivacy.ok)
      expect(noPrivacy.fields).toHaveProperty('accept_privacy');
    const short = await handleRegister(
      form({ ...valid, password: 'abc' }),
      '1.1.1.1',
      'https://gc.example',
      {
        auth: fakeAuth(),
        limiter: okLimiter,
      }
    );
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.fields).toHaveProperty('password');
  });

  it('turns a Supabase error into a neutral 400', async () => {
    const auth = fakeAuth({
      signUp: vi.fn(async () => ({
        session: null,
        error: 'User already registered',
      })),
    });
    const r = await handleRegister(
      form(valid),
      '1.1.1.1',
      'https://gc.example',
      { auth, limiter: okLimiter }
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
    expect(r.error).not.toMatch(/already/);
  });
});

describe('handleRecover', () => {
  it('always succeeds for a well-formed email, even if Supabase reports an error', async () => {
    const auth = fakeAuth({
      resetPasswordForEmail: vi.fn(async () => ({ error: 'User not found' })),
    });
    const r = await handleRecover(
      form({ email: 'nadie@example.com' }),
      '1.1.1.1',
      'https://gc.example',
      {
        auth,
        limiter: okLimiter,
      }
    );
    expect(r).toEqual({ ok: true });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'nadie@example.com',
      'https://gc.example/auth/confirm'
    );
  });

  it('rejects a malformed email and a rate-limited IP', async () => {
    const bad = await handleRecover(
      form({ email: 'x' }),
      '1.1.1.1',
      'https://gc.example',
      {
        auth: fakeAuth(),
        limiter: okLimiter,
      }
    );
    expect(bad.ok).toBe(false);
    const limited = await handleRecover(
      form({ email: 'a@b.co' }),
      '1.1.1.1',
      'https://gc.example',
      {
        auth: fakeAuth(),
        limiter: blockedLimiter,
      }
    );
    expect(limited.ok).toBe(false);
    if (!limited.ok) expect(limited.status).toBe(429);
  });
});

describe('handleConfirm', () => {
  it('verifies the token hash and returns the session with its type', async () => {
    const auth = fakeAuth();
    const r = await handleConfirm(
      { token_hash: 'abc', type: 'recovery' },
      { auth }
    );
    expect(r).toEqual({ ok: true, session, type: 'recovery' });
    expect(auth.verifyOtp).toHaveBeenCalledWith('abc', 'recovery');
  });

  it('rejects missing or unknown parameters and expired links', async () => {
    expect(
      (
        await handleConfirm(
          { token_hash: null, type: 'signup' },
          { auth: fakeAuth() }
        )
      ).ok
    ).toBe(false);
    expect(
      (
        await handleConfirm(
          { token_hash: 'abc', type: 'weird' },
          { auth: fakeAuth() }
        )
      ).ok
    ).toBe(false);
    const expired = fakeAuth({
      verifyOtp: vi.fn(async () => ({
        session: null,
        error: 'Token has expired',
      })),
    });
    const r = await handleConfirm(
      { token_hash: 'abc', type: 'signup' },
      { auth: expired }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/caducado/);
  });
});

describe('handlePasswordChange', () => {
  it('updates the password when both fields match', async () => {
    const auth = fakeAuth();
    const r = await handlePasswordChange(
      form({ password: 'newsecret1', password2: 'newsecret1' }),
      'u1',
      { auth }
    );
    expect(r).toEqual({ ok: true });
    expect(auth.updatePassword).toHaveBeenCalledWith('u1', 'newsecret1');
  });

  it('rejects mismatching or short passwords', async () => {
    const mismatch = await handlePasswordChange(
      form({ password: 'newsecret1', password2: 'other' }),
      'u1',
      {
        auth: fakeAuth(),
      }
    );
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.fields).toHaveProperty('password2');
    const short = await handlePasswordChange(
      form({ password: 'abc', password2: 'abc' }),
      'u1',
      { auth: fakeAuth() }
    );
    expect(short.ok).toBe(false);
  });
});

describe('handleEmailChange', () => {
  const user = { id: 'u1', email: 'ana@example.com' };

  it('checks the current password and updates the email', async () => {
    const auth = fakeAuth();
    const r = await handleEmailChange(
      form({ new_email: ' Ana.Nueva@Example.com ', password: 'secret123' }),
      user,
      { auth }
    );
    expect(r).toEqual({ ok: true, email: 'ana.nueva@example.com' });
    expect(auth.signInWithPassword).toHaveBeenCalledWith(
      'ana@example.com',
      'secret123'
    );
    expect(auth.updateEmail).toHaveBeenCalledWith(
      'u1',
      'ana.nueva@example.com'
    );
  });

  it('rejects a wrong password without changing anything', async () => {
    const auth = fakeAuth({
      signInWithPassword: vi.fn(async () => ({
        session: null,
        error: 'Invalid login credentials',
      })),
    });
    const r = await handleEmailChange(
      form({ new_email: 'x@y.com', password: 'wrong' }),
      user,
      { auth }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
    expect(auth.updateEmail).not.toHaveBeenCalled();
  });

  it('rejects the same email or a malformed one', async () => {
    const same = await handleEmailChange(
      form({ new_email: 'ana@example.com', password: 'secret123' }),
      user,
      {
        auth: fakeAuth(),
      }
    );
    expect(same.ok).toBe(false);
    if (!same.ok) expect(same.fields).toHaveProperty('new_email');
    const bad = await handleEmailChange(
      form({ new_email: 'nope', password: 'secret123' }),
      user,
      {
        auth: fakeAuth(),
      }
    );
    expect(bad.ok).toBe(false);
  });
});
