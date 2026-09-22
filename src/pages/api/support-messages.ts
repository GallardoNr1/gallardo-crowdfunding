export const prerender = false;

import type { APIRoute } from 'astro';
import { clientIp, json, readJson } from '@/lib/api';
import { createRateLimiter } from '@/lib/rate-limit';
import { SupportMessageInput, fieldErrors } from '@/lib/schemas';
import { createSupportMessage } from '@/lib/support-messages-server';
import { createAdminClient } from '@/lib/supabase-server';

const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const limit = limiter.hit(`support:${clientIp(request, clientAddress)}`);
  if (!limit.ok) {
    return json(
      { error: 'Demasiadas peticiones. Inténtalo dentro de unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  const parsed = SupportMessageInput.safeParse(await readJson(request));
  if (!parsed.success) {
    return json({ error: 'Datos no válidos.', fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  const result = await createSupportMessage(createAdminClient(), parsed.data);
  if (!result.ok) return json({ error: result.error }, { status: result.status });

  return json(result.message, { status: 201 });
};

export const ALL: APIRoute = () =>
  json({ error: 'Método no permitido.' }, { status: 405, headers: { Allow: 'POST' } });
