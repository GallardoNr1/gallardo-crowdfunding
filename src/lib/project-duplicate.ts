// Duplicar un proyecto (parte pura): nombre y slug de la copia y los payloads de inserción.
// El acceso a Supabase está en project-duplicate-server.ts.

const COPY_RE = /^(.*) \(copia(?: (\d+))?\)$/;

/** "Bici" → "Bici (copia)"; "Bici (copia)" → "Bici (copia 2)"; "… (copia 2)" → "… (copia 3)". */
export function copyName(name: string): string {
  const m = name.match(COPY_RE);
  if (!m) return `${name} (copia)`;
  const n = m[2] ? parseInt(m[2], 10) + 1 : 2;
  return `${m[1]} (copia ${n})`;
}

/** Primer slug libre de la serie `<slug>-copia`, `<slug>-copia-2`, … */
export function nextSlug(
  slug: string,
  isTaken: (s: string) => boolean
): string {
  const base = slug.replace(/-copia(?:-\d+)?$/, '');
  const first = `${base}-copia`;
  if (!isTaken(first)) return first;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-copia-${n}`;
    if (!isTaken(candidate)) return candidate;
  }
  return `${base}-copia-${Date.now()}`;
}

type Row = Record<string, unknown>;

const strip = (row: Row, keys: string[]): Row => {
  const out: Row = { ...row };
  for (const key of keys) delete out[key];
  return out;
};

export interface DuplicateOptions {
  name: string;
  slug: string;
  /** Fecha de inicio de la copia (YYYY-MM-DD). */
  today: string;
}

/**
 * Fila de `project_config` lista para insertar como copia: mismo contenido (descripción, tema,
 * emojis, CTA, Bizum…) pero sin id ni fechas de sistema, con importe a 0, en pausa y privada para
 * que no aparezca en público hasta revisarla.
 */
export function duplicatePayload(row: Row, options: DuplicateOptions): Row {
  return {
    ...strip(row, ['id', 'created_at', 'updated_at', 'tenants']),
    project_name: options.name,
    slug: options.slug,
    current_amount: 0,
    project_status: 'paused',
    visibility: 'private',
    start_date: options.today,
    end_date: null,
  };
}

export function duplicateLevelPayload(level: Row, projectId: string): Row {
  return {
    ...strip(level, ['id', 'project_id', 'created_at', 'updated_at']),
    project_id: projectId,
  };
}

export function duplicateFamilyMemberPayload(
  member: Row,
  projectId: string
): Row {
  return {
    ...strip(member, ['id', 'project_id', 'created_at', 'updated_at']),
    project_id: projectId,
  };
}

/** Ruta del objeto dentro del bucket a partir de su URL pública; null si no es de ese bucket. */
export function storagePathFromUrl(url: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length).split('?')[0] || null;
}

/** URL de la portada en la carpeta del proyecto nuevo; null si no es una imagen subida a ese proyecto. */
export function rewriteImageUrl(
  url: string,
  fromId: string,
  toId: string
): string | null {
  const from = `/projects/${fromId}/`;
  return url.includes(from) ? url.replace(from, `/projects/${toId}/`) : null;
}
