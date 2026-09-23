// Espacio (tenant) del usuario con sesión. Solo servidor (service role).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectConfig, Tenant } from './supabase';

const TENANT_COLUMNS = 'id, number, name, avatar_url, created_at';

/** Espacio del que el usuario es dueño (una cuenta = un espacio), o null si no tiene. */
export async function getTenantForUser(
  admin: SupabaseClient,
  userId: string
): Promise<Tenant | null> {
  const { data, error } = await admin
    .from('tenants')
    .select(TENANT_COLUMNS)
    .eq('owner_user_id', userId)
    .maybeSingle();
  if (error) {
    console.error(
      '[tenants] error leyendo el espacio del usuario:',
      error.message
    );
    return null;
  }
  return data as Tenant | null;
}

/** Espacio por número (con service role; para el superadmin que gestiona otro espacio). */
export async function getTenantByNumberAdmin(
  admin: SupabaseClient,
  number: number
): Promise<Tenant | null> {
  const { data, error } = await admin
    .from('tenants')
    .select(TENANT_COLUMNS)
    .eq('number', number)
    .maybeSingle();
  if (error) {
    console.error(
      '[tenants] error leyendo el espacio por número:',
      error.message
    );
    return null;
  }
  return data as Tenant | null;
}

/**
 * Proyecto solo si pertenece al espacio: la comprobación de autorización del backoffice
 * (404 si no es tuyo). Devuelve la fila completa para no repetir la consulta.
 */
export async function requireProjectInTenant(
  admin: SupabaseClient,
  projectId: string,
  tenantId: string
): Promise<ProjectConfig | null> {
  if (!projectId || !tenantId) return null;
  const { data, error } = await admin
    .from('project_config')
    .select('*')
    .eq('id', projectId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) {
    console.error(
      '[tenants] error comprobando el proyecto del espacio:',
      error.message
    );
    return null;
  }
  return (data as ProjectConfig | null) ?? null;
}
