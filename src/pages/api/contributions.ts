export const prerender = false;

import type { APIRoute } from 'astro';
import { clientIp, json, readJson } from '@/lib/api';
import { createPendingContribution } from '@/lib/contributions-server';
import { createRateLimiter } from '@/lib/rate-limit';
import { ContributionInput, fieldErrors } from '@/lib/schemas';
import { createAdminClient } from '@/lib/supabase-server';

// 10 altas por IP cada 10 minutos: una reunión familiar detrás del mismo router cabe de sobra.
const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const limit = limiter.hit(`contributions:${clientIp(request, clientAddress)}`);
  if (!limit.ok) {
    return json(
      { error: 'Demasiadas peticiones. Inténtalo dentro de unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  const parsed = ContributionInput.safeParse(await readJson(request));
  if (!parsed.success) {
    return json({ error: 'Datos no válidos.', fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  const result = await createPendingContribution(createAdminClient(), parsed.data);
  if (!result.ok) return json({ error: result.error }, { status: result.status });

  return json(result.contribution, { status: 201 });
};

export const ALL: APIRoute = () =>
  json({ error: 'Método no permitido.' }, { status: 405, headers: { Allow: 'POST' } });
