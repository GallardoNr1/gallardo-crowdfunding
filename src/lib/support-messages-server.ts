import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupportMessageInput } from './schemas';

// Mensajes de apoyo: solo servidor (service_role). Nacen pendientes de aprobación.

export interface CreatedSupportMessage {
  id: string;
  author_name: string;
  author_emoji: string;
  message: string;
  is_from_contributor: boolean;
  is_approved: boolean;
  created_at: string;
}

export type CreateSupportMessageResult =
  | { ok: true; message: CreatedSupportMessage }
  | { ok: false; status: 404 | 500; error: string };

export async function createSupportMessage(
  admin: SupabaseClient,
  input: SupportMessageInput
): Promise<CreateSupportMessageResult> {
  const { data: project } = await admin
    .from('project_config')
    .select('id, project_status')
    .eq('id', input.projectId)
    .maybeSingle();
  if (!project || project.project_status === 'cancelled') {
    return { ok: false, status: 404, error: 'Proyecto no encontrado.' };
  }

  // La insignia de contribuidor se decide aquí, con el email, sin exponer la tabla al navegador.
  let contribution: { id: string; contributor_emoji: string } | null = null;
  if (input.authorEmail) {
    const { data } = await admin
      .from('contributions')
      .select('id, contributor_emoji')
      .eq('project_id', input.projectId)
      .eq('contributor_email', input.authorEmail)
      .neq('payment_status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    contribution = data ?? null;
  }

  const { data, error } = await admin
    .from('support_messages')
    .insert({
      project_id: input.projectId,
      author_name: input.authorName ?? 'Anónimo',
      author_emoji: contribution?.contributor_emoji || '😊',
      message: input.message,
      is_from_contributor: !!contribution,
      contribution_id: contribution?.id ?? null,
      is_approved: false,
    })
    .select('id, author_name, author_emoji, message, is_from_contributor, is_approved, created_at')
    .single();

  if (error || !data) {
    console.error('[support-messages] insert failed:', error?.message);
    return { ok: false, status: 500, error: 'No se pudo guardar el mensaje.' };
  }
  return { ok: true, message: data as CreatedSupportMessage };
}

export async function setSupportMessageApproved(
  admin: SupabaseClient,
  id: string,
  approved: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin
    .from('support_messages')
    .update({ is_approved: approved, updated_at: new Date().toISOString() })
    .eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteSupportMessage(
  admin: SupabaseClient,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin.from('support_messages').delete().eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export interface AdminSupportMessageRow {
  id: string;
  author_name: string;
  author_emoji: string;
  message: string;
  is_from_contributor: boolean;
  is_approved: boolean;
  created_at: string;
}

export async function listSupportMessages(
  admin: SupabaseClient,
  projectId: string
): Promise<AdminSupportMessageRow[]> {
  const { data, error } = await admin
    .from('support_messages')
    .select('id, author_name, author_emoji, message, is_from_contributor, is_approved, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[support-messages] list failed:', error.message);
    return [];
  }
  return (data ?? []) as AdminSupportMessageRow[];
}
