import type { SupabaseClient } from '@supabase/supabase-js';

// Subida de la imagen de portada de un proyecto desde el backoffice al bucket `project-assets`.
// Solo servidor (service_role). La parte pura (validación y ruta) se prueba en tests/project-image.test.ts.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_BUCKET = 'project-assets';

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

export interface ImageFileLike {
  name: string;
  type: string;
  size: number;
}

export function validateImageFile(file: ImageFileLike): { ok: true } | { ok: false; error: string } {
  if (!file.size) return { ok: false, error: 'No se ha seleccionado ningún archivo.' };
  if (!EXT_BY_TYPE[file.type]) {
    return { ok: false, error: 'Formato no admitido: usa JPG, PNG, WEBP o GIF.' };
  }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'La imagen supera los 5 MB.' };
  return { ok: true };
}

/** `projects/<id>/cover-<timestamp>.<ext>` — nombre generado en servidor, nunca el del usuario. */
export function imageStoragePath(projectId: string, file: Pick<ImageFileLike, 'name' | 'type'>): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  const ext = ALLOWED_EXT.has(fromName) ? (fromName === 'jpeg' ? 'jpg' : fromName) : EXT_BY_TYPE[file.type] ?? 'bin';
  return `projects/${projectId}/cover-${Date.now()}.${ext}`;
}

export type UploadImageResult = { ok: true; url: string | null } | { ok: false; error: string };

/**
 * Sube el archivo del campo `project_image` (si lo hay) y guarda su URL pública en
 * project_config.project_image_url. Sin archivo devuelve `{ ok: true, url: null }`.
 */
export async function uploadProjectImage(
  admin: SupabaseClient,
  projectId: string,
  entry: FormDataEntryValue | null
): Promise<UploadImageResult> {
  if (!(entry instanceof File) || entry.size === 0) return { ok: true, url: null };

  const valid = validateImageFile(entry);
  if (!valid.ok) return valid;

  const path = imageStoragePath(projectId, entry);
  const { error: uploadError } = await admin.storage
    .from(IMAGE_BUCKET)
    .upload(path, await entry.arrayBuffer(), { contentType: entry.type, upsert: false });
  if (uploadError) {
    console.error('[project-image] upload failed:', uploadError.message);
    return { ok: false, error: `No se pudo subir la imagen (${uploadError.message}).` };
  }

  const url = admin.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: updateError } = await admin
    .from('project_config')
    .update({ project_image_url: url, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true, url };
}
