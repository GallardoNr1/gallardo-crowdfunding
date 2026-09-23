// Avisos por email al organizador de un proyecto (nueva aportación pendiente, mensaje de apoyo
// pendiente). Puro: los textos y la orquestación se prueban con `send` y `getOwnerEmail` inyectados.
import { escapeHtml } from './html';

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

export interface OrganizerMail extends MailContent {
  to: string;
}

const PAYMENT_LABEL: Record<string, string> = {
  bizum: 'Bizum',
  cash: 'Efectivo',
  bank_transfer: 'Transferencia',
};

const money = (amount: number, currency: string) =>
  `${amount.toFixed(2).replace('.', ',')} ${currency === 'EUR' ? '€' : currency}`;

const FOOTER =
  'Gallardo Crowdfunding · este aviso se envía al organizador del proyecto.';

function wrapHtml(
  title: string,
  lines: string[],
  adminUrl: string,
  cta: string
): string {
  // Mismo diseño que las plantillas de Supabase Auth (supabase/email-templates/):
  // tarjeta blanca con cabecera naranja, todo en tablas e inline para los clientes de correo.
  const url = escapeHtml(adminUrl);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f5" style="background:#f4f4f5;padding:32px 12px;font-family:Arial,Helvetica,sans-serif">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb">
<tr><td bgcolor="#ff6b35" style="background:#ff6b35;background-image:linear-gradient(135deg,#ff6b35,#f7931e);border-radius:16px 16px 0 0;padding:22px 32px;color:#ffffff;font-size:20px;font-weight:bold">🎁 Gallardo Crowdfunding</td></tr>
<tr><td style="padding:32px 32px 8px;color:#1f2937;font-size:22px;font-weight:bold;line-height:1.3">${escapeHtml(title)}</td></tr>
<tr><td style="padding:0 32px;color:#374151;font-size:16px;line-height:1.6">
${lines.map((l) => `<p style="margin:0 0 10px">${l}</p>`).join('\n')}
</td></tr>
<tr><td style="padding:20px 32px 28px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#ff6b35" style="background:#ff6b35;border-radius:10px"><a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none">${escapeHtml(cta)}</a></td></tr></table></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px"><tr><td style="padding:18px 8px 0;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center">${escapeHtml(FOOTER)}</td></tr></table>
</td></tr>
</table>`;
}

export function buildContributionEmail(input: {
  projectName: string;
  contributorName: string;
  amount: number;
  currency: string;
  levelName: string;
  paymentMethod: string;
  message?: string | null;
  adminUrl: string;
}): MailContent {
  const amount = money(input.amount, input.currency);
  const method = PAYMENT_LABEL[input.paymentMethod] ?? input.paymentMethod;
  const subject = `💛 Nueva aportación de ${input.contributorName} a "${input.projectName}" (${amount})`;
  const textLines = [
    `${input.contributorName} acaba de registrar una aportación en "${input.projectName}".`,
    `Importe: ${amount} · Nivel: ${input.levelName} · Pago: ${method}`,
    ...(input.message ? [`Mensaje: "${input.message}"`] : []),
    '',
    `Cuando recibas el pago, confírmala aquí: ${input.adminUrl}`,
    '',
    FOOTER,
  ];
  const htmlLines = [
    `<strong>${escapeHtml(input.contributorName)}</strong> acaba de registrar una aportación en "${escapeHtml(input.projectName)}".`,
    `Importe: <strong>${escapeHtml(amount)}</strong> · Nivel: ${escapeHtml(input.levelName)} · Pago: ${escapeHtml(method)}`,
    ...(input.message
      ? [`Mensaje: <em>"${escapeHtml(input.message)}"</em>`]
      : []),
  ];
  return {
    subject,
    text: textLines.join('\n'),
    html: wrapHtml(subject, htmlLines, input.adminUrl, 'Confirmar el pago'),
  };
}

export function buildSupportMessageEmail(input: {
  projectName: string;
  authorName: string;
  message: string;
  adminUrl: string;
}): MailContent {
  const subject = `💬 Mensaje de apoyo pendiente de ${input.authorName} en "${input.projectName}"`;
  const textLines = [
    `${input.authorName} ha dejado un mensaje en "${input.projectName}" que espera tu revisión:`,
    '',
    `"${input.message}"`,
    '',
    `Publícalo o bórralo aquí: ${input.adminUrl}`,
    '',
    FOOTER,
  ];
  const htmlLines = [
    `<strong>${escapeHtml(input.authorName)}</strong> ha dejado un mensaje en "${escapeHtml(input.projectName)}" que espera tu revisión:`,
    `<em>"${escapeHtml(input.message)}"</em>`,
  ];
  return {
    subject,
    text: textLines.join('\n'),
    html: wrapHtml(subject, htmlLines, input.adminUrl, 'Revisar el mensaje'),
  };
}

export interface OwnerInfo {
  email: string;
  projectName: string;
  currency: string;
}

export interface NotifyDeps {
  send: (mail: OrganizerMail) => Promise<void>;
  getOwnerEmail: (projectId: string) => Promise<OwnerInfo | null>;
  siteOrigin: string;
}

async function deliver(
  projectId: string,
  deps: NotifyDeps,
  build: (owner: OwnerInfo) => MailContent
): Promise<boolean> {
  try {
    const owner = await deps.getOwnerEmail(projectId);
    if (!owner?.email) return false;
    await deps.send({ to: owner.email, ...build(owner) });
    return true;
  } catch (err) {
    console.warn('[notificaciones] no se pudo avisar al organizador:', err);
    return false;
  }
}

export function notifyContribution(
  projectId: string,
  contribution: {
    contributor_name: string;
    amount: number;
    level_name: string;
    payment_method: string;
    message?: string | null;
  },
  deps: NotifyDeps
): Promise<boolean> {
  return deliver(projectId, deps, (owner) =>
    buildContributionEmail({
      projectName: owner.projectName,
      contributorName: contribution.contributor_name,
      amount: contribution.amount,
      currency: owner.currency,
      levelName: contribution.level_name,
      paymentMethod: contribution.payment_method,
      message: contribution.message,
      adminUrl: `${deps.siteOrigin}/admin/projects/${projectId}/contributions`,
    })
  );
}

export function notifySupportMessage(
  projectId: string,
  message: { author_name: string; message: string },
  deps: NotifyDeps
): Promise<boolean> {
  return deliver(projectId, deps, (owner) =>
    buildSupportMessageEmail({
      projectName: owner.projectName,
      authorName: message.author_name,
      message: message.message,
      adminUrl: `${deps.siteOrigin}/admin/projects/${projectId}/messages`,
    })
  );
}
