-- 20260922100400_rls_lockdown
-- El navegador (clave anon) solo lee; toda escritura pasa por el servidor con service_role
-- (MEJORAS N-01, N-04, N-06). service_role salta RLS, así que el backoffice y /api/* no se ven afectados.
-- Aplicar DESPUÉS de desplegar el código que usa los endpoints /api/contributions y /api/support-messages.

-- ── up ──────────────────────────────────────────────────────────────────────

alter table public.project_config        enable row level security;
alter table public.contribution_levels   enable row level security;
alter table public.family_members        enable row level security;
alter table public.payment_instructions  enable row level security;
alter table public.contributions         enable row level security;
alter table public.support_messages      enable row level security;

-- Sin escrituras desde los roles públicos.
revoke insert, update, delete on public.project_config       from anon, authenticated;
revoke insert, update, delete on public.contribution_levels  from anon, authenticated;
revoke insert, update, delete on public.family_members       from anon, authenticated;
revoke insert, update, delete on public.payment_instructions from anon, authenticated;
revoke insert, update, delete on public.contributions        from anon, authenticated;
revoke insert, update, delete on public.support_messages     from anon, authenticated;

-- Lectura pública de lo que la web muestra.
drop policy if exists "public read project_config" on public.project_config;
create policy "public read project_config" on public.project_config
  for select to anon, authenticated using (project_status <> 'cancelled');

drop policy if exists "public read contribution_levels" on public.contribution_levels;
create policy "public read contribution_levels" on public.contribution_levels
  for select to anon, authenticated using (is_active);

drop policy if exists "public read family_members" on public.family_members;
create policy "public read family_members" on public.family_members
  for select to anon, authenticated using (is_active);

drop policy if exists "public read payment_instructions" on public.payment_instructions;
create policy "public read payment_instructions" on public.payment_instructions
  for select to anon, authenticated using (true);

drop policy if exists "public read approved support_messages" on public.support_messages;
create policy "public read approved support_messages" on public.support_messages
  for select to anon, authenticated using (is_approved);

-- contributions: solo filas completadas y no de prueba, y NUNCA la columna del email.
-- (Los privilegios por columna hacen que `select *` falle para anon; la vista public_contributions
--  debe seleccionar columnas concretas — revisar si se creó con security_invoker.)
revoke select on public.contributions from anon, authenticated;
grant  select (id, project_id, contributor_name, contributor_emoji, amount, level_id, level_name,
               message, payment_status, is_anonymous, is_test, created_at)
       on public.contributions to anon, authenticated;

drop policy if exists "public read completed contributions" on public.contributions;
create policy "public read completed contributions" on public.contributions
  for select to anon, authenticated using (payment_status = 'completed' and is_test = false);

grant select on public.public_contributions to anon, authenticated;

-- ── down ────────────────────────────────────────────────────────────────────
-- drop policy if exists "public read completed contributions" on public.contributions;
-- drop policy if exists "public read approved support_messages" on public.support_messages;
-- drop policy if exists "public read payment_instructions" on public.payment_instructions;
-- drop policy if exists "public read family_members" on public.family_members;
-- drop policy if exists "public read contribution_levels" on public.contribution_levels;
-- drop policy if exists "public read project_config" on public.project_config;
-- grant select on public.contributions to anon, authenticated;
-- grant insert, update, delete on public.contributions, public.support_messages, public.project_config to anon, authenticated;
-- alter table public.project_config disable row level security; (y el resto de tablas)
