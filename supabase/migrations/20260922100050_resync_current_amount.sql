-- 20260922100050_resync_current_amount
-- DML separado del DDL: alinea current_amount con la suma real de contribuciones completadas.
-- Antes de ejecutarlo, revisa las diferencias:
--
--   select p.id, p.project_name, p.current_amount,
--          coalesce((select sum(c.amount) from public.contributions c
--                     where c.project_id = p.id and c.payment_status = 'completed' and c.is_test = false), 0) as calculado
--     from public.project_config p;
--
-- Si algún proyecto tiene un importe "a mano" que no corresponde a contribuciones registradas,
-- crea esas contribuciones (o ajusta) antes de ejecutar esto.

-- ── up ──────────────────────────────────────────────────────────────────────
update public.project_config p
   set current_amount = coalesce((
         select sum(c.amount)
           from public.contributions c
          where c.project_id = p.id
            and c.payment_status = 'completed'
            and c.is_test = false), 0),
       updated_at = now();

-- ── down ────────────────────────────────────────────────────────────────────
-- No reversible: los valores anteriores no se conservan. Exporta project_config antes si hace falta.
