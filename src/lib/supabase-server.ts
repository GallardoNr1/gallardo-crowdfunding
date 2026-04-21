import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Faltan SUPABASE_SERVICE_ROLE_KEY en las variables de entorno');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
