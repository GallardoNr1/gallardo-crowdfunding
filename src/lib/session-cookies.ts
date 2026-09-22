import type { AstroCookies } from 'astro';
import type { Session } from '@supabase/supabase-js';

export const ACCESS_COOKIE = 'sb-access-token';
export const REFRESH_COOKIE = 'sb-refresh-token';

const base = {
  path: '/',
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax' as const,
};

/** Guarda la sesión de Supabase Auth en cookies HttpOnly. */
export function setSessionCookies(cookies: AstroCookies, session: Session) {
  cookies.set(ACCESS_COOKIE, session.access_token, {
    ...base,
    maxAge: 60 * 60 * 24 * 7,
  });
  cookies.set(REFRESH_COOKIE, session.refresh_token, {
    ...base,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookies(cookies: AstroCookies) {
  cookies.delete(ACCESS_COOKIE, { path: '/' });
  cookies.delete(REFRESH_COOKIE, { path: '/' });
}
