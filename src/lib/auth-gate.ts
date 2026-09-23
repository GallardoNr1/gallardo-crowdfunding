// Decisión de acceso por ruta (pura, sin Astro): la usa el middleware.
//   'allow'     → seguir
//   'login'     → hace falta sesión: redirigir a /login?next=<ruta>
//   'forbidden' → hay sesión pero no el rol necesario (superadmin)

export type GateDecision = 'allow' | 'login' | 'forbidden';

export interface GateInput {
  pathname: string;
  method: string;
  hasUser: boolean;
  isSuperAdmin: boolean;
}

const startsWithSegment = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export function authGate({
  pathname,
  method,
  hasUser,
  isSuperAdmin,
}: GateInput): GateDecision {
  const superAdminOnly = startsWithSegment(pathname, '/admin/espacios');
  const needsUser =
    startsWithSegment(pathname, '/admin') ||
    startsWithSegment(pathname, '/cuenta') ||
    (pathname === '/logout' && method.toUpperCase() === 'POST');

  if (!needsUser) return 'allow';
  if (!hasUser) return 'login';
  if (superAdminOnly && !isSuperAdmin) return 'forbidden';
  return 'allow';
}

const DEFAULT_NEXT = '/admin';
const ENTRY_PAGES = ['/login', '/registro', '/recuperar', '/logout'];

/** Destino tras el login: solo rutas internas relativas (evita open redirect) y nunca las de acceso. */
export function safeNext(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.startsWith('/\\')
  ) {
    return DEFAULT_NEXT;
  }
  const path = next.split('?')[0]!;
  if (ENTRY_PAGES.some((p) => startsWithSegment(path, p))) return DEFAULT_NEXT;
  return next;
}
