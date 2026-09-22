export interface AuthUserLike {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
}

/**
 * Un usuario es administrador si Supabase Auth le ha puesto `app_metadata.role = 'admin'`
 * o si su email está en la lista `ADMIN_EMAILS`. Todo lo demás se deniega.
 */
export function isAdminUser(
  user: AuthUserLike | null | undefined,
  adminEmails: readonly string[]
): boolean {
  if (!user) return false;
  if (user.app_metadata?.role === 'admin') return true;
  const email = user.email?.trim().toLowerCase();
  return !!email && adminEmails.includes(email);
}
