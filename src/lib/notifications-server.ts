// Avisos al organizador con Supabase + SMTP reales (solo servidor). Se llaman "sin esperar"
// desde los endpoints públicos: un fallo de email nunca afecta a la aportación o al mensaje.
import type { SupabaseClient } from '@supabase/supabase-js';
import { isMailConfigured, sendMail } from './mailer';
import {
  notifyContribution,
  notifySupportMessage,
  type OwnerInfo,
} from './notifications';

/** Email del dueño del espacio al que pertenece el proyecto, con nombre y moneda del proyecto. */
export async function getProjectOwnerEmail(
  admin: SupabaseClient,
  projectId: string
): Promise<OwnerInfo | null> {
  const { data: project } = await admin
    .from('project_config')
    .select('project_name, currency, tenants(owner_user_id)')
    .eq('id', projectId)
    .maybeSingle();
  const ownerId = (
    project as { tenants?: { owner_user_id?: string } | null } | null
  )?.tenants?.owner_user_id;
  if (!project || !ownerId) return null;

  const { data } = await admin.auth.admin.getUserById(ownerId);
  if (!data.user?.email) return null;
  return {
    email: data.user.email,
    projectName: (project as { project_name: string }).project_name,
    currency: (project as { currency: string }).currency ?? 'EUR',
  };
}

function deps(admin: SupabaseClient, siteOrigin: string) {
  return {
    send: sendMail,
    getOwnerEmail: (projectId: string) =>
      getProjectOwnerEmail(admin, projectId),
    siteOrigin,
  };
}

/** Aviso de aportación pendiente. No lanza; devuelve false si no hay SMTP o falla. */
export function notifyContributionAsync(
  admin: SupabaseClient,
  siteOrigin: string,
  projectId: string,
  contribution: Parameters<typeof notifyContribution>[1]
): Promise<boolean> {
  if (!isMailConfigured()) return Promise.resolve(false);
  return notifyContribution(projectId, contribution, deps(admin, siteOrigin));
}

/** Aviso de mensaje de apoyo pendiente. No lanza; devuelve false si no hay SMTP o falla. */
export function notifySupportMessageAsync(
  admin: SupabaseClient,
  siteOrigin: string,
  projectId: string,
  message: Parameters<typeof notifySupportMessage>[1]
): Promise<boolean> {
  if (!isMailConfigured()) return Promise.resolve(false);
  return notifySupportMessage(projectId, message, deps(admin, siteOrigin));
}
