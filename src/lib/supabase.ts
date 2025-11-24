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
  redirect_url: string;
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
export async function getProjectsConfig(): Promise<ProjectConfig[] | null> {
  try {
    const { data, error } = await supabase
      .from('project_config')
      .select('*')
      .order('created_at', { ascending: false });

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
export async function getProjectConfig(
  id: string
): Promise<ProjectConfig | null> {
  try {
    const { data, error } = await supabase
      .from('project_config')
      .select(`*`)
      .eq('id', id)
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
export async function getContributionLevels(
  id: string
): Promise<ContributionLevel[]> {
  try {
    const { data, error } = await supabase
      .from('contribution_levels')
      .select('*')
      .eq('is_active', true)
      .eq('project_id', id)
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
  id: string,
  limit: number = 50
): Promise<PublicContribution[]> {
  try {
    const { data, error } = await supabase
      .from('public_contributions')
      .select('*')
      .eq('project_id', id)
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
export async function getFamilyMembers(id: string): Promise<FamilyMember[]> {
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('is_active', true)
      .eq('project_id', id)
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
  id: string,
  limit: number = 20
): Promise<{ success: boolean; data?: SupportMessage[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('is_approved', true)
      .eq('project_id', id)
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
  projectId: string;
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
          project_id: contributionData.projectId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating contribution:', error);
      return { success: false, error: error.message };
    }

    // Si la inserción fue exitosa, intentar incrementar el current_amount
    try {
      const inserted = data as Contribution;
      const projectId =
        contributionData.projectId || (inserted as any).project_id;
      const amount = Number(
        contributionData.amount ?? (inserted as any).amount
      );

      if (projectId && !Number.isNaN(amount) && amount > 0) {
        const rpcRes = await incrementProjectCurrentAmountRpc(
          projectId,
          amount
        );
        if (!rpcRes.success) {
          console.warn(
            'RPC increment failed after createContribution:',
            rpcRes.error
          );
          // Fallback: intentar la versión JS (read + update)
          const fallbackRes = await incrementProjectCurrentAmount(
            projectId,
            amount
          );
          if (!fallbackRes.success) {
            console.error('Fallback increment also failed:', fallbackRes.error);
          }
        }
      }
    } catch (err) {
      console.error(
        'Error incrementing project amount after createContribution:',
        err
      );
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
    // Primero obtener la contribución para conocer amount y project_id
    const { data: contrib, error: fetchErr } = await supabase
      .from('contributions')
      .select('amount, project_id, payment_status')
      .eq('id', contributionId)
      .single();

    if (fetchErr || !contrib) {
      console.error(
        'Error fetching contribution before status update:',
        fetchErr
      );
      return {
        success: false,
        error: fetchErr?.message || 'Contribución no encontrada',
      };
    }

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

    const { error: updateErr } = await supabase
      .from('contributions')
      .update(updateData)
      .eq('id', contributionId);

    if (updateErr) {
      console.error('Error updating contribution status:', updateErr);
      return { success: false, error: updateErr.message };
    }

    // Si el estado ahora es 'completed' y antes no lo estaba, incrementar el current_amount del proyecto
    try {
      const previousStatus = contrib.payment_status;
      if (status === 'completed' && previousStatus !== 'completed') {
        const amount = Number(contrib.amount) || 0;
        const projectId = contrib.project_id;
        if (projectId && amount > 0) {
          // Intentar RPC atómico primero
          const rpcResult = await incrementProjectCurrentAmountRpc(
            projectId,
            amount
          );
          if (!rpcResult.success) {
            // Fallback: usar la implementación JS (read + update)
            console.warn(
              'RPC failed, falling back to JS increment:',
              rpcResult.error
            );
            await incrementProjectCurrentAmount(projectId, amount);
          }
        }
      }
    } catch (e) {
      // No impedir que la actualización del estado sea exitosa si el incremento falla
      console.error(
        'Error incrementing project current_amount after status update:',
        e
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateContributionStatus:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Llamada a la RPC/Postgres function `increment_project_current_amount`.
 * Requiere que implementes la función PL/pgSQL en tu base de datos Supabase.
 * Si la RPC falla, puedes elegir un fallback (ya existe `incrementProjectCurrentAmount`).
 */
export async function incrementProjectCurrentAmountRpc(
  projectId: string,
  amountToAdd: number
): Promise<{ success: boolean; newAmount?: number; error?: string }> {
  if (!projectId) return { success: false, error: 'projectId requerido' };
  const amount = Number(amountToAdd);
  if (Number.isNaN(amount) || amount <= 0) {
    return {
      success: false,
      error: 'amountToAdd debe ser un número mayor que 0',
    };
  }

  try {
    // Llama a la función RPC definida en la base de datos
    const { data, error } = await supabase.rpc(
      'increment_project_current_amount',
      {
        p_project_id: projectId,
        p_amount: amount,
      }
    );

    if (error) {
      console.error('RPC error increment_project_current_amount:', error);
      return { success: false, error: error.message };
    }

    // data puede ser el valor retornado por la función (numeric)
    const newAmount = data as any;
    return { success: true, newAmount };
  } catch (err) {
    console.error('Error calling RPC increment_project_current_amount:', err);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Notas SQL (ejecutar en Supabase SQL editor):
 *
 * create or replace function increment_project_current_amount(
 *   p_project_id uuid,
 *   p_amount numeric
 * ) returns numeric as $$
 * declare
 *   new_amount numeric;
 * begin
 *   update project_config
 *   set current_amount = current_amount + p_amount,
 *       updated_at = now()
 *   where id = p_project_id
 *   returning current_amount into new_amount;
 *
 *   if not found then
 *     raise exception 'Project not found';
 *   end if;
 *
 *   return new_amount;
 * end;
 * $$ language plpgsql security definer;
 */

/**
 * Incrementa el `current_amount` del proyecto sumando una cantidad.
 * Nota: esta implementación realiza una lectura + actualización. Si tu carga
 * concurrente puede ser alta, considera implementar esto en la base de datos
 * (función SQL/RPC) para garantizar atomicidad.
 */
export async function incrementProjectCurrentAmount(
  projectId: string,
  amountToAdd: number
): Promise<{ success: boolean; newAmount?: number; error?: string }> {
  if (!projectId) return { success: false, error: 'projectId requerido' };
  const amount = Number(amountToAdd);
  if (Number.isNaN(amount) || amount <= 0) {
    return {
      success: false,
      error: 'amountToAdd debe ser un número mayor que 0',
    };
  }

  try {
    const { data: projectData, error: selectError } = await supabase
      .from('project_config')
      .select('current_amount')
      .eq('id', projectId)
      .single();

    if (selectError || !projectData) {
      console.error('Error fetching project current_amount:', selectError);
      return {
        success: false,
        error: selectError?.message || 'Proyecto no encontrado',
      };
    }

    const current = Number(projectData.current_amount) || 0;
    const newAmount = current + amount;
    console.log('Updating project current_amount to:', newAmount);
    const { error: updateError } = await supabase
      .from('project_config')
      .update({
        current_amount: newAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
    console.log(
      'Update operation completed for projectId:',
      projectId,
      updateError
    );
    if (updateError) {
      console.error('Error updating project current_amount:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, newAmount };
  } catch (err) {
    console.error('Error in incrementProjectCurrentAmount:', err);
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
  project_id: string;
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
      project_id: messageData.project_id,
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
 * Wrapper que normaliza el payload de Realtime y facilita su consumo.
 * Devuelve el canal (igual que subscribeToContributions) para poder hacer unsubscribe.
 * El callback recibe un objeto con la forma:
 * { eventType: 'INSERT'|'UPDATE'|'DELETE', newRecord?: any, oldRecord?: any, schema, table, commit_timestamp }
 */
export function subscribeToContributionsNormalized(
  callback: (payload: {
    eventType: string;
    newRecord?: any;
    oldRecord?: any;
    schema?: string;
    table?: string;
    commit_timestamp?: string;
    raw?: any;
  }) => void
) {
  const handler = (raw: any) => {
    // Diferentes versiones/formatos de supabase pueden devolver fields distintos
    const eventType =
      raw.eventType ||
      raw.event ||
      raw.type ||
      (raw.payload && raw.payload.type) ||
      null;
    const newRecord =
      raw.new ||
      raw.record ||
      (raw.payload && raw.payload.new) ||
      (raw.payload && raw.payload.record) ||
      null;
    const oldRecord = raw.old || (raw.payload && raw.payload.old) || null;
    const schema =
      raw.schema || raw.payload?.schema || raw.table?.schema || null;
    const table =
      raw.table ||
      raw.payload?.table ||
      (raw.record && raw.record.table) ||
      'contributions';
    const commit_timestamp =
      raw.commit_timestamp || raw.payload?.commit_timestamp || null;

    try {
      callback({
        eventType,
        newRecord,
        oldRecord,
        schema,
        table,
        commit_timestamp,
        raw,
      });
    } catch (err) {
      console.error(
        'Error in subscribeToContributionsNormalized callback:',
        err
      );
    }
  };

  return subscribeToContributions(handler);
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

/*
 RLS / Permisos - Checklist rápido
 1) Si tienes Row Level Security (RLS) activado para `contributions`, asegúrate de que
    la política permita que el role que hace la suscripción vea los eventos necesarios.
    - Para pruebas puedes desactivar RLS temporalmente.
    - Si llamas a la RPC desde el cliente, la función debe ser `security definer` y
      otorgar únicamente lo necesario (la función ejecuta UPDATE internamente).

 2) Si las suscripciones no entregan payloads al cliente, revisa:
    - Que Realtime esté habilitado en el proyecto Supabase.
    - Las políticas RLS sobre la tabla `contributions` (SELECT/INSERT/UPDATE).
    - Logs en Supabase para ver si Realtime descarta el evento por permisos.

 3) Recomendación de seguridad:
    - Para operaciones sensibles (incrementos monetarios, cambios en estados), realiza
      la lógica en el servidor o en RPCs `security definer` y llama desde un backend.

 Si quieres, puedo generar ejemplos de políticas RLS básicas para permitir suscripciones en modo prueba.
*/
