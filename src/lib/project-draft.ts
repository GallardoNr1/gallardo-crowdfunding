// Borrador de proyecto generado por IA para el formulario de alta del backoffice.
// Módulo puro (sin SDK ni red): esquemas Zod, normalización del borrador y prompt de sistema.
// El borrador NUNCA se guarda solo: rellena el formulario y la persona lo revisa y lo envía.
import { z } from 'zod';
import { THEMES, THEME_IDS, getTheme } from './themes';

/** Cuerpo de POST /admin/api/draft-project. */
export const DraftRequest = z.strictObject({
  brief: z.string().trim().min(10).max(4000),
});
export type DraftRequest = z.infer<typeof DraftRequest>;

export const DraftLevel = z.object({
  name: z.string(),
  amount: z.number(),
  emoji: z.string(),
  description: z.string(),
  color: z.string(),
});

/**
 * Salida estructurada que pedimos al modelo. Mismos nombres que los campos del formulario
 * (`ProjectFormInput`) para poder volcarla directamente. Sin defaults ni transforms: este
 * esquema se convierte a JSON Schema para `output_config.format`.
 */
export const ProjectDraft = z.object({
  project_name: z.string(),
  slug: z.string(),
  project_description: z.string(),
  campaign_mode: z.enum(['target', 'open']),
  target_amount: z.number().nullable(),
  currency: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  base_amount: z.number().nullable(),
  base_label: z.string().nullable(),
  allow_custom_amount: z.boolean(),
  min_custom_amount: z.number().nullable(),
  bizum_concept: z.string().nullable(),
  pageTitle: z.string(),
  pageSubtitle: z.string(),
  productUrl: z.string().nullable(),
  progressTitle: z.string(),
  contributorsTitle: z.string(),
  photoSectionTitle: z.string(),
  mainMessage_message: z.string(),
  mainMessage_signature: z.string(),
  mainMessage_familyName: z.string(),
  mainMessage_date: z.string(),
  cta_icon: z.string(),
  cta_title: z.string(),
  cta_text: z.string(),
  theme: z.enum(THEME_IDS),
  levels: z.array(DraftLevel),
  /** Suposiciones y datos que faltan, para que quien revisa sepa qué mirar. */
  notes: z.array(z.string()),
});
export type ProjectDraft = z.infer<typeof ProjectDraft>;
export type ProjectDraftInput = z.input<typeof ProjectDraft>;
export type DraftLevel = z.infer<typeof DraftLevel>;

export const MAX_DRAFT_LEVELS = 8;
const DEFAULT_LEVEL_COLOR = '#6366f1';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const text = (v: string | null | undefined, max: number) =>
  (v ?? '').trim().slice(0, max);
const textOrNull = (v: string | null | undefined, max: number) =>
  text(v, max) || null;
