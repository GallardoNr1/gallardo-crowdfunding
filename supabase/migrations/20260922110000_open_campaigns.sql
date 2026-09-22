-- 20260922110000_open_campaigns
-- Campañas "por tiempo": sin objetivo fijo, con aportación base de la familia y cantidad libre.
-- Ver docs/superpowers/specs/2026-09-22-campana-abierta-design.md.

-- ── up ──────────────────────────────────────────────────────────────────────

alter table public.project_config
  add column if not exists campaign_mode       text    not null default 'target',
  add column if not exists base_amount         numeric not null default 0,
  add column if not exists base_label          text,
  add column if not exists allow_custom_amount boolean not null default false,
  add column if not exists min_custom_amount   numeric not null default 5;

alter table public.project_config drop constraint if exists project_config_campaign_mode_check;
alter table public.project_config
  add constraint project_config_campaign_mode_check check (campaign_mode in ('target', 'open'));

alter table public.project_config drop constraint if exists project_config_base_amount_check;
alter table public.project_config
  add constraint project_config_base_amount_check check (base_amount >= 0);

-- La lista pública debe incluir aportaciones libres (sin nivel): LEFT JOIN.
-- Se recrea (no `create or replace`) porque la definición anterior no está versionada.
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
  c.created_at
from public.contributions c
left join public.contribution_levels l on l.id = c.level_id
where c.payment_status = 'completed'
  and c.is_test = false;

grant select on public.public_contributions to anon, authenticated, service_role;

-- ── down ────────────────────────────────────────────────────────────────────
-- (la vista anterior no está versionada: exporta su definición antes de aplicar esto)
-- alter table public.project_config
--   drop column if exists campaign_mode, drop column if exists base_amount, drop column if exists base_label,
--   drop column if exists allow_custom_amount, drop column if exists min_custom_amount;
