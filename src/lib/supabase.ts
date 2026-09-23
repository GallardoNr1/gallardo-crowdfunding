// src/lib/supabase.ts — cliente público (clave anon) compartido por servidor SSR y navegador.
// SOLO LECTURAS y suscripciones. Toda escritura pasa por los endpoints /api/* con service_role
// (ver src/lib/contributions-server.ts y src/lib/support-messages-server.ts).
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from './themes';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ===============================================
// TIPOS DE DATOS
// ===============================================

export interface Tenant {
  id: string;
  /** Número público de 6 dígitos (URL /<number>). */
  number: number;
  name: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface ProjectConfig {
  id: string;
  /** Espacio (tenant) al que pertenece. */
  tenant_id: string;
  /** Público: en la portada de la web; privado: solo con el enlace. */
  visibility?: 'public' | 'private';
  /** Espacio embebido (`select('*, tenants(number, name)')`). */
  tenants?: Pick<Tenant, 'number' | 'name'> | null;
  project_name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  project_status: 'active' | 'completed' | 'paused' | 'cancelled';
  project_description?: string;
  project_image_url?: string;
  start_date: string;
  end_date?: string;
  redirect_url: string;
  created_at: string;
  updated_at: string;
  slug: string;
  page_content?: ProjectPageContent;
  bizum_phone?: string;
  bizum_concept?: string;
  emoji_options?: EmojiOption[];
  /** 'target' (objetivo fijo) u 'open' (por tiempo, sin objetivo). */
  campaign_mode?: 'target' | 'open';
  base_amount?: number;
  base_label?: string | null;
  allow_custom_amount?: boolean;
  min_custom_amount?: number;
}

export type mainMessageType = {
  message: string;
  signature?: string;
  familyName?: string;
  date?: string;
};

export type ProjectPageContent = {
  pageTitle?: string;
  pageSubtitle?: string;
  productUrl?: string;
  mainMessage?: mainMessageType;
  progressTitle?: string;
  contributorsTitle?: string;
  photoSectionTitle?: string;
  cta?: CtaProps;
  bizum_phone?: string;
  bizum_concept?: string;
  /** Tema visual de la página (src/lib/themes.ts). */
  theme?: ThemeId;
};

export interface CtaProps {
  icon: string;
  title: string;
  text: string;
  stats: { number: string; label: string }[];
}

export interface EmojiOption {
  value: string;
  label: string;
}

export type PaymentMethodId = 'cash' | 'bizum' | 'bank_transfer';

export interface PaymentInstructionsTemplate {
  title: string;
  concept?: string;
  steps: string[];
  tip?: string;
}

export interface PaymentMethodConfig {
  id: string;
  payment_method: PaymentMethodId;
  is_active: boolean;
  bizum_phone?: string | null;
  instructions?: PaymentInstructionsTemplate | null;
}

export interface ContributionLevel {
  id: string;
  name: string;
  amount: number;
  emoji: string;
  description?: string;
  color: string;
  rewards: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  emoji: string;
  age?: number;
  role?: string;
  message?: string;
  avatar_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  author_name: string;
  author_emoji: string;
  message: string;
  is_from_contributor: boolean;
  contribution_id?: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

/** Fila de la vista `public_contributions` (sin email, solo completadas y no de prueba). */
export interface PublicContribution {
  id: string;
  contributor_name: string;
  contributor_emoji: string;
  amount: number;
  level_name: string;
  message?: string;
  created_at: string;
  level_color: string;
  level_emoji: string;
}

// ===============================================
// LECTURAS
// ===============================================

/** Proyectos visibles públicamente (los cancelados no aparecen). */
export async function getProjectsConfig(): Promise<ProjectConfig[] | null> {
  const { data, error } = await supabase
    .from('project_config')
    .select('*')
    .neq('project_status', 'cancelled')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error.message);
    return null;
  }
  return data;
}

export async function getProjectBySlug(slug: string): Promise<ProjectConfig | null> {
  if (!slug) return null;
  const { data, error } = await supabase
    .from('project_config')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching project by slug:', error.message);
    return null;
  }
  return data;
}

