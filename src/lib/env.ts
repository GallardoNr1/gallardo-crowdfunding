// Única fuente de configuración en servidor. Se evalúa al importar el módulo,
// así que un despliegue sin variables falla al arrancar y no en la primera petición.
// NO importar desde código que se envíe al navegador (expondría SUPABASE_SERVICE_ROLE_KEY).
import { parseEnv } from './env-schema';

export const env = parseEnv(import.meta.env as Record<string, unknown>);
