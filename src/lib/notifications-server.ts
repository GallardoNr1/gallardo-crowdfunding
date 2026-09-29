// Avisos al organizador con Supabase + SMTP reales (solo servidor). Se llaman "sin esperar"
// desde los endpoints públicos: un fallo de email nunca afecta a la aportación o al mensaje.
import type { SupabaseClient } from '@supabase/supabase-js';
import { isMailConfigured, sendMail } from './mailer';
import {
  notifyContribution,
  notifyContributorThanks,
  notifySupportMessage,
  type ContributorInfo,
  type OwnerInfo,
} from './notifications';
import { projectUrl } from './tenants';

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

/** Datos de la aportación y su proyecto para el correo de agradecimiento (null si no dejó email). */
export async function getContributorForThanks(
  admin: SupabaseClient,
  contributionId: string,
  siteOrigin: string
): Promise<ContributorInfo | null> {
  const { data } = await admin
    .from('contributions')
    .select(
      'contributor_name, contributor_email, amount, level_name, project_config(project_name, currency, slug, tenants(number))'
    )
    .eq('id', contributionId)
    .maybeSingle();
  const row = data as {
    contributor_name: string;
    contributor_email: string | null;
    amount: number;
    level_name: string | null;
    project_config: {
      project_name: string;
      currency: string | null;
      slug: string;
      tenants: { number: number } | null;
    } | null;
  } | null;
  const project = row?.project_config;
  if (!row?.contributor_email || !project?.tenants) return null;
  return {
    email: row.contributor_email,
    contributorName: row.contributor_name,
    amount: Number(row.amount) || 0,
    currency: project.currency ?? 'EUR',
    levelName: row.level_name,
    projectName: project.project_name,
    projectUrl: siteOrigin + projectUrl(project.tenants.number, project.slug),
  };
}

/** Agradecimiento a quien aportó al confirmar el pago. No lanza; false si no hay SMTP o email. */
export function notifyContributorThanksAsync(
  admin: SupabaseClient,
  siteOrigin: string,
  contributionId: string
): Promise<boolean> {
  if (!isMailConfigured()) return Promise.resolve(false);
  return notifyContributorThanks(contributionId, {
    send: sendMail,
    getContributor: (id) => getContributorForThanks(admin, id, siteOrigin),
  });
}
