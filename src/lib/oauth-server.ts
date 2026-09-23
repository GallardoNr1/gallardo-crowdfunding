// Login con Google (Supabase OAuth, flujo PKCE en servidor). Solo servidor.
//   /auth/google   → startGoogleLogin: pide a Supabase la URL de Google; el verificador PKCE que
//                    supabase-js deja en el storage se guarda en una cookie HttpOnly.
//   /auth/callback → finishOAuth: recrea el storage con ese verificador e intercambia el `code`.
import type { AuthSession } from './auth-routes';

/** Clave fija del storage de auth: supabase-js guarda el verificador en `<key>-code-verifier`. */
export const OAUTH_STORAGE_KEY = 'gc-oauth';
export const VERIFIER_COOKIE = 'gc-oauth-verifier';
export const NEXT_COOKIE = 'gc-oauth-next';

export interface MemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  entries(): [string, string][];
}

export function createMemoryStorage(
  initial: Record<string, string> = {}
): MemoryStorage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    entries: () => Array.from(map.entries()),
  };
}

export function findCodeVerifier(storage: MemoryStorage): string | null {
  const entry = storage
    .entries()
    .find(([key]) => key.endsWith('-code-verifier'));
  return entry ? entry[1] : null;
}

/** Sesión mínima que devuelve exchangeCodeForSession. */
export interface SessionLike {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email?: string | null;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };
}

/** Lo que usamos del cliente de Auth (inyectable en tests). */
export interface PkceAuthLike {
  signInWithOAuth(params: {
    provider: 'google';
    options: { redirectTo: string; skipBrowserRedirect: true };
  }): Promise<{
    data: { url: string | null };
    error: { message: string } | null;
  }>;
  exchangeCodeForSession(code: string): Promise<{
    data: { session: SessionLike | null };
    error: { message: string } | null;
  }>;
}

export type AuthFactory = (storage: MemoryStorage) => PkceAuthLike;

export async function startGoogleLogin(
  makeAuth: AuthFactory,
  redirectTo: string
): Promise<
  { ok: true; url: string; codeVerifier: string } | { ok: false; error: string }
> {
  const storage = createMemoryStorage();
  const { data, error } = await makeAuth(storage).signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  const codeVerifier = findCodeVerifier(storage);
  if (error || !data.url || !codeVerifier) {
    return {
      ok: false,
      error: error?.message ?? 'Google no está disponible ahora mismo.',
    };
  }
  return { ok: true, url: data.url, codeVerifier };
}

export async function finishOAuth(
  makeAuth: AuthFactory,
  code: string,
  codeVerifier: string
): Promise<AuthSession | null> {
  const storage = createMemoryStorage({
    [`${OAUTH_STORAGE_KEY}-code-verifier`]: codeVerifier,
  });
  const { data, error } = await makeAuth(storage).exchangeCodeForSession(code);
  const session = data.session;
  if (error || !session) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      app_metadata: session.user.app_metadata ?? {},
      user_metadata: session.user.user_metadata ?? {},
    },
  };
}
