// Avatar (foto) del espacio en el bucket público `avatars`. Solo servidor (service role).
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateImageFile } from './project-image-server';
import type { Tenant } from './supabase';

export const AVATAR_BUCKET = 'avatars';

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** `tenants/<id>/avatar-<timestamp>.<ext>` — nombre generado en servidor. */
export function avatarStoragePath(tenantId: string, mimeType: string): string {
  return `tenants/${tenantId}/avatar-${Date.now()}.${EXT_BY_TYPE[mimeType] ?? 'bin'}`;
}

/** Ruta dentro del bucket a partir de la URL pública guardada (para borrar el archivo anterior). */
export function avatarPathFromUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  const marker = `/object/public/${AVATAR_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

export type AvatarResult =
  { ok: true; url: string | null } | { ok: false; error: string };

/**
 * Sube el archivo del campo `avatar` (si lo hay), guarda su URL pública en tenants.avatar_url
 * y borra el archivo anterior. Sin archivo devuelve `{ ok: true, url: null }`.
 */
export async function uploadTenantAvatar(
  admin: SupabaseClient,
  tenant: Pick<Tenant, 'id' | 'avatar_url'>,
  entry: FormDataEntryValue | null
): Promise<AvatarResult> {
  if (!(entry instanceof File) || entry.size === 0)
    return { ok: true, url: null };

  const valid = validateImageFile(entry);
  if (!valid.ok) return valid;

  const path = avatarStoragePath(tenant.id, entry.type);
  const { error: uploadError } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, await entry.arrayBuffer(), {
      contentType: entry.type,
      upsert: false,
    });
  if (uploadError) {
    console.error('[avatar] upload failed:', uploadError.message);
    return {
      ok: false,
      error: 'No se pudo subir la foto. Inténtalo de nuevo.',
    };
  }

  const url = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    .data.publicUrl;
  const { error: dbError } = await admin
    .from('tenants')
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq('id', tenant.id);
  if (dbError) {
    console.error('[avatar] update failed:', dbError.message);
    return { ok: false, error: 'La foto se subió pero no se pudo guardar.' };
  }

  await removeAvatarFile(admin, tenant.avatar_url);
  return { ok: true, url };
}

/** Quita la foto del espacio (BD y archivo). */
export async function removeTenantAvatar(
  admin: SupabaseClient,
  tenant: Pick<Tenant, 'id' | 'avatar_url'>
): Promise<AvatarResult> {
  const { error } = await admin
    .from('tenants')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', tenant.id);
  if (error) return { ok: false, error: 'No se pudo quitar la foto.' };
  await removeAvatarFile(admin, tenant.avatar_url);
  return { ok: true, url: null };
}

async function removeAvatarFile(
  admin: SupabaseClient,
  url: string | null | undefined
) {
  const path = avatarPathFromUrl(url);
  if (!path) return;
  const { error } = await admin.storage.from(AVATAR_BUCKET).remove([path]);
  if (error)
    console.warn(
      '[avatar] no se pudo borrar el archivo anterior:',
      error.message
    );
}
