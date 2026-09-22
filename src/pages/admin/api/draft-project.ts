export const prerender = false;

import type { APIRoute } from 'astro';
import { json } from '@/lib/api';
import { handleDraftRequest } from '@/lib/project-draft-route';
import {
  generateProjectDraft,
  isDraftConfigured,
} from '@/lib/project-draft-server';
import { createRateLimiter } from '@/lib/rate-limit';

// Vive bajo /admin/ para que el middleware exija sesión de administrador (locals.user).
// 20 borradores por usuario cada 10 minutos: cada llamada a la IA cuesta dinero.
const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user
    ? { id: locals.user.id, email: locals.user.email }
    : null;

  if (user) {
    const limit = limiter.hit(`draft-project:${user.id}`);
    if (!limit.ok) {
      return json(
        {
          error:
            'Demasiados borradores seguidos. Inténtalo dentro de unos minutos.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)),
          },
        }
      );
    }
  }

  return handleDraftRequest(request, {
    user,
    configured: isDraftConfigured(),
    generate: (brief) => generateProjectDraft(brief),
  });
};

export const ALL: APIRoute = () =>
  json(
    { error: 'Método no permitido.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
