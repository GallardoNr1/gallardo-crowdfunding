import type { APIContext } from 'astro';
import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { isAdminUser } from '@/lib/authz';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from '@/lib/session-cookies';

const supabaseWs = env.supabaseUrl.replace(/^http/, 'ws');

// CSP solo en producción: en dev, Vite necesita inline scripts y su WebSocket de HMR.
// 'unsafe-inline' en script-src se mantiene porque varios componentes usan `onclick`
// e `is:inline`; aun así la política bloquea scripts remotos, iframes y form-action ajenos.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  `connect-src 'self' ${env.supabaseUrl} ${supabaseWs}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

function applySecurityHeaders(response: Response, adminArea: boolean) {
  const h = response.headers;
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (import.meta.env.PROD) {
    h.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  }
  if (adminArea) {
    h.set('X-Robots-Tag', 'noindex, nofollow');
    h.set('Cache-Control', 'no-store');
  }
  return response;
}

/**
 * Comprueba la sesión de administrador. Devuelve una Response (redirección) si hay que
 * denegar, o null si el usuario es admin (y deja `locals.user` relleno).
 * Si el access token ha caducado, intenta renovarlo con el refresh token y reescribe las cookies.
 */
async function requireAdmin(context: APIContext): Promise<Response | null> {
  const accessToken = context.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = context.cookies.get(REFRESH_COOKIE)?.value;

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let user = null;
  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken);
    user = data.user ?? null;
  }

  if (!user && refreshToken) {
    const { data } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (data.session) {
      setSessionCookies(context.cookies, data.session);
      user = data.session.user;
    }
  }

  if (!user) {
    clearSessionCookies(context.cookies);
    return context.redirect('/admin/login');
  }

  if (!isAdminUser(user, env.adminEmails)) {
    console.warn(`[auth] acceso a /admin denegado para ${user.email ?? user.id}`);
    clearSessionCookies(context.cookies);
    return context.redirect('/admin/login?error=forbidden');
  }

  context.locals.user = user;
  return null;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const adminArea = pathname === '/admin' || pathname.startsWith('/admin/');

  if (adminArea && pathname !== '/admin/login') {
    const denied = await requireAdmin(context);
    if (denied) return applySecurityHeaders(denied, true);
  }

  const response = await next();
  return applySecurityHeaders(response, adminArea);
});
