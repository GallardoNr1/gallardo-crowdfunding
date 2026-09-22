import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContributionInput, ContributionStatus } from './schemas';

// Lógica de contribuciones que SOLO corre en servidor con el cliente service_role.
// El importe siempre sale del nivel elegido; el navegador nunca lo decide.

export interface CreatedContribution {
  id: string;
  amount: number;
  level_name: string;
  payment_status: ContributionStatus;
}

export type CreateContributionResult =
  | { ok: true; contribution: CreatedContribution }
  | { ok: false; status: 404 | 409 | 422 | 500; error: string };

export async function createPendingContribution(
  admin: SupabaseClient,
  input: ContributionInput
): Promise<CreateContributionResult> {
  const { data: project } = await admin
    .from('project_config')
    .select('id, project_status')
    .eq('id', input.projectId)
    .maybeSingle();
  if (!project) return { ok: false, status: 404, error: 'Proyecto no encontrado.' };
  if (project.project_status !== 'active') {
    return { ok: false, status: 409, error: 'Este proyecto ya no admite contribuciones.' };
  }

  const { data: level } = await admin
    .from('contribution_levels')
    .select('id, name, amount, is_active')
    .eq('id', input.levelId)
    .eq('project_id', input.projectId)
    .maybeSingle();
  if (!level || !level.is_active) {
    return { ok: false, status: 422, error: 'El nivel elegido no existe o no está disponible.' };
  }

  const { data: method } = await admin
    .from('payment_instructions')
    .select('is_active')
    .eq('payment_method', input.paymentMethod)
    .maybeSingle();
  if (!method || !method.is_active) {
    return { ok: false, status: 422, error: 'Método de pago no disponible.' };
  }

  const { data, error } = await admin
    .from('contributions')
    .insert({
      project_id: input.projectId,
      contributor_name: input.contributorName,
      contributor_email: input.contributorEmail,
      contributor_emoji: input.contributorEmoji,
      amount: level.amount,
      level_id: level.id,
      level_name: level.name,
      message: input.message ?? null,
      payment_method: input.paymentMethod,
      payment_status: 'pending',
      payment_reference: null,
      is_anonymous: input.isAnonymous,
      is_test: false,
      metadata: {},
    })
    .select('id, amount, level_name, payment_status')
    .single();

  if (error || !data) {
    console.error('[contributions] insert failed:', error?.message);
    return { ok: false, status: 500, error: 'No se pudo registrar la contribución.' };
  }
  return { ok: true, contribution: data as CreatedContribution };
}

/**
 * Recalcula project_config.current_amount desde las contribuciones completadas.
 * Idempotente y equivalente al trigger de la migración 20260922100000: mientras la
 * migración no esté aplicada, esto mantiene el importe; después, ambos coinciden.
 */
export async function recalcProjectAmount(
  admin: SupabaseClient,
  projectId: string
): Promise<number> {
  const { data, error } = await admin
    .from('contributions')
    .select('amount')
    .eq('project_id', projectId)
    .eq('payment_status', 'completed')
    .eq('is_test', false);
  if (error) throw new Error(`No se pudo leer contribuciones: ${error.message}`);

  const total = (data ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const { error: updateError } = await admin
    .from('project_config')
    .update({ current_amount: total, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (updateError) throw new Error(`No se pudo actualizar current_amount: ${updateError.message}`);
  return total;
}

export async function setContributionStatus(
  admin: SupabaseClient,
  contributionId: string,
  status: ContributionStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  const patch: Record<string, unknown> = {
    payment_status: status,
    updated_at: new Date().toISOString(),
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  };
  const { data, error } = await admin
    .from('contributions')
    .update(patch)
    .eq('id', contributionId)
    .select('project_id')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'Contribución no encontrada.' };

  try {
    await recalcProjectAmount(admin, data.project_id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  return { ok: true };
}

export interface AdminContributionRow {
  id: string;
  contributor_name: string;
  contributor_email: string;
  contributor_emoji: string;
  amount: number;
  level_name: string | null;
  message: string | null;
  payment_method: string;
  payment_status: ContributionStatus;
  is_anonymous: boolean;
  created_at: string;
  completed_at: string | null;
}

export async function listContributions(
  admin: SupabaseClient,
  projectId: string
): Promise<AdminContributionRow[]> {
  const { data, error } = await admin
    .from('contributions')
    .select(
      'id, contributor_name, contributor_email, contributor_emoji, amount, level_name, message, payment_method, payment_status, is_anonymous, created_at, completed_at'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[contributions] list failed:', error.message);
    return [];
  }
  return (data ?? []) as AdminContributionRow[];
}
