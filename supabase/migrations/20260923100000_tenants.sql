-- 20260923100000_tenants
-- Espacios (tenants): cada usuario tiene uno; los proyectos cuelgan de un espacio y tienen visibilidad.
-- Ver docs/superpowers/specs/2026-09-23-espacios-multiusuario-design.md.
-- Compatible con el código anterior (solo añade tabla y columnas con valores por defecto):
-- se puede aplicar antes de desplegar la fase 1.

-- ── up ──────────────────────────────────────────────────────────────────────

create table if not exists public.tenants (
  id            uuid primary key default gen_random_uuid(),
  number        integer not null unique check (number between 100000 and 999999),
  name          text not null check (char_length(name) between 1 and 80),
  avatar_url    text,
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Número público de 6 dígitos, aleatorio y único (reintenta si choca).
create or replace function public.next_tenant_number() returns integer
language plpgsql as $$
declare n integer;
begin
  loop
    n := 100000 + floor(random() * 900000)::integer;
    exit when not exists (select 1 from public.tenants where number = n);
  end loop;
  return n;
end $$;

-- Todo usuario nuevo recibe su espacio (nombre del registro o parte local del email).
create or replace function public.handle_new_user_tenant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.tenants (number, name, owner_user_id)
  values (
    public.next_tenant_number(),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'space_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Mi espacio'
    ),
    new.id
  )
  on conflict (owner_user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_tenant on auth.users;
create trigger on_auth_user_created_tenant
  after insert on auth.users
  for each row execute function public.handle_new_user_tenant();

-- Backfill: un espacio por usuario ya existente.
insert into public.tenants (number, name, owner_user_id)
select public.next_tenant_number(),
       coalesce(
         nullif(trim(u.raw_user_meta_data->>'space_name'), ''),
         nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
         'Mi espacio'
       ),
       u.id
  from auth.users u
 where not exists (select 1 from public.tenants t where t.owner_user_id = u.id);

alter table public.project_config
  add column if not exists tenant_id  uuid references public.tenants (id) on delete restrict,
  add column if not exists visibility text not null default 'private';

alter table public.project_config drop constraint if exists project_config_visibility_check;
alter table public.project_config
  add constraint project_config_visibility_check check (visibility in ('public', 'private'));

-- Los proyectos existentes pasan al espacio más antiguo (el del administrador) y siguen siendo públicos.
update public.project_config
   set tenant_id = (select id from public.tenants order by created_at limit 1),
       visibility = 'public'
 where tenant_id is null;

alter table public.project_config alter column tenant_id set not null;

create index if not exists project_config_tenant_id_idx on public.project_config (tenant_id);
-- La unicidad del slug pasa a ser por espacio (sustituye al índice global de la migración 5).
drop index if exists public.project_config_slug_key;
create unique index if not exists project_config_tenant_slug_key on public.project_config (tenant_id, slug);

-- Lectura pública del espacio (sin el dueño); sin escrituras desde el navegador.
alter table public.tenants enable row level security;
revoke all on public.tenants from anon, authenticated;
grant select (id, number, name, avatar_url, created_at) on public.tenants to anon, authenticated;
drop policy if exists "public read tenants" on public.tenants;
create policy "public read tenants" on public.tenants for select to anon, authenticated using (true);

-- ── down ────────────────────────────────────────────────────────────────────
-- drop policy if exists "public read tenants" on public.tenants;
-- drop index if exists public.project_config_tenant_slug_key;
-- create unique index if not exists project_config_slug_key on public.project_config (slug);
-- drop index if exists public.project_config_tenant_id_idx;
-- alter table public.project_config drop constraint if exists project_config_visibility_check;
-- alter table public.project_config drop column if exists visibility, drop column if exists tenant_id;
-- drop trigger if exists on_auth_user_created_tenant on auth.users;
-- drop function if exists public.handle_new_user_tenant();
-- drop function if exists public.next_tenant_number();
-- drop table if exists public.tenants;
