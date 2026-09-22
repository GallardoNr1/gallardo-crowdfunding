-- 20260922100200_support_messages_moderation
-- Los mensajes de apoyo nacen pendientes de aprobación (MEJORAS N-06). El backoffice los aprueba.
-- Los mensajes ya existentes no cambian.

-- ── up ──────────────────────────────────────────────────────────────────────
alter table public.support_messages
  alter column is_approved set default false;

-- ── down ────────────────────────────────────────────────────────────────────
-- alter table public.support_messages alter column is_approved set default true;
