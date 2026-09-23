// Lógica de POST /admin/api/draft-project, separada del endpoint para poder probarla
// sin sesión real ni clave de Anthropic (`generate` y `configured` se inyectan).
import { json, readJson } from './api';
import { DraftRequest, type ProjectDraft } from './project-draft';
import { fieldErrors } from './schemas';

export interface DraftRouteDeps {
  /** Usuario admin que puso el middleware en `locals.user`; null si no hay sesión. */
  user: { id: string; email?: string | null } | null;
  /** Hay ANTHROPIC_API_KEY. */
  configured: boolean;
  /** Genera el borrador (llama a la API de Claude). Lanza si falla. */
  generate: (brief: string) => Promise<ProjectDraft>;
}

export async function handleDraftRequest(
  request: Request,
  { user, configured, generate }: DraftRouteDeps
): Promise<Response> {
  if (!user)
    return json(
      { error: 'Sesión de administrador necesaria.' },
      { status: 401 }
    );

  if (!configured) {
    return json(
      {
        error:
          'La IA no está configurada: falta ANTHROPIC_API_KEY en el servidor.',
      },
      { status: 503 }
    );
  }

  const parsed = DraftRequest.safeParse(await readJson(request));
  if (!parsed.success) {
    return json(
      {
        error: 'Cuéntame un poco más (entre 10 y 4000 caracteres).',
        fields: fieldErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  try {
    const draft = await generate(parsed.data.brief);
    return json({ draft });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'No se pudo generar el borrador.';
    console.error('[draft-project] fallo generando el borrador:', err);
    return json({ error: message }, { status: 502 });
  }
}
