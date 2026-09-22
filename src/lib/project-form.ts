import {
  ProjectFormInput,
  fieldErrors,
  type CampaignMode,
  type ProjectStatus,
} from './schemas';
import type { ThemeId } from './themes';

// Convierte el formulario del backoffice (new/edit) en la fila de project_config.
// Único punto de validación para ambos formularios (MEJORAS N-14).

export interface ProjectPageContentRow {
  pageTitle: string;
  pageSubtitle: string;
  productUrl: string;
  mainMessage: {
    message: string;
    signature: string;
    familyName: string;
    date: string;
  };
  progressTitle: string;
  contributorsTitle: string;
  photoSectionTitle: string;
  cta: {
    icon: string;
    title: string;
    text: string;
    stats: { number: string; label: string }[];
  };
  bizum_phone: string;
  bizum_concept: string;
  theme: ThemeId;
}

export interface ProjectRowInput {
  project_name: string;
  slug: string;
  project_description: string | null;
  project_status: ProjectStatus;
  target_amount: number;
  currency: string;
  project_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  redirect_url: string;
  bizum_phone: string | null;
  bizum_concept: string | null;
  campaign_mode: CampaignMode;
  base_amount: number;
  base_label: string | null;
  allow_custom_amount: boolean;
  min_custom_amount: number;
  page_content: ProjectPageContentRow;
}

export type ParseProjectFormResult =
  | { ok: true; data: ProjectRowInput }
  | { ok: false; fields: Record<string, string> };

export function parseProjectForm(
  form: FormData | Record<string, unknown>
): ParseProjectFormResult {
  const raw =
    form instanceof FormData ? Object.fromEntries(form.entries()) : form;
  const parsed = ProjectFormInput.safeParse(raw);
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error) };

  const d = parsed.data;
  return {
    ok: true,
    data: {
      project_name: d.project_name,
      slug: d.slug,
      project_description: d.project_description,
      project_status: d.project_status,
      target_amount: d.target_amount,
      currency: d.currency,
      project_image_url: d.project_image_url,
      start_date: d.start_date,
      end_date: d.end_date,
      redirect_url: d.redirect_url,
      bizum_phone: d.bizum_phone,
      bizum_concept: d.bizum_concept,
      campaign_mode: d.campaign_mode,
      base_amount: d.base_amount,
      base_label: d.base_label,
      allow_custom_amount: d.allow_custom_amount,
      min_custom_amount: d.min_custom_amount,
      page_content: {
        pageTitle: d.pageTitle ?? '',
        pageSubtitle: d.pageSubtitle ?? '',
        productUrl: d.productUrl ?? '',
        mainMessage: {
          message: d.mainMessage_message ?? '',
          signature: d.mainMessage_signature ?? '',
          familyName: d.mainMessage_familyName ?? '',
          date: d.mainMessage_date ?? '',
        },
        progressTitle: d.progressTitle ?? '🎯 Progreso',
        contributorsTitle: d.contributorsTitle ?? '✨ Contribuidores',
        photoSectionTitle: d.photoSectionTitle ?? '📸 Fotos',
        cta: {
          icon: d.cta_icon ?? '🎁',
          title: d.cta_title ?? '',
          text: d.cta_text ?? '',
          stats: [],
        },
        bizum_phone: d.bizum_phone ?? '',
        bizum_concept: d.bizum_concept ?? '',
        theme: d.theme,
      },
    },
  };
}

// ── Niveles de contribución en el alta ──────────────────────────────────────
// El formulario de alta puede traer varias filas de nivel (inputs repetidos
// level_name/level_amount/level_emoji/level_description/level_color, en el mismo orden).

export interface LevelRowInput {
  name: string;
  amount: number;
  emoji: string;
  description: string;
  color: string;
  sort_order: number;
}

export type ParseLevelRowsResult =
  { ok: true; levels: LevelRowInput[] } | { ok: false; error: string };

const DEFAULT_LEVEL_EMOJI = '⭐';
const DEFAULT_LEVEL_COLOR = '#6366f1';

/** Lee las filas de nivel; las filas totalmente vacías se ignoran. */
export function parseLevelRows(form: FormData): ParseLevelRowsResult {
  const column = (name: string) =>
    form.getAll(name).map((v) => (typeof v === 'string' ? v : ''));
  const names = column('level_name');
  const amounts = column('level_amount');
  const emojis = column('level_emoji');
  const descriptions = column('level_description');
  const colors = column('level_color');

  const levels: LevelRowInput[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i].trim().slice(0, 60);
    const rawAmount = (amounts[i] ?? '').trim();
    if (!name && !rawAmount) continue;
    if (!name)
      return { ok: false, error: `El nivel ${i + 1} necesita un nombre.` };
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        error: `El nivel "${name}" necesita un importe mayor que 0.`,
      };
    }
    const color = (colors[i] ?? '').trim();
    levels.push({
      name,
      amount: Math.round(amount * 100) / 100,
      emoji: (emojis[i] ?? '').trim().slice(0, 8) || DEFAULT_LEVEL_EMOJI,
      description: (descriptions[i] ?? '').trim().slice(0, 200),
      color: /^#[0-9a-f]{6}$/i.test(color)
        ? color.toLowerCase()
        : DEFAULT_LEVEL_COLOR,
      sort_order: levels.length,
    });
  }
  return { ok: true, levels };
}
