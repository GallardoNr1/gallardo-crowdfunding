// Handlers de las páginas de cuenta (login, registro, recuperación, confirmación, contraseña).
// Puros e inyectables (patrón de project-draft-route.ts): la página Astro construye `AuthApi`
// con Supabase y aplica el resultado (cookies, redirecciones, mensajes).
import type { AuthUser } from './session-server';
import {
  LoginInput,
  EmailChangeInput,
  PasswordInput,
  RecoverInput,
  RegisterInput,
  fieldErrors,
} from './schemas';

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export const OTP_TYPES = [
  'signup',
  'invite',
  'recovery',
  'email',
  'email_change',
  'magiclink',
] as const;
export type OtpType = (typeof OTP_TYPES)[number];

/** Lo que las páginas necesitan de Supabase Auth, ya sin tipos del SDK. */
export interface AuthApi {
  signInWithPassword(
    email: string,
    password: string
  ): Promise<{ session: AuthSession | null; error: string | null }>;
  signUp(input: {
    email: string;
    password: string;
    spaceName: string;
    emailRedirectTo: string;
  }): Promise<{ session: AuthSession | null; error: string | null }>;
  resetPasswordForEmail(
    email: string,
    redirectTo: string
  ): Promise<{ error: string | null }>;
  verifyOtp(
    tokenHash: string,
    type: OtpType
  ): Promise<{ session: AuthSession | null; error: string | null }>;
  updatePassword(
    userId: string,
    password: string
  ): Promise<{ error: string | null }>;
  updateEmail(userId: string, email: string): Promise<{ error: string | null }>;
}

export interface RateLimiterLike {
  hit(key: string): { ok: boolean; retryAfterMs: number };
}

export interface AuthDeps {
  auth: AuthApi;
  limiter: RateLimiterLike;
}

export type AuthFailure = {
  ok: false;
  status: number;
  error: string;
  fields?: Record<string, string>;
};

const TOO_MANY: AuthFailure = {
  ok: false,
  status: 429,
  error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
};

const CONFIRM_PATH = '/auth/confirm';

const formObject = (form: FormData) => Object.fromEntries(form.entries());

function invalid(error: unknown, message: string): AuthFailure {
  return {
    ok: false,
    status: 400,
    error: message,
    fields: fieldErrors(error as Parameters<typeof fieldErrors>[0]),
  };
}

export async function handleLogin(
  form: FormData,
  ip: string,
  { auth, limiter }: AuthDeps
): Promise<{ ok: true; session: AuthSession } | AuthFailure> {
  if (!limiter.hit(`login:${ip}`).ok) return TOO_MANY;

  const parsed = LoginInput.safeParse(formObject(form));
  if (!parsed.success)
    return invalid(parsed.error, 'Revisa el email y la contraseña.');

  const { session, error } = await auth.signInWithPassword(
    parsed.data.email,
    parsed.data.password
  );
  if (error || !session) {
    return { ok: false, status: 401, error: 'Email o contraseña incorrectos.' };
  }
  return { ok: true, session };
}

export async function handleRegister(
  form: FormData,
  ip: string,
  siteOrigin: string,
  { auth, limiter }: AuthDeps
): Promise<{ ok: true; session: AuthSession | null } | AuthFailure> {
  if (!limiter.hit(`register:${ip}`).ok) return TOO_MANY;

  const parsed = RegisterInput.safeParse(formObject(form));
  if (!parsed.success)
    return invalid(parsed.error, 'Revisa los campos marcados.');

  const { session, error } = await auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    spaceName: parsed.data.space_name,
    emailRedirectTo: `${siteOrigin}${CONFIRM_PATH}`,
  });
  if (error) {
    console.warn('[auth] registro rechazado:', error);
    return {
      ok: false,
      status: 400,
      error:
        'No se pudo crear la cuenta. Si ya tienes una con ese email, entra o recupera la contraseña.',
    };
  }
  return { ok: true, session };
}

export async function handleRecover(
  form: FormData,
  ip: string,
  siteOrigin: string,
  { auth, limiter }: AuthDeps
): Promise<{ ok: true } | AuthFailure> {
  if (!limiter.hit(`recover:${ip}`).ok) return TOO_MANY;

  const parsed = RecoverInput.safeParse(formObject(form));
  if (!parsed.success) return invalid(parsed.error, 'Escribe un email válido.');

  // Respuesta neutra pase lo que pase: no revelamos si el email existe.
  const { error } = await auth.resetPasswordForEmail(
    parsed.data.email,
    `${siteOrigin}${CONFIRM_PATH}`
  );
  if (error) console.warn('[auth] recuperación no enviada:', error);
  return { ok: true };
}

export async function handleConfirm(
  params: { token_hash: string | null; type: string | null },
  { auth }: Pick<AuthDeps, 'auth'>
): Promise<{ ok: true; session: AuthSession; type: OtpType } | AuthFailure> {
  const type = OTP_TYPES.find((t) => t === params.type);
  if (!params.token_hash || !type) {
    return { ok: false, status: 400, error: 'El enlace no es válido.' };
  }
  const { session, error } = await auth.verifyOtp(params.token_hash, type);
  if (error || !session) {
    return {
      ok: false,
      status: 400,
      error: 'El enlace no es válido o ha caducado.',
    };
  }
  return { ok: true, session, type };
}

export async function handlePasswordChange(
  form: FormData,
  userId: string,
  { auth }: Pick<AuthDeps, 'auth'>
): Promise<{ ok: true } | AuthFailure> {
  const parsed = PasswordInput.safeParse(formObject(form));
  if (!parsed.success) return invalid(parsed.error, 'Revisa la contraseña.');

  const { error } = await auth.updatePassword(userId, parsed.data.password);
  if (error) {
    return {
      ok: false,
      status: 400,
      error: `No se pudo cambiar la contraseña: ${error}`,
    };
  }
  return { ok: true };
}

/** Cambio de email con la contraseña actual como confirmación (Admin API: sin correo de verificación). */
export async function handleEmailChange(
  form: FormData,
  user: { id: string; email: string | null },
  { auth }: Pick<AuthDeps, 'auth'>
): Promise<{ ok: true; email: string } | AuthFailure> {
  const parsed = EmailChangeInput.safeParse(formObject(form));
  if (!parsed.success)
    return invalid(parsed.error, 'Revisa el email y la contraseña.');
  const newEmail = parsed.data.new_email;

  if (!user.email)
    return { ok: false, status: 400, error: 'Tu cuenta no tiene email.' };
  if (newEmail === user.email.toLowerCase()) {
    return {
      ok: false,
      status: 400,
      error: 'Ese ya es tu email.',
      fields: { new_email: 'Escribe un email distinto al actual' },
    };
  }

  const { session, error } = await auth.signInWithPassword(
    user.email,
    parsed.data.password
  );
  if (error || !session)
    return {
      ok: false,
      status: 401,
      error: 'La contraseña actual no es correcta.',
    };

  const { error: updateError } = await auth.updateEmail(user.id, newEmail);
  if (updateError) {
    return {
      ok: false,
      status: 400,
      error: `No se pudo cambiar el email: ${updateError}`,
    };
  }
  return { ok: true, email: newEmail };
}
