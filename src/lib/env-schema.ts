import { z } from 'zod';

const EnvSchema = z.object({
  PUBLIC_SUPABASE_URL: z.url(),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  ADMIN_EMAILS: z.string().optional().default(''),
  /** Clave de Anthropic para el borrador de proyecto con IA del backoffice. Opcional. */
  ANTHROPIC_API_KEY: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(20).optional()
  ),
  /** Secreto JWT del proyecto Supabase (Settings → API). Permite verificar la sesión sin llamada de red. */
  SUPABASE_JWT_SECRET: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(20).optional()
  ),
  /** Solo si la clave de Anthropic no está asociada a un workspace (la API lo exige entonces). */
  ANTHROPIC_WORKSPACE_ID: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().min(3).optional()
  ),
});

export interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  /** Emails (en minúsculas) con acceso al backoffice, además de app_metadata.role = 'admin'. */
  adminEmails: string[];
  /** Clave de la API de Anthropic; null desactiva el panel "Rellenar con IA" del alta. */
  anthropicApiKey: string | null;
  /** Secreto JWT de Supabase; null → la sesión se verifica con getUser (una llamada por petición). */
  supabaseJwtSecret: string | null;
  /** Workspace de Anthropic (cabecera anthropic-workspace-id) para claves sin workspace. */
  anthropicWorkspaceId: string | null;
}

/**
 * Valida las variables de entorno y devuelve la configuración tipada.
 * Lanza un Error que nombra cada variable inválida para que el arranque falle pronto.
 */
export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Variables de entorno inválidas — ${details}`);
  }
  const env = result.data;
  return {
    supabaseUrl: env.PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    adminEmails: env.ADMIN_EMAILS.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    supabaseJwtSecret: env.SUPABASE_JWT_SECRET ?? null,
    anthropicApiKey: env.ANTHROPIC_API_KEY ?? null,
    anthropicWorkspaceId: env.ANTHROPIC_WORKSPACE_ID ?? null,
  };
}
