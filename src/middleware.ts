import type { APIContext } from 'astro';
import { defineMiddleware } from 'astro:middleware';
import { createClient, type User } from '@supabase/supabase-js';
import { authGate } from '@/lib/auth-gate';
import { isAdminUser } from '@/lib/authz';
import { env } from '@/lib/env';
import {
  ADMIN_TENANT_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from '@/lib/session-cookies';
import { resolveSession, type AuthUser } from '@/lib/session-server';
import { createAdminClient } from '@/lib/supabase-server';
import { isTenantNumber } from '@/lib/tenants';
import { getTenantByNumberAdmin, getTenantForUser } from '@/lib/tenants-server';

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

// Páginas que no deben indexarse ni cachearse: backoffice, cuenta y flujos de acceso.
const PRIVATE_AREA =
  /^\/(admin|cuenta|auth|login|registro|recuperar|logout)(\/|$)/;

function applySecurityHeaders(response: Response, privateArea: boolean) {
  const h = response.headers;
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (import.meta.env.PROD) {
    h.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  }
  if (privateArea) {
    h.set('X-Robots-Tag', 'noindex, nofollow');
    h.set('Cache-Control', 'no-store');
  }
  return response;
}

const authClient = () =>
  createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const toAuthUser = (u: User): AuthUser => ({
  id: u.id,
  email: u.email ?? null,
  app_metadata: u.app_metadata ?? {},
  user_metadata: u.user_metadata ?? {},
});

/** Usuario según las cookies: verificación local (o getUser) y refresco si ha caducado. */
function loadUser(context: APIContext): Promise<AuthUser | null> {
  const { cookies } = context;
  return resolveSession(
    {
      get: (name) => cookies.get(name)?.value,
      set: (session) => setSessionCookies(cookies, session),
      clear: () => clearSessionCookies(cookies),
    },
    {
      secret: env.supabaseJwtSecret,
      getUser: async (token) => {
        const { data } = await authClient().auth.getUser(token);
        return data.user ? toAuthUser(data.user) : null;
      },
      refresh: async (refreshToken) => {
        const { data } = await authClient().auth.refreshSession({
          refresh_token: refreshToken,
        });
        if (!data.session) return null;
        return {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user: toAuthUser(data.session.user),
        };
      },
    }
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const privateArea = PRIVATE_AREA.test(pathname);

  // Acceso antiguo al backoffice.
  if (pathname === '/admin/login') {
    return applySecurityHeaders(context.redirect('/login'), true);
  }

  const user = await loadUser(context);
  const isSuperAdmin = isAdminUser(user, env.adminEmails);
  context.locals.user = user;
  context.locals.isSuperAdmin = isSuperAdmin;
  context.locals.tenant = null;
  context.locals.adminTenantOverride = false;

  const decision = authGate({
    pathname,
    method: context.request.method,
    hasUser: !!user,
    isSuperAdmin,
  });
  if (decision === 'login') {
    const nextParam = encodeURIComponent(pathname + context.url.search);
    return applySecurityHeaders(
      context.redirect(`/login?next=${nextParam}`),
      true
    );
  }
  if (decision === 'forbidden') {
    return applySecurityHeaders(
      new Response('Solo el administrador de la web puede ver esta página.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
      true
    );
  }

  if (user) {
    const admin = createAdminClient();
    // Un superadmin puede gestionar otro espacio dentro de /admin (cookie puesta en /admin/espacios).
    const override = context.cookies.get(ADMIN_TENANT_COOKIE)?.value;
    if (
      isSuperAdmin &&
      pathname.startsWith('/admin') &&
      isTenantNumber(override)
    ) {
      const tenant = await getTenantByNumberAdmin(admin, Number(override));
      if (tenant) {
        context.locals.tenant = tenant;
        context.locals.adminTenantOverride = true;
      }
    }
    if (!context.locals.tenant) {
      context.locals.tenant = await getTenantForUser(admin, user.id);
    }
  }

  const response = await next();
  return applySecurityHeaders(response, privateArea);
});
