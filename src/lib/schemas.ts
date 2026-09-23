import { z } from 'zod';
import { DEFAULT_THEME_ID, THEME_IDS } from './themes';

// Esquemas de los límites de la aplicación (cuerpos HTTP y formularios del backoffice).
// Fuera de aquí el código trabaja con los tipos inferidos: "parse, don't validate".

export const PaymentMethod = z.enum(['cash', 'bizum', 'bank_transfer']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const ProjectStatus = z.enum([
  'active',
  'paused',
  'completed',
  'cancelled',
]);
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
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
    ? null
    : v;

/** Alta de contribución desde el modal público. El importe NO viene del cliente: lo fija el nivel. */
export const ContributionInput = z
  .strictObject({
    projectId: z.uuid(),
    /** Nivel elegido. Alternativa: customAmount (campañas con cantidad libre). */
    levelId: z.uuid().optional(),
    customAmount: z.number().positive().max(100000).optional(),
    contributorName: z.string().trim().min(2).max(80),
    contributorEmail: z.email().trim().toLowerCase(),
    contributorEmoji: z.string().trim().min(1).max(8),
    message: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(150).optional()
    ),
    paymentMethod: PaymentMethod,
    isAnonymous: z.boolean().default(false),
  })
  .refine(
    (d) => (d.levelId ? 1 : 0) + (d.customAmount !== undefined ? 1 : 0) === 1,
    {
      message: 'Indica un nivel o una cantidad, pero no ambos',
      path: ['levelId'],
    }
  );
export type ContributionInput = z.infer<typeof ContributionInput>;

/** Mensaje de apoyo desde el formulario público. */
export const SupportMessageInput = z.strictObject({
  projectId: z.uuid(),
  message: z.string().trim().min(1).max(200),
  authorName: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(50).optional()
  ),
  authorEmail: z.preprocess(
    emptyToUndefined,
    z.email().trim().toLowerCase().optional()
  ),
});
export type SupportMessageInput = z.infer<typeof SupportMessageInput>;

const optionalText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max).nullable().default(null)
  );
const optionalDate = () =>
  z.preprocess(emptyToNull, z.iso.date().nullable().default(null));

/** Formulario de proyecto del backoffice (new/edit). Las claves coinciden con los `name` de los inputs. */
export const CampaignMode = z.enum(['target', 'open']);
export type CampaignMode = z.infer<typeof CampaignMode>;

const checkbox = z.preprocess(
  (v) => v === 'on' || v === 'true' || v === true,
  z.boolean()
);

export const ProjectVisibility = z.enum(['public', 'private']);
export type ProjectVisibility = z.infer<typeof ProjectVisibility>;

export const ProjectFormInput = z
  .object({
    project_name: z.string().trim().min(1).max(120),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .transform((s) => s.replace(/\s+/g, '-'))
      .pipe(
        z
          .string()
          .min(1)
          .max(80)
          .regex(/^[a-z0-9-]+$/)
      ),
    project_status: ProjectStatus,
    project_description: optionalText(2000),
    /** Obligatorio (> 0) en modo target; en modo open puede quedar en 0. */
    target_amount: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(0).default(0)
    ),
    campaign_mode: z.preprocess(
      emptyToUndefined,
      CampaignMode.default('target')
    ),
    base_amount: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(0).default(0)
    ),
    base_label: optionalText(60),
    allow_custom_amount: checkbox,
    min_custom_amount: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(1).default(5)
    ),
    currency: z.preprocess(
      emptyToUndefined,
      z.string().trim().min(1).max(5).default('EUR')
    ),
    project_image_url: z.preprocess(
      emptyToNull,
      z.url().nullable().default(null)
    ),
    start_date: optionalDate(),
    end_date: optionalDate(),
    redirect_url: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(500).default('/')
    ),
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
    theme: z.preprocess(
      emptyToUndefined,
      z.enum(THEME_IDS).default(DEFAULT_THEME_ID)
    ),
    /** Público: aparece en la portada; privado: solo con el enlace. */
    visibility: z.preprocess(
      emptyToUndefined,
      ProjectVisibility.default('private')
    ),
  })
  .superRefine((d, ctx) => {
    if (d.campaign_mode === 'target' && d.target_amount <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['target_amount'],
        message: 'El objetivo debe ser mayor que 0 en una campaña con objetivo',
      });
    }
    if (d.campaign_mode === 'open' && !d.end_date) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_date'],
        message: 'Una campaña por tiempo necesita fecha de cierre',
      });
    }
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

// ── Cuenta (login, registro, recuperación, contraseña) ─────────────────────

const Email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Escribe un email válido'));
const Password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña es demasiado larga');

export const LoginInput = z.object({
  email: Email,
  password: z.string().min(1, 'Escribe la contraseña'),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const RegisterInput = z.object({
  space_name: z.string().trim().min(1, 'Ponle nombre a tu espacio').max(80),
  email: Email,
  password: Password,
  accept_privacy: z.preprocess(
    (v) => v === 'on' || v === 'true' || v === true,
    z.literal(true, 'Tienes que aceptar el aviso de privacidad')
  ),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const RecoverInput = z.object({ email: Email });
export type RecoverInput = z.infer<typeof RecoverInput>;

export const PasswordInput = z
  .object({
    password: Password,
    password2: z.string(),
  })
  .superRefine((d, ctx) => {
    if (d.password !== d.password2) {
      ctx.addIssue({
        code: 'custom',
        path: ['password2'],
        message: 'Las contraseñas no coinciden',
      });
    }
  });
export type PasswordInput = z.infer<typeof PasswordInput>;