export async function getContributionLevels(projectId: string): Promise<ContributionLevel[]> {
  const { data, error } = await supabase
    .from('contribution_levels')
    .select('*')
    .eq('is_active', true)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching contribution levels:', error.message);
    return [];
  }
  return data ?? [];
}

/** Contribuciones públicas, las más recientes primero. */
export async function getPublicContributions(
  projectId: string,
  limit = 50
): Promise<PublicContribution[]> {
  const { data, error } = await supabase
    .from('public_contributions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching public contributions:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getFamilyMembers(projectId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('is_active', true)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching family members:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getSupportMessages(
  projectId: string,
  limit = 20
): Promise<{ success: boolean; data?: SupportMessage[]; error?: string }> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('is_approved', true)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching support messages:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true, data: (data ?? []) as SupportMessage[] };
}

export async function getPaymentMethods(): Promise<PaymentMethodConfig[]> {
  const { data, error } = await supabase.from('payment_instructions').select('*');
  if (error) {
    console.error('Error fetching payment methods:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getImagesFromFolder(projectId: string): Promise<string[]> {
  const folderPath = `projects/${projectId}/fotoFami`;
  const { data, error } = await supabase.storage
    .from('project-assets')
    .list(folderPath, { limit: 100, sortBy: { column: 'name', order: 'asc' } });

  if (error || !data) return [];

  return data
    .filter((item) => item.name)
    .map(
      (item) =>
        supabase.storage.from('project-assets').getPublicUrl(`${folderPath}/${item.name}`).data
          .publicUrl
    );
}

export function normalizeProjectPageContent(raw: unknown): Required<ProjectPageContent> {
  const c = (raw ?? {}) as ProjectPageContent;

  return {
    pageTitle: c.pageTitle ?? '',
    pageSubtitle: c.pageSubtitle ?? '',
    productUrl: c.productUrl ?? '',
    mainMessage: c.mainMessage ?? { message: '', signature: '', familyName: '', date: '' },
    progressTitle: c.progressTitle ?? '🎯 Progreso',
    contributorsTitle: c.contributorsTitle ?? '✨ Contribuidores',
    photoSectionTitle: c.photoSectionTitle ?? '📸 Fotos',
    cta: {
      icon: c.cta?.icon ?? '🎁',
      title: c.cta?.title ?? '¿Nos ayudas?',
      text: c.cta?.text ?? '',
      stats: c.cta?.stats ?? [],
    },
    bizum_phone: c.bizum_phone ?? '',
    bizum_concept: c.bizum_concept ?? '',
    theme: isThemeId(c.theme) ? c.theme : DEFAULT_THEME_ID,
  };
}

// ===============================================
// TIEMPO REAL — Broadcast por proyecto
// ===============================================
// Los eventos los emiten triggers de Postgres (supabase/migrations/20260922100100_realtime_broadcast.sql)
// en el topic `project:<id>`, sin datos personales. Hasta aplicar esa migración no llega nada.

export interface ProjectContributionEvent {
  id: string;
  project_id: string;
  contributor_name: string;
  contributor_emoji: string;
  amount: number;
  level_name: string | null;
  level_emoji: string;
  level_color: string;
  message: string | null;
  created_at: string;
}

export interface ProjectSupportMessageEvent {
  id: string;
  project_id: string;
  author_name: string;
  author_emoji: string;
  message: string;
  is_from_contributor: boolean;
  created_at: string;
}

export interface ProjectEventHandlers {
  onContribution?: (event: ProjectContributionEvent) => void;
  onSupportMessage?: (event: ProjectSupportMessageEvent) => void;
}

/** Devuelve la función para cancelar la suscripción. */
export function subscribeToProjectEvents(
  projectId: string,
  handlers: ProjectEventHandlers
): () => void {
  const channel = supabase.channel(`project:${projectId}`);

  if (handlers.onContribution) {
    channel.on('broadcast', { event: 'contribution_completed' }, ({ payload }) => {
      handlers.onContribution?.(payload as ProjectContributionEvent);
    });
  }
  if (handlers.onSupportMessage) {
    channel.on('broadcast', { event: 'support_message_approved' }, ({ payload }) => {
      handlers.onSupportMessage?.(payload as ProjectSupportMessageEvent);
    });
  }

  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
