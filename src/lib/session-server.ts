// Sesión del usuario a partir de las cookies (solo servidor, lo usa el middleware).
// Verifica el access token en local (HS256 con SUPABASE_JWT_SECRET) para no llamar a Supabase
// en cada página; sin secreto, delega en `getUser` (una llamada por petición). Si el token ha
// caducado, renueva con el refresh token y reescribe las cookies.
import { jwtVerify, decodeJwt } from 'jose';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './session-cookies';

export interface AuthUser {
  id: string;
  email: string | null;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

export interface VerifyDeps {
  /** Secreto JWT del proyecto; null → se usa getUser. */
  secret: string | null;
  /** Comprobación remota (supabase.auth.getUser). Obligatoria si no hay secreto. */
  getUser?: (accessToken: string) => Promise<AuthUser | null>;
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

/** Usuario del access token, o null si no es válido / ha caducado. */
export async function verifyAccessToken(
  token: string,
  { secret, getUser }: VerifyDeps
): Promise<AuthUser | null> {
  if (!token) return null;

  if (!secret) {
    if (!getUser) return null;
    try {
      return await getUser(token);
    } catch {
      return null;
    }
  }

  try {
    // Los tokens de Supabase van con aud "authenticated"; se comprueba si está presente.
    const { aud } = decodeJwt(token);
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ['HS256'],
        ...(aud ? { audience: 'authenticated' } : {}),
      }
    );
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      app_metadata: asRecord(payload.app_metadata),
      user_metadata: asRecord(payload.user_metadata),
    };
  } catch {
    return null;
  }
}

/** Adaptador mínimo sobre las cookies (AstroCookies en producción, objeto simple en tests). */
export interface SessionCookieStore {
  get(name: string): string | undefined;
  set(session: { access_token: string; refresh_token: string }): void;
  clear(): void;
}

export interface RefreshedSession {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface ResolveDeps extends VerifyDeps {
  /** supabase.auth.refreshSession; null si el refresh token no vale. */
  refresh: (refreshToken: string) => Promise<RefreshedSession | null>;
}

/** Usuario con sesión según las cookies; renueva o limpia las cookies según haga falta. */
export async function resolveSession(
  cookies: SessionCookieStore,
  deps: ResolveDeps
): Promise<AuthUser | null> {
  const accessToken = cookies.get(ACCESS_COOKIE);
  const refreshToken = cookies.get(REFRESH_COOKIE);
  if (!accessToken && !refreshToken) return null;

  if (accessToken) {
    const user = await verifyAccessToken(accessToken, deps);
    if (user) return user;
  }

  if (refreshToken) {
    const refreshed = await deps.refresh(refreshToken).catch(() => null);
    if (refreshed) {
      cookies.set({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
      });
      return refreshed.user;
    }
  }

  cookies.clear();
  return null;
}
