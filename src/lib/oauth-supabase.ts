// Cliente real de Supabase Auth para el flujo PKCE de Google (solo servidor: usa env).
import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import {
  OAUTH_STORAGE_KEY,
  type AuthFactory,
  type PkceAuthLike,
} from './oauth-server';

/** PKCE con el verificador en el storage que le pasamos (en vez de localStorage). */
export const supabasePkceAuth: AuthFactory = (storage) =>
  createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      storageKey: OAUTH_STORAGE_KEY,
      storage,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }).auth as unknown as PkceAuthLike;
