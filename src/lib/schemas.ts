import { z } from 'zod';

// Esquemas de los límites de la aplicación (cuerpos HTTP y formularios del backoffice).
// Fuera de aquí el código trabaja con los tipos inferidos: "parse, don't validate".

export const PaymentMethod = z.enum(['cash', 'bizum', 'bank_transfer']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const ProjectStatus = z.enum(['active', 'paused', 'completed', 'cancelled']);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const ContributionStatus = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
]);
export type ContributionStatus = z.infer<typeof ContributionStatus>;

const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;
const emptyToNull = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ? null : v;

/** Alta de contribución desde el modal público. El importe NO viene del cliente: lo fija el nivel. */
export const ContributionInput = z.strictObject({
  projectId: z.uuid(),
  levelId: z.uuid(),
  contributorName: z.string().trim().min(2).max(80),
  contributorEmail: z.email().trim().toLowerCase(),
  contributorEmoji: z.string().trim().min(1).max(8),
  message: z.preprocess(emptyToUndefined, z.string().trim().max(150).optional()),
  paymentMethod: PaymentMethod,
  isAnonymous: z.boolean().default(false),
});
export type ContributionInput = z.infer<typeof ContributionInput>;

/** Mensaje de apoyo desde el formulario público. */
export const SupportMessageInput = z.strictObject({
  projectId: z.uuid(),
  message: z.string().trim().min(1).max(200),
  authorName: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),
  authorEmail: z.preprocess(emptyToUndefined, z.email().trim().toLowerCase().optional()),
});
export type SupportMessageInput = z.infer<typeof SupportMessageInput>;

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().default(null));
const optionalDate = () =>
  z.preprocess(emptyToNull, z.iso.date().nullable().default(null));

/** Formulario de proyecto del backoffice (new/edit). Las claves coinciden con los `name` de los inputs. */
export const ProjectFormInput = z.object({
  project_name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .transform((s) => s.replace(/\s+/g, '-'))
    .pipe(z.string().min(1).max(80).regex(/^[a-z0-9-]+$/)),
  project_status: ProjectStatus,
  project_description: optionalText(2000),
  target_amount: z.coerce.number().positive(),
  currency: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(5).default('EUR')),
  project_image_url: z.preprocess(emptyToNull, z.url().nullable().default(null)),
  start_date: optionalDate(),
  end_date: optionalDate(),
  redirect_url: z.preprocess(emptyToUndefined, z.string().trim().max(500).default('/')),
  bizum_phone: optionalText(30),
  bizum_concept: optionalText(120),
  pageTitle: optionalText(150),
  pageSubtitle: optionalText(200),
  productUrl: optionalText(500),
  mainMessage_message: optionalText(5000),
  mainMessage_signature: optionalText(120),
  mainMessage_familyName: optionalText(120),
  mainMessage_date: optionalText(60),
  progressTitle: optionalText(80),
  contributorsTitle: optionalText(80),
  photoSectionTitle: optionalText(80),
  cta_icon: optionalText(8),
  cta_title: optionalText(120),
  cta_text: optionalText(1000),
});
export type ProjectFormInput = z.infer<typeof ProjectFormInput>;

/** Convierte los issues de Zod en `{ campo: mensaje }` para respuestas 400 y formularios. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '(root)';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
