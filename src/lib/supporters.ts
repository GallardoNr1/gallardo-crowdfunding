// Red de colaboración (parte pura): a partir de las aportaciones y mensajes que traen el espacio
// de quien los hizo (`supporter_tenant_id`, solo con su permiso), se calcula qué espacios tienen
// proyectos activos y públicos para enseñarlos como etiqueta y como "También están recaudando".
import { projectUrl, tenantUrl } from './tenants';

export interface SupporterProject {
  id: string;
  name: string;
  slug: string;
  href: string;
  imageUrl: string | null;
  currentAmount: number;
  targetAmount: number;
  campaignMode: 'target' | 'open';
  createdAt: string;
  spaceName: string;
  spaceHref: string;
}

export interface SupporterSpace {
  id: string;
  number: number;
  name: string;
  href: string;
  avatarUrl: string | null;
  projects: SupporterProject[];
}

export interface SupporterNetwork {
  spaces: Map<string, SupporterSpace>;
  /** Proyectos de todos los espacios, del más nuevo al más antiguo, como mucho `maxProjects`. */
  projects: SupporterProject[];
}

/** Fila de `project_config` con el espacio embebido (`tenants(number, name, avatar_url)`). */
export interface SupporterProjectRow {
  id: string;
  project_name: string;
  slug: string;
  project_image_url?: string | null;
  current_amount?: number | string | null;
  target_amount?: number | string | null;
  campaign_mode?: string | null;
  created_at: string;
  tenant_id: string;
  project_status: string;
  visibility?: string | null;
  tenants?: { number: number; name: string; avatar_url?: string | null } | null;
}

/** Espacios distintos que aparecen en las filas, sin nulos y sin el espacio excluido (el propio). */
export function supporterTenantIds(
  rows: { supporter_tenant_id?: string | null }[],
  excludeTenantId?: string | null
): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = row.supporter_tenant_id;
    if (id && id !== excludeTenantId) ids.add(id);
  }
  return [...ids];
}

export function buildSupporterNetwork(
  rows: SupporterProjectRow[],
  {
    excludeTenantId,
    maxProjects = 6,
  }: { excludeTenantId?: string | null; maxProjects?: number } = {}
): SupporterNetwork {
  const spaces = new Map<string, SupporterSpace>();
  const eligible = rows.filter(
    (r) =>
      r.tenants &&
      r.tenant_id !== excludeTenantId &&
      r.project_status === 'active' &&
      r.visibility === 'public'
  );
  const projects = eligible
    .map((r): SupporterProject => {
      const space = r.tenants!;
      return {
        id: r.id,
        name: r.project_name,
        slug: r.slug,
        href: projectUrl(space.number, r.slug),
        imageUrl: r.project_image_url ?? null,
        currentAmount: Number(r.current_amount) || 0,
        targetAmount: Number(r.target_amount) || 0,
        campaignMode: r.campaign_mode === 'open' ? 'open' : 'target',
        createdAt: r.created_at,
        spaceName: space.name,
        spaceHref: tenantUrl(space.number),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  for (const r of eligible) {
    const space = r.tenants!;
    const entry = spaces.get(r.tenant_id) ?? {
      id: r.tenant_id,
      number: space.number,
      name: space.name,
      href: tenantUrl(space.number),
      avatarUrl: space.avatar_url ?? null,
      projects: [],
    };
    entry.projects.push(projects.find((p) => p.id === r.id)!);
    spaces.set(r.tenant_id, entry);
  }
  for (const space of spaces.values()) {
    space.projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return { spaces, projects: projects.slice(0, maxProjects) };
}

export interface SupporterBadge {
  name: string;
  href: string;
}

/** Etiqueta "🏠 Familia X" para un espacio con proyectos activos y públicos; null si no procede. */
export function supporterBadge(
  spaces: Map<string, SupporterSpace>,
  tenantId: string | null | undefined
): SupporterBadge | null {
  const space = tenantId ? spaces.get(tenantId) : undefined;
  if (!space || space.projects.length === 0) return null;
  return { name: space.name, href: space.href };
}

/**
 * Espacio a guardar en una aportación o mensaje: solo si la persona conectada lo pidió (casilla),
 * y nunca si es el propio espacio del proyecto (apoyarse a uno mismo no crea red).
 */
export function supporterTenantToStore(
  requested: string | null | undefined,
  projectTenantId: string | null | undefined
): string | null {
  return requested && requested !== projectTenantId ? requested : null;
}

/** Espacio de la sesión que se puede mostrar: el propio (no el que gestiona un superadmin) y solo si lo pide. */
export function supporterFromSession(
  locals: { tenant?: { id: string } | null; adminTenantOverride?: boolean },
  showSpace: boolean
): string | null {
  if (!showSpace || !locals.tenant || locals.adminTenantOverride) return null;
  return locals.tenant.id;
}

/** Versión serializable del mapa (para pasarla a componentes de cliente). */
export function supporterBadges(
  spaces: Map<string, SupporterSpace>
): Record<string, SupporterBadge> {
  const out: Record<string, SupporterBadge> = {};
  for (const [id, space] of spaces) {
    if (space.projects.length > 0)
      out[id] = { name: space.name, href: space.href };
  }
  return out;
}
