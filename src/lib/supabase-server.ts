import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Cliente con service role: salta RLS. Solo en servidor (endpoints /api/* y backoffice).
 * Las variables ya vienen validadas por src/lib/env.ts.
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
