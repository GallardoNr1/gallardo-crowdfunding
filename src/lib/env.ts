// Única fuente de configuración en servidor. Se evalúa al importar el módulo,
// así que un despliegue sin variables falla al arrancar y no en la primera petición.
// NO importar desde código que se envíe al navegador (expondría SUPABASE_SERVICE_ROLE_KEY).
// Se accede a cada variable por nombre porque Astro sustituye `import.meta.env.X`
// (también las privadas, en servidor) en tiempo de build.
import { parseEnv } from './env-schema';

export const env = parseEnv({
  PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_EMAILS: import.meta.env.ADMIN_EMAILS,
});
