// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Verificar que las variables de entorno estén configuradas
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno de Supabase. Verifica tu archivo .env.local'
  );
}

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No necesitamos sesiones persistentes para este proyecto
  },
});

// ===============================================
// TIPOS DE DATOS (TypeScript)
// ===============================================

export interface ProjectConfig {
  id: string;
  project_name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  project_status: 'active' | 'completed' | 'paused' | 'cancelled';
  project_description?: string;
  project_image_url?: string;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
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

export interface Contribution {
  id: string;
  contributor_name: string;
  contributor_email: string;
  contributor_emoji: string;
  amount: number;
  level_id?: string;
  level_name?: string;
  message?: string;
  payment_method: 'bizum' | 'paypal' | 'card' | 'transfer' | 'crypto';
  payment_status:
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'refunded';
  payment_reference?: string;
  is_anonymous: boolean;
  is_test: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
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

export interface ProjectOverview {
  project_name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  progress_percentage: number;
  total_contributors: number;
  project_status: string;
  start_date: string;
  end_date?: string;
}

// ===============================================
// FUNCIONES DE CONSULTA (LECTURA)
// ===============================================

/**
 * Obtener configuración del proyecto
 */
export async function getProjectConfig(): Promise<ProjectConfig | null> {
  try {
    const { data, error } = await supabase
      .from('project_config')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching project config:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getProjectConfig:', error);
    return null;
  }
}

/**
 * Obtener vista general del proyecto con estadísticas
 */
export async function getProjectOverview(): Promise<ProjectOverview | null> {
  try {
    const { data, error } = await supabase
      .from('project_overview')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching project overview:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getProjectOverview:', error);
    return null;
  }
}

/**
 * Obtener todos los niveles de contribución activos
 */
export async function getContributionLevels(): Promise<ContributionLevel[]> {
  try {
    const { data, error } = await supabase
      .from('contribution_levels')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching contribution levels:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getContributionLevels:', error);
    return [];
  }
}

/**
 * Obtener contribuciones públicas (completadas y no anónimas)
 */
export async function getPublicContributions(
  limit: number = 50
): Promise<PublicContribution[]> {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error fetching public contributions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPublicContributions:', error);
    return [];
  }
}

/**
 * Obtener miembros de la familia activos
 */
export async function getFamilyMembers(): Promise<FamilyMember[]> {
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching family members:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getFamilyMembers:', error);
    return [];
  }
}

/**
 * Obtener mensajes de apoyo aprobados
 */
