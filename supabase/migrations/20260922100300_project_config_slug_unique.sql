-- 20260922100300_project_config_slug_unique
-- Dos proyectos con el mismo slug rompen getProjectBySlug().single() (MEJORAS N-14).
-- La tabla es minúscula, así que no hace falta CONCURRENTLY (que además no puede ir en transacción).
-- Si falla por duplicados: select slug, count(*) from public.project_config group by slug having count(*) > 1;

-- ── up ──────────────────────────────────────────────────────────────────────
create unique index if not exists project_config_slug_key on public.project_config (slug);

-- ── down ────────────────────────────────────────────────────────────────────
-- drop index if exists public.project_config_slug_key;
