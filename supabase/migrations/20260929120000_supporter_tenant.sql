-- Red de colaboración: quien aporta o escribe un mensaje estando conectado puede mostrar su
-- espacio junto a su nombre. La columna solo se rellena si la persona lo pide (casilla en el
-- formulario); nunca se cruza el email con las cuentas.
--
-- up ─────────────────────────────────────────────────────────────────────────
alter table public.contributions
  add column if not exists supporter_tenant_id uuid references public.tenants(id) on delete set null;
alter table public.support_messages
  add column if not exists supporter_tenant_id uuid references public.tenants(id) on delete set null;

create index if not exists contributions_supporter_tenant_idx
  on public.contributions (supporter_tenant_id) where supporter_tenant_id is not null;
create index if not exists support_messages_supporter_tenant_idx
  on public.support_messages (supporter_tenant_id) where supporter_tenant_id is not null;

-- anon lee la columna nueva (los privilegios de contributions son por columna, migración 6).
grant select (supporter_tenant_id) on public.contributions to anon, authenticated;

-- La vista pública incluye el espacio de quien aporta (nunca en las aportaciones anónimas).
drop view if exists public.public_contributions;
create view public.public_contributions as
select
  c.id,
  c.project_id,
  case when c.is_anonymous then 'Anónimo' else c.contributor_name end as contributor_name,
  case when c.is_anonymous then '🎁' else c.contributor_emoji end   as contributor_emoji,
  c.amount,
  coalesce(c.level_name, l.name)                                      as level_name,
  coalesce(l.color, '#9e9e9e')                                        as level_color,
  coalesce(l.emoji, '💚')                                             as level_emoji,
  c.message,
  c.created_at,
  case when c.is_anonymous then null else c.supporter_tenant_id end   as supporter_tenant_id
from public.contributions c
left join public.contribution_levels l on l.id = c.level_id
where c.payment_status = 'completed'
  and c.is_test = false;

grant select on public.public_contributions to anon, authenticated;

-- down ───────────────────────────────────────────────────────────────────────
-- drop view if exists public.public_contributions;
-- create view public.public_contributions as
-- select c.id, c.project_id,
--   case when c.is_anonymous then 'Anónimo' else c.contributor_name end as contributor_name,
--   case when c.is_anonymous then '🎁' else c.contributor_emoji end   as contributor_emoji,
--   c.amount, coalesce(c.level_name, l.name) as level_name, coalesce(l.color, '#9e9e9e') as level_color,
--   coalesce(l.emoji, '💚') as level_emoji, c.message, c.created_at
-- from public.contributions c left join public.contribution_levels l on l.id = c.level_id
-- where c.payment_status = 'completed' and c.is_test = false;
-- grant select on public.public_contributions to anon, authenticated;
-- drop index if exists public.contributions_supporter_tenant_idx;
-- drop index if exists public.support_messages_supporter_tenant_idx;
-- alter table public.contributions drop column if exists supporter_tenant_id;
-- alter table public.support_messages drop column if exists supporter_tenant_id;
