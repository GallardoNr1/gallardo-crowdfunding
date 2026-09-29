-- Seed: datos de prueba de la red de colaboración (2026-09-29).
--
-- Requiere la migración 20260929120000_supporter_tenant.sql y el seed 2026-09-23_espacio_pruebas.sql
-- (crea el espacio "Familia Pruebas", pruebas@gallardcode.com / pruebas-2026, con el proyecto activo
-- y público "tablet-lucia"). Idempotente. Al final, en comentario, cómo borrar estos datos.
--
-- Qué se ve después:
--   · En /328614/projects/bici-maximo: "Prima Lucía" con la etiqueta 🏠 Familia Pruebas (en aportaciones
--     y en mensajes) y el bloque "También están recaudando" con la tablet de Lucía.
--   · En el backoffice de Familia Gallardo: "Devuelve el apoyo · Familia Pruebas".
--   · En la tablet de Lucía y en el backoffice de pruebas, lo mismo al revés (Familia Gallardo).

do $$
declare
  v_pruebas  uuid;
  v_gallardo uuid;
  v_bici     uuid;
  v_tablet   uuid;
begin
  select t.id into v_pruebas
    from public.tenants t join auth.users u on u.id = t.owner_user_id
   where u.email = 'pruebas@gallardcode.com';
  select id into v_gallardo from public.tenants where number = 328614;
  select id into v_bici   from public.project_config where tenant_id = v_gallardo and slug = 'bici-maximo';
  select id into v_tablet from public.project_config where tenant_id = v_pruebas  and slug = 'tablet-lucia';
  if v_pruebas is null or v_gallardo is null or v_bici is null or v_tablet is null then
    raise exception 'Faltan el espacio de pruebas, el de Familia Gallardo o sus proyectos (aplica antes el seed de pruebas)';
  end if;

  -- Familia Pruebas apoya la bici de Máximo: aportación confirmada y mensaje aprobado, con su espacio.
  if not exists (select 1 from public.contributions where project_id = v_bici and contributor_email = 'lucia@example.com') then
    insert into public.contributions (project_id, contributor_name, contributor_email, contributor_emoji, amount, level_id, level_name, message, payment_method, payment_status, is_anonymous, is_test, supporter_tenant_id)
    values (v_bici, 'Prima Lucía', 'lucia@example.com', '🌟', 5, null, 'Aportación libre', '¡A por esa bici, Máximo!', 'bizum', 'completed', false, false, v_pruebas);
  end if;
  if not exists (select 1 from public.support_messages where project_id = v_bici and author_name = 'Prima Lucía') then
    insert into public.support_messages (project_id, author_name, author_emoji, message, is_from_contributor, is_approved, supporter_tenant_id)
    values (v_bici, 'Prima Lucía', '🌟', 'Desde nuestra casa os mandamos ánimos: ¡esa bici cae seguro!', true, true, v_pruebas);
  end if;

  -- Familia Gallardo apoya la tablet de Lucía: la red vista desde el otro lado.
  if not exists (select 1 from public.contributions where project_id = v_tablet and contributor_email = 'moigallardo@hotmail.com') then
    insert into public.contributions (project_id, contributor_name, contributor_email, contributor_emoji, amount, level_id, level_name, message, payment_method, payment_status, is_anonymous, is_test, supporter_tenant_id)
    values (v_tablet, 'Familia Gallardo', 'moigallardo@hotmail.com', '🚴', 10, null, 'Aportación libre', 'De parte de Máximo: ¡gracias por la bici!', 'bizum', 'completed', false, false, v_gallardo);
  end if;
end $$;

-- Borrar los datos de prueba de la red (los proyectos de pruebas se borran desde "Mi cuenta" → borrar cuenta):
-- delete from public.support_messages where author_name = 'Prima Lucía' and message like 'Desde nuestra casa%';
-- delete from public.contributions where contributor_email = 'lucia@example.com'
--   and project_id = (select id from public.project_config where slug = 'bici-maximo');
-- delete from public.contributions where contributor_email = 'moigallardo@hotmail.com'
--   and project_id = (select id from public.project_config where slug = 'tablet-lucia');
