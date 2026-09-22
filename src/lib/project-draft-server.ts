// Llama a la API de Claude para generar el borrador de proyecto (solo servidor).
// NO importar desde código del navegador: usa la clave de Anthropic.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { env } from './env';
import {
  ProjectDraft,
  buildDraftSystemPrompt,
  normalizeDraft,
} from './project-draft';

export const DRAFT_MODEL = 'claude-opus-5';

/** Hay clave configurada: el panel de IA del alta se puede usar. */
export function isDraftConfigured(): boolean {
  return env.anthropicApiKey !== null;
}

export interface GenerateDraftOptions {
  /** Inyectable en tests. */
  client?: Anthropic;
  /** Fecha ISO "de hoy" para el prompt. */
  today?: string;
}

/**
 * Pide a Claude un borrador con salida estructurada (JSON validado contra `ProjectDraft`)
 * y lo normaliza. Lanza un Error con un mensaje apto para mostrar en el backoffice.
 */
export async function generateProjectDraft(
  brief: string,
  { client, today }: GenerateDraftOptions = {}
): Promise<ProjectDraft> {
  const anthropic =
    client ??
    new Anthropic({
      apiKey: env.anthropicApiKey ?? undefined,
      // Las claves de organización (sin workspace) exigen esta cabecera.
      defaultHeaders: env.anthropicWorkspaceId
        ? { 'anthropic-workspace-id': env.anthropicWorkspaceId }
        : undefined,
      timeout: 120_000,
      maxRetries: 1,
    });

  let response;
  try {
    response = await anthropic.messages.parse({
      model: DRAFT_MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: zodOutputFormat(ProjectDraft),
      },
      system: buildDraftSystemPrompt(
        today ?? new Date().toISOString().slice(0, 10)
      ),
      messages: [{ role: 'user', content: brief }],
    });
  } catch (err) {
    throw new Error(describeApiError(err), { cause: err });
  }

  if (response.stop_reason === 'refusal') {
    throw new Error(
      'La IA ha rechazado la petición. Cambia la descripción e inténtalo de nuevo.'
    );
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error(
      'La respuesta de la IA se cortó. Prueba con una descripción más corta.'
    );
  }
  if (!response.parsed_output) {
    throw new Error(
      'La IA no devolvió un borrador válido. Inténtalo de nuevo.'
    );
  }
  return normalizeDraft(response.parsed_output);
}

function describeApiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'La clave ANTHROPIC_API_KEY del servidor no es válida.';
  }
  if (
    err instanceof Anthropic.BadRequestError &&
    /workspace/i.test(err.message)
  ) {
    return 'La clave de Anthropic no está asociada a un workspace: añade ANTHROPIC_WORKSPACE_ID al servidor o usa una clave creada dentro de un workspace.';
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'La IA está saturada ahora mismo. Inténtalo dentro de un minuto.';
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'No se pudo conectar con la IA. Inténtalo de nuevo.';
  }
  if (err instanceof Anthropic.APIError) {
    return `Error de la IA (${err.status ?? '?'}): ${err.message}`;
  }
  return err instanceof Error
    ? err.message
    : 'Error desconocido al llamar a la IA.';
}
