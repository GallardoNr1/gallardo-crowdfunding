// Espacio (tenant) del usuario con sesión. Solo servidor (service role).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tenant } from './supabase';

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
