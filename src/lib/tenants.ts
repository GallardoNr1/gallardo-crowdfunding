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
