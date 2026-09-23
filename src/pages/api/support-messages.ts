export const prerender = false;

import type { APIRoute } from 'astro';
import { clientIp, json, readJson } from '@/lib/api';
import { createRateLimiter } from '@/lib/rate-limit';
import { SupportMessageInput, fieldErrors } from '@/lib/schemas';
import { createSupportMessage } from '@/lib/support-messages-server';
import { createAdminClient } from '@/lib/supabase-server';
import { notifySupportMessageAsync } from '@/lib/notifications-server';
import { siteOrigin } from '@/lib/tenants';

const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const limit = limiter.hit(`support:${clientIp(request, clientAddress)}`);
  if (!limit.ok) {
    return json(
      { error: 'Demasiadas peticiones. Inténtalo dentro de unos minutos.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      }
    );
  }

  const parsed = SupportMessageInput.safeParse(await readJson(request));
  if (!parsed.success) {
    return json(
      { error: 'Datos no válidos.', fields: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const result = await createSupportMessage(admin, parsed.data);
  if (!result.ok)
    return json({ error: result.error }, { status: result.status });

  // Aviso al organizador sin esperar (el mensaje queda pendiente de moderación).
  void notifySupportMessageAsync(
    admin,
    siteOrigin(request.headers, new URL(request.url).origin),
    parsed.data.projectId,
    {
      author_name: result.message.author_name,
      message: result.message.message,
    }
  );

  return json(result.message, { status: 201 });
};

export const ALL: APIRoute = () =>
  json(
    { error: 'Método no permitido.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
