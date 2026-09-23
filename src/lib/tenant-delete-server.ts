// Borrado completo de un espacio: proyectos con todo lo que cuelga de ellos, archivos de Storage,
// el espacio y, al final, la cuenta de Supabase Auth. Solo servidor (service role).
// El orden importa por las claves foráneas: mensajes → contribuciones → niveles → familia → proyectos → espacio.
import type { SupabaseClient } from '@supabase/supabase-js';
import { IMAGE_BUCKET } from './project-image-server';
import { AVATAR_BUCKET, avatarPathFromUrl } from './tenant-avatar-server';

export interface DeletableTenant {
  id: string;
  owner_user_id: string;
  avatar_url?: string | null;
}

export type DeleteTenantResult =
  | { ok: true; deleted: { projects: number; files: number } }
  | { ok: false; error: string };

const CHILD_TABLES = [
  'support_messages',
  'contributions',
  'contribution_levels',
  'family_members',
] as const;

export async function deleteTenantCompletely(
  admin: SupabaseClient,
  tenant: DeletableTenant
): Promise<DeleteTenantResult> {
  const { data: projectRows, error: listError } = await admin
    .from('project_config')
    .select('id')
    .eq('tenant_id', tenant.id);
  if (listError)
    return {
      ok: false,
      error: `No se pudieron leer los proyectos: ${listError.message}`,
    };
  const projectIds = ((projectRows ?? []) as { id: string }[]).map((p) => p.id);

  let files = 0;

  if (projectIds.length > 0) {
    for (const table of CHILD_TABLES) {
      const { error } = await admin
        .from(table)
        .delete()
        .in('project_id', projectIds);
      if (error)
        return {
          ok: false,
          error: `No se pudo borrar ${table}: ${error.message}`,
        };
    }
    const { error: projectsError } = await admin
      .from('project_config')
      .delete()
      .eq('tenant_id', tenant.id);
    if (projectsError) {
      return {
        ok: false,
        error: `No se pudieron borrar los proyectos: ${projectsError.message}`,
      };
    }
    for (const id of projectIds) {
      files += await removeFolder(
        admin,
        IMAGE_BUCKET,
        `projects/${id}/fotoFami`
      );
      files += await removeFolder(admin, IMAGE_BUCKET, `projects/${id}`);
    }
  }

  const avatarPath = avatarPathFromUrl(tenant.avatar_url);
  if (avatarPath)
    files += await removePaths(admin, AVATAR_BUCKET, [avatarPath]);

  const { error: tenantError } = await admin
    .from('tenants')
    .delete()
    .eq('id', tenant.id);
  if (tenantError)
    return {
      ok: false,
      error: `No se pudo borrar el espacio: ${tenantError.message}`,
    };

  const { error: userError } = await admin.auth.admin.deleteUser(
    tenant.owner_user_id
  );
  if (userError) {
    return {
      ok: false,
      error: `Espacio borrado, pero la cuenta no: ${userError.message}`,
    };
  }

  return { ok: true, deleted: { projects: projectIds.length, files } };
}

/** Borra los archivos (no las subcarpetas) de una carpeta del bucket; devuelve cuántos. */
async function removeFolder(
  admin: SupabaseClient,
  bucket: string,
  folder: string
): Promise<number> {
  const { data, error } = await admin.storage
    .from(bucket)
    .list(folder, { limit: 1000 });
  if (error || !data?.length) return 0;
  // Las subcarpetas aparecen como entradas sin `id`/metadata; se saltan.
  const names = data
    .filter(
      (item) =>
        item.name &&
        !item.name.includes('/') &&
        (item as { id?: string | null }).id !== null
    )
    .filter((item) => item.name.includes('.'))
    .map((item) => `${folder}/${item.name}`);
  return removePaths(admin, bucket, names);
}

async function removePaths(
  admin: SupabaseClient,
  bucket: string,
  paths: string[]
): Promise<number> {
  if (paths.length === 0) return 0;
  const { error } = await admin.storage.from(bucket).remove(paths);
  if (error) {
    console.warn(
      `[tenant-delete] no se pudieron borrar archivos de ${bucket}:`,
      error.message
    );
    return 0;
  }
  return paths.length;
}
