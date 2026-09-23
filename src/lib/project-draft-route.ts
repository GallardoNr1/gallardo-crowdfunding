// Lógica de POST /admin/api/draft-project, separada del endpoint para poder probarla
// sin sesión real ni clave de Anthropic (`generate` y `configured` se inyectan).
import { json, readJson } from './api';
import {
  DraftRequestBody,
  type DraftInput,
  type ProjectDraft,
} from './project-draft';
import { fieldErrors } from './schemas';

export interface DraftRouteDeps {
  /** Usuario admin que puso el middleware en `locals.user`; null si no hay sesión. */
  user: { id: string; email?: string | null } | null;
  /** Hay ANTHROPIC_API_KEY. */
  configured: boolean;
  /** Genera o ajusta el borrador (llama a la API de Claude). Lanza si falla. */
  generate: (input: DraftInput) => Promise<ProjectDraft>;
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

  const parsed = DraftRequestBody.safeParse(await readJson(request));
  if (!parsed.success) {
    return json(
      {
        error:
          'Cuéntame un poco más (descripción de 10 a 4000 caracteres, o instrucciones de al menos 3).',
        fields: fieldErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  try {
    const input: DraftInput =
      'brief' in parsed.data
        ? { kind: 'brief', brief: parsed.data.brief }
        : {
            kind: 'refine',
            instructions: parsed.data.instructions,
            current: parsed.data.current,
          };
    const draft = await generate(input);
    return json({ draft });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'No se pudo generar el borrador.';
    console.error('[draft-project] fallo generando el borrador:', err);
    return json({ error: message }, { status: 502 });
  }
}
