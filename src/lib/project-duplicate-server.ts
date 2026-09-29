// Duplicar un proyecto dentro de su espacio: configuración (descripción, tema, emojis, CTA,
// Bizum…), niveles y miembros de la familia; la portada se copia en Storage. No se copian ni
// las aportaciones ni los mensajes ni las fotos de la familia. La copia nace en pausa y privada.
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  copyName,
  duplicateFamilyMemberPayload,
  duplicateLevelPayload,
  duplicatePayload,
  nextSlug,
  rewriteImageUrl,
  storagePathFromUrl,
} from './project-duplicate';
import { IMAGE_BUCKET } from './project-image-server';

export type DuplicateResult =
  { ok: true; id: string; slug: string } | { ok: false; error: string };

export async function duplicateProject(
  admin: SupabaseClient,
  projectId: string,
  tenantId: string
): Promise<DuplicateResult> {
  const { data: source, error: sourceError } = await admin
    .from('project_config')
    .select('*')
    .eq('id', projectId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (sourceError) return { ok: false, error: sourceError.message };
  if (!source) return { ok: false, error: 'Proyecto no encontrado.' };

  // Slugs ya usados de la serie "<slug>-copia…" (el índice único de slug es global).
  const base = String(source.slug).replace(/-copia(?:-\d+)?$/, '');
  const { data: taken } = await admin
    .from('project_config')
    .select('slug')
    .like('slug', `${base}-copia%`);
  const takenSlugs = new Set((taken ?? []).map((r) => String(r.slug)));
  const slug = nextSlug(String(source.slug), (s) => takenSlugs.has(s));

  const { data: created, error: insertError } = await admin
    .from('project_config')
    .insert([
      duplicatePayload(source, {
        name: copyName(String(source.project_name)),
        slug,
        today: new Date().toISOString().slice(0, 10),
      }),
    ])
    .select('id')
    .single();
  if (insertError || !created)
    return {
      ok: false,
      error: insertError?.message ?? 'No se pudo crear la copia.',
    };
  const newId = String(created.id);

  // Portada: copia del archivo en Storage y URL apuntando a la carpeta nueva.
  const imageUrl = source.project_image_url
    ? String(source.project_image_url)
    : '';
  const fromPath = imageUrl ? storagePathFromUrl(imageUrl, IMAGE_BUCKET) : null;
  const newUrl = imageUrl ? rewriteImageUrl(imageUrl, projectId, newId) : null;
  if (fromPath && newUrl) {
    const toPath = fromPath.replace(
      `projects/${projectId}/`,
      `projects/${newId}/`
    );
    const { error: copyError } = await admin.storage
      .from(IMAGE_BUCKET)
      .copy(fromPath, toPath);
    await admin
      .from('project_config')
      .update({ project_image_url: copyError ? null : newUrl })
      .eq('id', newId);
  }

  const [{ data: levels }, { data: family }] = await Promise.all([
    admin
      .from('contribution_levels')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true }),
    admin
      .from('family_members')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true }),
  ]);
  if (levels && levels.length > 0) {
    const { error } = await admin
      .from('contribution_levels')
      .insert(levels.map((l) => duplicateLevelPayload(l, newId)));
    if (error)
      return { ok: false, error: `Copia creada sin niveles: ${error.message}` };
  }
  if (family && family.length > 0) {
    const { error } = await admin
      .from('family_members')
      .insert(family.map((m) => duplicateFamilyMemberPayload(m, newId)));
    if (error)
      return {
        ok: false,
        error: `Copia creada sin la familia: ${error.message}`,
      };
  }

  return { ok: true, id: newId, slug };
}
