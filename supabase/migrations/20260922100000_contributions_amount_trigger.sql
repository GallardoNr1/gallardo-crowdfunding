-- 20260922100000_contributions_amount_trigger
-- project_config.current_amount deja de incrementarse desde el navegador (RPC callable por anon,
-- MEJORAS N-01) y pasa a recalcularse en la base de datos a partir de las contribuciones
-- completadas. Idempotente: se puede volver a ejecutar sin efectos secundarios.

-- ── up ──────────────────────────────────────────────────────────────────────

create or replace function public.recalc_project_current_amount(p_project_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
begin
  select coalesce(sum(amount), 0)
    into v_total
    from public.contributions
   where project_id = p_project_id
     and payment_status = 'completed'
     and is_test = false;

  update public.project_config
     set current_amount = v_total,
         updated_at = now()
   where id = p_project_id;

  return v_total;
end;
$$;

create or replace function public.contributions_recalc_amount_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recalc_project_current_amount(new.project_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.project_id is distinct from new.project_id) then
    perform public.recalc_project_current_amount(old.project_id);
  end if;
  return null;
end;
$$;

drop trigger if exists contributions_recalc_amount on public.contributions;
create trigger contributions_recalc_amount
  after insert or update or delete on public.contributions
  for each row execute function public.contributions_recalc_amount_trg();

-- Nadie fuera del servidor puede tocar el importe. La RPC antigua deja de ser invocable
-- por los roles públicos (se mantiene por si algún cliente viejo la llama: fallará con 42501).
revoke execute on function public.increment_project_current_amount(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.recalc_project_current_amount(uuid) from public, anon, authenticated;
grant  execute on function public.recalc_project_current_amount(uuid) to service_role;
revoke execute on function public.contributions_recalc_amount_trg() from public, anon, authenticated;

-- ── down ────────────────────────────────────────────────────────────────────
-- drop trigger if exists contributions_recalc_amount on public.contributions;
-- drop function if exists public.contributions_recalc_amount_trg();
-- drop function if exists public.recalc_project_current_amount(uuid);
-- grant execute on function public.increment_project_current_amount(uuid, numeric) to anon, authenticated;
