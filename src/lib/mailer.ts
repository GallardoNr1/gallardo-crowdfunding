// Envío de emails por SMTP (avisos al organizador). Solo servidor; sin `env.smtp` no hace nada.
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env';

let transporter: Transporter | null = null;

export function isMailConfigured(): boolean {
  return env.smtp !== null;
}

function getTransporter(): Transporter | null {
  if (!env.smtp) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth:
        env.smtp.user && env.smtp.pass
          ? { user: env.smtp.user, pass: env.smtp.pass }
          : undefined,
    });
  }
  return transporter;
}

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Envía un email; lanza si el SMTP falla (quien llama decide si lo ignora). */
export async function sendMail(mail: OutgoingMail): Promise<void> {
  const transport = getTransporter();
  if (!transport || !env.smtp) {
    throw new Error('SMTP no configurado (SMTP_HOST vacío).');
  }
  await transport.sendMail({ from: env.smtp.from, ...mail });
}
