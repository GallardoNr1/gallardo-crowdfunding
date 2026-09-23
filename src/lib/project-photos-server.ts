// Fotos de la familia de un proyecto (sección "Fotos" de la página pública), gestionadas desde el
// backoffice. Viven en el bucket `project-assets`, carpeta `projects/<id>/fotoFami/` (la misma que
// lee getImagesFromFolder). Solo servidor (service role).
import type { SupabaseClient } from '@supabase/supabase-js';
import { IMAGE_BUCKET, validateImageFile } from './project-image-server';

export const PHOTOS_FOLDER = 'fotoFami';
export const MAX_PHOTOS_PER_UPLOAD = 12;

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const folderOf = (projectId: string) =>
  `projects/${projectId}/${PHOTOS_FOLDER}`;

/** `projects/<id>/fotoFami/<timestamp>-<n>.<ext>`: se ordenan por nombre = orden de subida. */
export function photoStoragePath(
  projectId: string,
  index: number,
  file: { name: string; type: string }
): string {
  return `${folderOf(projectId)}/${Date.now()}-${index}.${EXT_BY_TYPE[file.type] ?? 'bin'}`;
}

/** Solo nombres de archivo planos (sin rutas): evita salir de la carpeta del proyecto. */
export function isSafePhotoName(name: string): boolean {
  return (
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(name) && !name.includes('..')
  );
}

export interface ProjectPhoto {
  name: string;
  url: string;
}

export async function listProjectPhotos(
  admin: SupabaseClient,
  projectId: string
): Promise<ProjectPhoto[]> {
  const folder = folderOf(projectId);
  const { data, error } = await admin.storage
    .from(IMAGE_BUCKET)
    .list(folder, { limit: 200, sortBy: { column: 'name', order: 'asc' } });
  if (error || !data) return [];
  return data
    .filter((item) => item.name && item.name.includes('.'))
    .map((item) => ({
      name: item.name,
      url: admin.storage
        .from(IMAGE_BUCKET)
        .getPublicUrl(`${folder}/${item.name}`).data.publicUrl,
    }));
}

export interface UploadPhotosResult {
  uploaded: number;
  errors: string[];
}

/** Sube las fotos del campo `photos` (varias). Las entradas vacías se ignoran; las inválidas se reportan. */
export async function uploadProjectPhotos(
  admin: SupabaseClient,
  projectId: string,
  entries: FormDataEntryValue[]
): Promise<UploadPhotosResult> {
  const files = entries.filter(
    (e): e is File => e instanceof File && e.size > 0
  );
  const result: UploadPhotosResult = { uploaded: 0, errors: [] };
  if (files.length > MAX_PHOTOS_PER_UPLOAD) {
    result.errors.push(`Como mucho ${MAX_PHOTOS_PER_UPLOAD} fotos de una vez.`);
    return result;
  }
  for (const [index, file] of files.entries()) {
    const valid = validateImageFile(file);
    if (!valid.ok) {
      result.errors.push(`${file.name}: ${valid.error}`);
      continue;
    }
    const path = photoStoragePath(projectId, index, file);
    const { error } = await admin.storage
      .from(IMAGE_BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      });
    if (error) {
      result.errors.push(`${file.name}: ${error.message}`);
      continue;
    }
    result.uploaded += 1;
  }
  return result;
}

export async function deleteProjectPhoto(
  admin: SupabaseClient,
  projectId: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSafePhotoName(name))
    return { ok: false, error: 'Nombre de foto no válido.' };
  const { error } = await admin.storage
    .from(IMAGE_BUCKET)
    .remove([`${folderOf(projectId)}/${name}`]);
  if (error)
    return { ok: false, error: `No se pudo borrar la foto: ${error.message}` };
  return { ok: true };
}
