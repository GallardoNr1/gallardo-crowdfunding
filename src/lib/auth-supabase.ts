// Implementación de AuthApi con Supabase (solo servidor) y limitadores por IP de las páginas de cuenta.
import { createClient, type Session } from '@supabase/supabase-js';
import type { AuthApi, AuthSession } from './auth-routes';
import { env } from './env';
import { createRateLimiter } from './rate-limit';
import { createAdminClient } from './supabase-server';

const anonAuth = () =>
  createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }).auth;

const toSession = (session: Session | null): AuthSession | null =>
  session
    ? {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: {
          id: session.user.id,
          email: session.user.email ?? null,
          app_metadata: session.user.app_metadata ?? {},
          user_metadata: session.user.user_metadata ?? {},
        },
      }
    : null;

export const supabaseAuthApi: AuthApi = {
  async signInWithPassword(email, password) {
    const { data, error } = await anonAuth().signInWithPassword({
      email,
      password,
    });
    return { session: toSession(data.session), error: error?.message ?? null };
  },

  async signUp({ email, password, spaceName, emailRedirectTo }) {
    const { data, error } = await anonAuth().signUp({
      email,
      password,
      options: { data: { space_name: spaceName }, emailRedirectTo },
    });
    return { session: toSession(data.session), error: error?.message ?? null };
  },

  async resetPasswordForEmail(email, redirectTo) {
    const { error } = await anonAuth().resetPasswordForEmail(email, {
      redirectTo,
    });
    return { error: error?.message ?? null };
  },

  async verifyOtp(tokenHash, type) {
    const { data, error } = await anonAuth().verifyOtp({
      token_hash: tokenHash,
      type,
    });
    return { session: toSession(data.session), error: error?.message ?? null };
  },

  async updatePassword(userId, password) {
    const { error } = await createAdminClient().auth.admin.updateUserById(
      userId,
      { password }
    );
    return { error: error?.message ?? null };
  },
};

// Un proceso PM2: limitadores en memoria (ver rate-limit.ts).
export const authLimiters = {
  login: createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 }),
  register: createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }),
  recover: createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }),
};