const money = (v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? round2(v) : null;

function isoDateOrNull(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  if (!ISO_DATE.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s
    ? null
    : s;
}

function httpUrlOrNull(v: string | null | undefined): string | null {
  const s = text(v, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? s : null;
  } catch {
    return null;
  }
}

/**
 * Deja el borrador listo para el formulario: recorta longitudes, arregla el slug, descarta
 * valores que no encajan con el modo de campaña y sanea los niveles. Nunca lanza.
 */
export function normalizeDraft(raw: ProjectDraftInput): ProjectDraft {
  const theme = getTheme(raw.theme);
  const open = raw.campaign_mode === 'open';
  const projectName = text(raw.project_name, 120);

  const levels = raw.levels
    .map((l) => ({
      name: text(l.name, 60),
      amount: money(l.amount) ?? 0,
      emoji: text(l.emoji, 8) || theme.emojis.contributor,
      description: text(l.description, 200),
      color: HEX_COLOR.test((l.color ?? '').trim())
        ? l.color.trim().toLowerCase()
        : DEFAULT_LEVEL_COLOR,
    }))
    .filter((l) => l.name && l.amount > 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, MAX_DRAFT_LEVELS);

  const notes = Array.from(
    new Set(raw.notes.map((n) => text(n, 300)).filter(Boolean))
  ).slice(0, 10);

  const minCustom = money(raw.min_custom_amount);

  return {
    project_name: projectName,
    slug: slugify(raw.slug || projectName),
    project_description: text(raw.project_description, 2000),
    campaign_mode: open ? 'open' : 'target',
    target_amount: open ? null : money(raw.target_amount),
    currency: text(raw.currency, 5) || 'EUR',
    start_date: isoDateOrNull(raw.start_date),
    end_date: isoDateOrNull(raw.end_date),
    base_amount: open ? money(raw.base_amount) : null,
    base_label: open ? textOrNull(raw.base_label, 60) : null,
    allow_custom_amount: !!raw.allow_custom_amount,
    min_custom_amount: minCustom !== null && minCustom >= 1 ? minCustom : 5,
    bizum_concept: textOrNull(raw.bizum_concept, 120),
    pageTitle: text(raw.pageTitle, 150),
    pageSubtitle: text(raw.pageSubtitle, 200),
    productUrl: open ? null : httpUrlOrNull(raw.productUrl),
    progressTitle: text(raw.progressTitle, 80) || '🎯 Progreso',
    contributorsTitle: text(raw.contributorsTitle, 80) || '✨ Contribuidores',
    photoSectionTitle: text(raw.photoSectionTitle, 80) || '📸 Fotos',
    mainMessage_message: text(raw.mainMessage_message, 5000),
    mainMessage_signature: text(raw.mainMessage_signature, 120),
    mainMessage_familyName: text(raw.mainMessage_familyName, 120),
    mainMessage_date: text(raw.mainMessage_date, 60),
    cta_icon: text(raw.cta_icon, 8) || '🎁',
    cta_title: text(raw.cta_title, 120),
    cta_text: text(raw.cta_text, 1000),
    theme: theme.id,
    levels,
    notes,
  };
}

/** Prompt de sistema: qué es la web, qué significa cada campo y qué no debe inventarse. */
export function buildDraftSystemPrompt(today: string): string {
  const themes = THEME_IDS.map((id) => {
    const t = THEMES[id];
    return `- "${id}": ${t.name} — ${t.description}`;
  }).join('\n');

  return `Eres el asistente del backoffice de "Gallardo Crowdfunding", una web privada de crowdfunding familiar en España: la familia y los amigos aportan dinero (por Bizum) para un regalo o proyecto de alguien de la familia (una bici para un niño, una tablet, un viaje...). Te describen a grandes rasgos el crowdfunding y tú preparas un BORRADOR de proyecto que una persona revisará y corregirá en un formulario antes de guardarlo. Hoy es ${today}.

Escribe en español de España, con tono cercano, cálido y familiar (tuteo), sin exagerar. Emojis con moderación: uno al principio de los títulos como mucho. No inventes datos personales ni de contacto (teléfonos, direcciones, URLs de productos concretos): si no te los dan, deja el campo vacío o null y apúntalo en "notes". No copies literalmente el texto que te dan: redáctalo como quedaría en la web.

Campos (mismos nombres que el formulario):
- project_name: nombre corto del proyecto (máx. 120). slug: solo minúsculas, números y guiones, sin acentos (p. ej. "bici-maximo").
- project_description: 1-3 frases que resumen el proyecto (máx. 2000).
- campaign_mode: "target" si hay un producto/precio concreto y la campaña termina al alcanzar ese dinero; "open" si es por tiempo (recaudar lo máximo posible hasta una fecha de cierre y con eso comprar lo que se pueda). Si dudas, usa "target" cuando mencionen un precio y "open" cuando mencionen una fecha límite sin precio.
- target_amount: importe objetivo (> 0) solo en modo "target"; null en modo "open". currency: "EUR" salvo que digan otra.
- start_date / end_date: fechas ISO (YYYY-MM-DD) o null. En modo "open" end_date es obligatoria: si te dan un cumpleaños o evento, calcula la fecha con el año que corresponda a partir de hoy (si ya ha pasado este año, el siguiente) y, si dicen "una semana antes", réstala. Explica el cálculo en "notes".
- base_amount / base_label: en modo "open", aportación inicial que pone la familia (p. ej. 100 con etiqueta "Papá y mamá"); null si no la mencionan. En modo "target", null.
- allow_custom_amount: true si tiene sentido aceptar "otra cantidad" además de los niveles (normalmente sí). min_custom_amount: mínimo de esa cantidad libre (5 por defecto).
- bizum_concept: concepto corto para el Bizum (máx. 120), p. ej. "Bici Máximo". No inventes bizum_phone: ese campo no existe aquí.
- pageTitle (máx. 150) y pageSubtitle (máx. 200): titular y subtítulo de la página pública.
- productUrl: URL del producto solo si te la dan y solo en modo "target"; si no, null.
- progressTitle, contributorsTitle, photoSectionTitle: títulos cortos de secciones (máx. 80), con un emoji delante; por defecto "🎯 Progreso", "✨ Contribuidores", "📸 Fotos".
- mainMessage_message: el mensaje de la familia a los visitantes (2-4 párrafos separados por líneas en blanco, máx. 5000): quién es la persona, qué se quiere conseguir, por qué y un agradecimiento. mainMessage_signature (p. ej. "La familia Gallardo"), mainMessage_familyName (p. ej. "Los Gallardo") y mainMessage_date (texto tipo "Septiembre 2026", con el mes de hoy).
- cta_icon (un emoji), cta_title (máx. 120) y cta_text (máx. 1000): llamada a la acción para aportar.
- theme: el tema visual que mejor pegue con el proyecto, uno de:
${themes}
- levels: entre 3 y 6 niveles de aportación con importes crecientes y coherentes con el proyecto (name máx. 60, amount > 0, emoji, description de una frase, color hexadecimal "#rrggbb" a juego con el tema). Ponles nombres con gracia relacionados con el proyecto (para una bici: "Timbre", "Sillín", "Rueda"...). En modo "target", que el nivel más alto no supere la mitad del objetivo.
- notes: lista de suposiciones que has hecho y de datos que faltan y la persona debe completar o comprobar (teléfono de Bizum, fechas, precios, nombres...). Frases cortas.

Rellena todos los campos que puedas deducir razonablemente; deja en "" o null lo que no sepas.`;
}
