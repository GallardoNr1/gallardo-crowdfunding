// Red de colaboración con Supabase (solo servidor, cliente admin): proyectos activos y públicos de
// los espacios que han apoyado, y qué espacios han apoyado a un espacio dado.
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildSupporterNetwork,
  supporterTenantIds,
  type SupporterNetwork,
  type SupporterProjectRow,
} from './supporters';

const PROJECT_COLUMNS =
  'id, project_name, slug, project_image_url, current_amount, target_amount, campaign_mode, created_at, tenant_id, project_status, visibility, tenants(number, name, avatar_url)';

/** Proyectos activos y públicos de esos espacios (sin el espacio excluido). */
export async function getSupporterNetwork(
  admin: SupabaseClient,
  tenantIds: string[],
  excludeTenantId?: string | null,
  maxProjects = 6
): Promise<SupporterNetwork> {
  const ids = tenantIds.filter((id) => id && id !== excludeTenantId);
  if (ids.length === 0) return { spaces: new Map(), projects: [] };
  const { data, error } = await admin
    .from('project_config')
    .select(PROJECT_COLUMNS)
    .in('tenant_id', ids)
    .eq('project_status', 'active')
    .eq('visibility', 'public');
  if (error) {
    console.error('[supporters] no se pudo leer la red:', error.message);
    return { spaces: new Map(), projects: [] };
  }
  return buildSupporterNetwork(
    (data ?? []) as unknown as SupporterProjectRow[],
    {
      excludeTenantId,
      maxProjects,
    }
  );
}

/** Espacios (distintos del propio) desde los que han aportado o escrito a los proyectos de un espacio. */
export async function getSupporterTenantIdsForTenant(
  admin: SupabaseClient,
  tenantId: string
): Promise<string[]> {
  const { data: projects } = await admin
    .from('project_config')
    .select('id')
    .eq('tenant_id', tenantId);
  const projectIds = (projects ?? []).map((p) => String(p.id));
  if (projectIds.length === 0) return [];
  const [{ data: contributions }, { data: messages }] = await Promise.all([
    admin
      .from('contributions')
      .select('supporter_tenant_id')
      .in('project_id', projectIds)
      .not('supporter_tenant_id', 'is', null),
    admin
      .from('support_messages')
      .select('supporter_tenant_id')
      .in('project_id', projectIds)
      .not('supporter_tenant_id', 'is', null),
  ]);
  return supporterTenantIds(
    [...(contributions ?? []), ...(messages ?? [])] as {
      supporter_tenant_id?: string | null;
    }[],
    tenantId
  );
}
