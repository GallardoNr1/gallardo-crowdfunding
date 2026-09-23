import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  generateTempPassword,
  inviteTenantOwner,
} from '../src/lib/tenant-invite-server';

function fakeAdmin(
  overrides: { inviteError?: string; createError?: string } = {}
) {
  const inviteUserByEmail = vi.fn(async () => ({
    data: { user: { id: 'u2' } },
    error: overrides.inviteError ? { message: overrides.inviteError } : null,
  }));
  const createUser = vi.fn(async () => ({
    data: { user: { id: 'u3' } },
    error: overrides.createError ? { message: overrides.createError } : null,
  }));
  const admin = {
    auth: { admin: { inviteUserByEmail, createUser } },
  } as unknown as SupabaseClient;
  return { admin, inviteUserByEmail, createUser };
}

describe('generateTempPassword', () => {
  it('produces at least 12 characters without ambiguous ones', () => {
    for (let i = 0; i < 20; i++) {
      const pw = generateTempPassword();
      expect(pw.length).toBeGreaterThanOrEqual(12);
      expect(pw).not.toMatch(/[0O1lI]/);
    }
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });
});

describe('inviteTenantOwner', () => {
  it('sends an invitation email with the space name and the confirm redirect', async () => {
    const { admin, inviteUserByEmail, createUser } = fakeAdmin();
    const r = await inviteTenantOwner(admin, {
      email: ' Nueva@Example.com ',
      spaceName: ' Familia Nueva ',
      mode: 'email',
      redirectTo: 'https://gc.example/auth/confirm',
    });
    expect(r).toEqual({ ok: true, mode: 'email', email: 'nueva@example.com' });
    expect(inviteUserByEmail).toHaveBeenCalledWith('nueva@example.com', {
      data: { space_name: 'Familia Nueva' },
      redirectTo: 'https://gc.example/auth/confirm',
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('creates a confirmed account with a temporary password when asked', async () => {
    const { admin, createUser } = fakeAdmin();
    const r = await inviteTenantOwner(
      admin,
      {
        email: 'nueva@example.com',
        spaceName: 'Familia Nueva',
        mode: 'password',
        redirectTo: '',
      },
      { generatePassword: () => 'Temporal-12345' }
    );
    expect(r).toEqual({
      ok: true,
      mode: 'password',
      email: 'nueva@example.com',
      tempPassword: 'Temporal-12345',
    });
    expect(createUser).toHaveBeenCalledWith({
      email: 'nueva@example.com',
      password: 'Temporal-12345',
      email_confirm: true,
      user_metadata: { space_name: 'Familia Nueva' },
    });
  });

  it('rejects a bad email or an empty space name before calling Supabase', async () => {
    const { admin, inviteUserByEmail } = fakeAdmin();
    const bad = await inviteTenantOwner(admin, {
      email: 'x',
      spaceName: 'A',
      mode: 'email',
      redirectTo: '',
    });
    expect(bad.ok).toBe(false);
    const empty = await inviteTenantOwner(admin, {
      email: 'a@b.co',
      spaceName: '  ',
      mode: 'email',
      redirectTo: '',
    });
    expect(empty.ok).toBe(false);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('reports Supabase errors', async () => {
    const { admin } = fakeAdmin({
      createError: 'A user with this email address has already been registered',
    });
    const r = await inviteTenantOwner(admin, {
      email: 'a@b.co',
      spaceName: 'A',
      mode: 'password',
      redirectTo: '',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/already/);
  });
});
