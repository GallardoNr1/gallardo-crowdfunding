-- 20260922100100_realtime_broadcast
-- Sustituye la suscripción postgres_changes sobre toda la tabla contributions (fuga entre
-- proyectos, nombres de anónimos y email en el payload — MEJORAS N-04) por eventos Broadcast
-- emitidos desde la base de datos, un topic por proyecto y sin datos personales.
-- Requiere realtime.send (Supabase 2025+). El cliente se suscribe a 'project:<uuid>'.

-- ── up ──────────────────────────────────────────────────────────────────────

create or replace function public.contributions_broadcast_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level record;
  v_became_completed boolean;
begin
  v_became_completed :=
    new.payment_status = 'completed'
    and new.is_test = false
    and (tg_op = 'INSERT' or old.payment_status is distinct from 'completed');

  if v_became_completed then
    select emoji, color into v_level
      from public.contribution_levels
     where id = new.level_id;

    perform realtime.send(
      jsonb_build_object(
        'id', new.id,
        'project_id', new.project_id,
        'contributor_name', case when new.is_anonymous then 'Anónimo' else new.contributor_name end,
        'contributor_emoji', case when new.is_anonymous then '🎁' else new.contributor_emoji end,
        'amount', new.amount,
        'level_name', new.level_name,
        'level_emoji', coalesce(v_level.emoji, '⭐'),
        'level_color', coalesce(v_level.color, '#9e9e9e'),
        'message', new.message,
        'created_at', new.created_at
      ),
      'contribution_completed',
      'project:' || new.project_id::text,
      false
    );
  end if;
  return null;
end;
$$;

drop trigger if exists contributions_broadcast on public.contributions;
create trigger contributions_broadcast
  after insert or update on public.contributions
  for each row execute function public.contributions_broadcast_trg();

create or replace function public.support_messages_broadcast_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_approved and (tg_op = 'INSERT' or old.is_approved is distinct from true) then
    perform realtime.send(
      jsonb_build_object(
        'id', new.id,
        'project_id', new.project_id,
        'author_name', new.author_name,
        'author_emoji', new.author_emoji,
        'message', new.message,
        'is_from_contributor', new.is_from_contributor,
        'created_at', new.created_at
      ),
      'support_message_approved',
      'project:' || new.project_id::text,
      false
    );
  end if;
  return null;
end;
$$;

drop trigger if exists support_messages_broadcast on public.support_messages;
create trigger support_messages_broadcast
  after insert or update on public.support_messages
  for each row execute function public.support_messages_broadcast_trg();

-- La tabla contributions deja de publicarse por postgres_changes (ya nadie la escucha
-- y así ningún cliente puede recibir filas completas con email).
do $$
begin
  alter publication supabase_realtime drop table public.contributions;
exception when others then
  raise notice 'contributions no estaba en supabase_realtime: %', sqlerrm;
end $$;

revoke execute on function public.contributions_broadcast_trg() from public, anon, authenticated;
revoke execute on function public.support_messages_broadcast_trg() from public, anon, authenticated;

-- ── down ────────────────────────────────────────────────────────────────────
-- drop trigger if exists contributions_broadcast on public.contributions;
-- drop trigger if exists support_messages_broadcast on public.support_messages;
-- drop function if exists public.contributions_broadcast_trg();
-- drop function if exists public.support_messages_broadcast_trg();
-- alter publication supabase_realtime add table public.contributions;