export async function getSupportMessages(
  limit: number = 20
): Promise<{ success: boolean; data?: SupportMessage[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching support messages:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SupportMessage[] };
  } catch (error) {
    console.error('Error in getSupportMessages:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Obtener un nivel de contribución específico por ID
 */
export async function getContributionLevel(
  id: string
): Promise<ContributionLevel | null> {
  try {
    const { data, error } = await supabase
      .from('contribution_levels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching contribution level:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getContributionLevel:', error);
    return null;
  }
}

// ===============================================
// FUNCIONES DE INSERCIÓN (ESCRITURA)
// ===============================================

/**
 * Crear una nueva contribución
 */
export async function createContribution(contributionData: {
  contributorName: string;
  contributorEmail: string;
  contributorEmoji: string;
  amount: number;
  levelId?: string;
  levelName: string;
  contributorMessage?: string;
  paymentMethod: string;
  isAnonymous: boolean;
  isTest?: boolean;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; data?: Contribution; error?: string }> {
  try {
    const contrLevel = await getContributionLevel(
      contributionData.levelId || ''
    );
    const { data, error } = await supabase
      .from('contributions')
      .insert([
        {
          contributor_name: contributionData.contributorName,
          contributor_email: contributionData.contributorEmail,
          contributor_emoji: contributionData.contributorEmoji,
          amount: contributionData.amount,
          level_id: contributionData.levelId || null,
          level_name: contrLevel?.name,
          message: contributionData.contributorMessage,
          payment_method: contributionData.paymentMethod,
          is_anonymous: contributionData.isAnonymous,
          is_test: false,
          metadata: contributionData.metadata,
          completed_at: new Date().toISOString(),
          payment_status: 'completed', // Siempre empezar como pending
          payment_reference: null, // Inicialmente no hay referencia de pago
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating contribution:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in createContribution:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Actualizar el estado de una contribución
 */
export async function updateContributionStatus(
  contributionId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded',
  paymentReference?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      payment_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (paymentReference) {
      updateData.payment_reference = paymentReference;
    }

    const { error } = await supabase
      .from('contributions')
      .update(updateData)
      .eq('id', contributionId);

    if (error) {
      console.error('Error updating contribution status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateContributionStatus:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Crear un nuevo mensaje de apoyo
 */
export async function createSupportMessage(messageData: {
  author_name: string;
  author_emoji: string;
  author_email: string;
  message: string;
  is_from_contributor?: boolean;
  contribution_id?: string;
}): Promise<{ success: boolean; data?: SupportMessage; error?: string }> {
  try {
    const contribiuter = await findContribution(
      messageData.author_name,
      messageData.author_email
    );

    if (contribiuter) {
      messageData.author_emoji = contribiuter.contributor_emoji;
      messageData.is_from_contributor = true;
      messageData.contribution_id = contribiuter.id;
    } else {
      messageData.author_emoji = '😊';
      messageData.is_from_contributor = false;
      messageData.is_from_contributor = false;
    }
    const { author_email, ...messageDataWithoutEmail } = messageData;
    const finalMessage = {
      ...messageDataWithoutEmail,
      contribution_id: messageData.contribution_id || null,
      is_from_contributor: messageData.is_from_contributor || false,
      is_approved: true,
    };
    const { data, error } = await supabase
      .from('support_messages')
      .insert([finalMessage])
      .select()
      .single();

    if (error) {
      console.error('Error creating support message:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in createSupportMessage:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

// ===============================================
// FUNCIONES DE UTILIDAD
// ===============================================

/**
 * Verificar conexión con Supabase
 */
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('project_config')
      .select('id')
      .limit(1);

    return !error;
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return false;
  }
}

/**
 *
 * Encontrar contribución
 */
export async function findContribution(
  contributorName: string,
  contributorEmail: string
): Promise<Contribution | null> {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('contributor_name', contributorName)
      .eq('contributor_email', contributorEmail)
      .single();

    if (error) {
      console.error('Error finding contribution:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in findContribution:', error);
    return null;
  }
}

/**
 * Obtener estadísticas rápidas
 */
export async function getQuickStats(): Promise<{
  totalContributions: number;
  totalAmount: number;
  totalContributors: number;
  progressPercentage: number;
}> {
  try {
    const overview = await getProjectOverview();

    if (!overview) {
      return {
        totalContributions: 0,
        totalAmount: 0,
        totalContributors: 0,
        progressPercentage: 0,
      };
    }

    return {
      totalContributions: overview.total_contributors,
      totalAmount: overview.current_amount,
      totalContributors: overview.total_contributors,
      progressPercentage: overview.progress_percentage,
    };
  } catch (error) {
    console.error('Error in getQuickStats:', error);
    return {
      totalContributions: 0,
      totalAmount: 0,
      totalContributors: 0,
      progressPercentage: 0,
    };
  }
}

// ===============================================
// SUSCRIPCIONES EN TIEMPO REAL (OPCIONAL)
// ===============================================

/**
 * Suscribirse a cambios en contribuciones
 */
export function subscribeToContributions(callback: (payload: any) => void) {
  return supabase
    .channel('contributions-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contributions' },
      callback
    )
    .subscribe();
}

/**
 * Suscribirse a cambios en mensajes de apoyo
 */
export function subscribeToSupportMessages(callback: (payload: any) => void) {
  return supabase
    .channel('support-messages-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_messages' },
      callback
    )
    .subscribe();
}
