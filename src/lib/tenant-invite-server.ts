// Superadmin: crear un espacio para otra persona sin que se registre. Solo servidor (service role).
//   mode 'email'    → Supabase envía el email de invitación (plantilla "Invite user" → /auth/confirm?type=invite)
//   mode 'password' → cuenta confirmada con una contraseña temporal que se muestra una sola vez
// En ambos casos el trigger de auth.users crea el espacio con `space_name`.
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';
import { z } from 'zod';

const InviteInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  spaceName: z.string().trim().min(1).max(80),
  mode: z.enum(['email', 'password']),
  redirectTo: z.string(),
});

export type InviteInput = z.input<typeof InviteInputSchema>;

export type InviteResult =
  | { ok: true; mode: 'email'; email: string }
  | { ok: true; mode: 'password'; email: string; tempPassword: string }
  | { ok: false; error: string };

// Sin caracteres ambiguos (0/O, 1/l/I) para poder dictarla o copiarla sin errores.
const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generateTempPassword(length = 14): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

export async function inviteTenantOwner(
  admin: SupabaseClient,
  input: InviteInput,
  {
    generatePassword = generateTempPassword,
  }: { generatePassword?: () => string } = {}
): Promise<InviteResult> {
  const parsed = InviteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Revisa el email y el nombre del espacio.' };
  }
  const { email, spaceName, mode, redirectTo } = parsed.data;

  if (mode === 'email') {
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { space_name: spaceName },
      redirectTo,
    });
    if (error)
      return {
        ok: false,
        error: `No se pudo enviar la invitación: ${error.message}`,
      };
    return { ok: true, mode: 'email', email };
  }

  const tempPassword = generatePassword();
  const { error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { space_name: spaceName },
  });
  if (error)
    return { ok: false, error: `No se pudo crear la cuenta: ${error.message}` };
  return { ok: true, mode: 'password', email, tempPassword };
}
