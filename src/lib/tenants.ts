// Espacios (tenants): número público de 6 dígitos y URLs. Puro: lo usan páginas, layouts y tests.
export const TENANT_NUMBER_RE = /^\d{6}$/;

export function isTenantNumber(value: unknown): value is string {
  return typeof value === 'string' && TENANT_NUMBER_RE.test(value);
}

/** Parámetro de ruta `[tenant]` → número, o null si no tiene el formato. */
export function parseTenantParam(value: string | undefined): number | null {
  return isTenantNumber(value) ? Number(value) : null;
}

export const tenantUrl = (number: number) => `/${number}`;
export const projectUrl = (number: number, slug: string) =>
  `/${number}/projects/${slug}`;

/** Iniciales para el avatar de respaldo (máx. 2 letras). */
export function tenantInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]!.toUpperCase());
  return letters.join('') || '?';
}

/**
 * Origen público de la web para construir enlaces absolutos. Detrás de nginx el servidor ve
 * http://127.0.0.1:5025, así que se prefieren las cabeceras X-Forwarded-*; sin ellas, Host.
 */
export function siteOrigin(headers: Headers, fallbackOrigin: string): string {
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (!host) return fallbackOrigin;
  const forwardedProto = headers.get('x-forwarded-proto');
  const proto =
    forwardedProto ?? (fallbackOrigin.startsWith('https') ? 'https' : 'http');
  return `${proto}://${host}`;
}
