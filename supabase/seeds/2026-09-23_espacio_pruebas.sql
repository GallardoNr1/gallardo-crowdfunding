-- Espacio de pruebas: una cuenta confirmada, su espacio y tres proyectos variados para probar la web.
--
--   Cuenta:   pruebas@gallardcode.com
--   Clave:    pruebas-2026          (cámbiala desde /cuenta/contrasena si quieres)
--   Espacio:  "Familia Pruebas"     (el número de 6 dígitos lo asigna next_tenant_number())
--
-- Proyectos:
--   1. tablet-lucia        objetivo 180 €, activo, público, tema tecnología, 1 aportación confirmada + 1 pendiente
--   2. viaje-fin-de-curso  por tiempo (cierra en 30 días), activo, PRIVADO (no listado), base 50 € de los abuelos
--   3. lego-castillo       objetivo 90 €, completado, público, tema fantasía, 2 aportaciones confirmadas
--
-- Requiere la migración 20260923100000_tenants.sql. Idempotente: no duplica el usuario (por email)
-- ni los proyectos (por slug dentro del espacio). Se ejecuta tal cual en el SQL Editor.

do $$
declare
  v_email    text := 'pruebas@gallardcode.com';
  v_user     uuid;
  v_tenant   uuid;
  v_project  uuid;
  v_level    uuid;
begin
  -- ── Usuario confirmado (email + contraseña) ────────────────────────────────
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    v_user := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
      v_email, crypt('pruebas-2026', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"space_name":"Familia Pruebas"}'::jsonb, now(), now(),
      '', '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_user,
      jsonb_build_object('sub', v_user::text, 'email', v_email, 'email_verified', true),
      'email', v_user::text, now(), now(), now()
    );
  end if;

  -- ── Espacio (normalmente lo crea el trigger al insertar el usuario) ───────
  select id into v_tenant from public.tenants where owner_user_id = v_user;
  if v_tenant is null then
    insert into public.tenants (number, name, owner_user_id)
    values (public.next_tenant_number(), 'Familia Pruebas', v_user)
    returning id into v_tenant;
  end if;

  -- ── 1. Tablet para Lucía (objetivo, público, activo) ──────────────────────
  if not exists (select 1 from public.project_config where tenant_id = v_tenant and slug = 'tablet-lucia') then
    insert into public.project_config (
      tenant_id, visibility, project_name, slug, project_description, project_status,
      campaign_mode, target_amount, current_amount, base_amount, base_label, allow_custom_amount, min_custom_amount,
      currency, project_image_url, start_date, end_date, redirect_url, bizum_phone, bizum_concept, emoji_options, page_content
    ) values (
      v_tenant, 'public', 'Tablet para Lucía', 'tablet-lucia',
      'Lucía empieza el instituto y necesita una tablet para las clases. Entre todos podemos regalársela.',
      'active', 'target', 180, 0, 0, null, false, 5,
      'EUR', null, current_date, null, '/', '600000000', 'Tablet Lucía',
      '[{"value":"📚","label":"Compañero de clase"},{"value":"💛","label":"Familia"},{"value":"🎈","label":"Amigo"}]'::jsonb,
      jsonb_build_object(
        'pageTitle', '📱 Una tablet para Lucía',
        'pageSubtitle', 'Para que empiece el instituto con buen pie',
        'productUrl', 'https://www.example.com/tablet',
        'mainMessage', jsonb_build_object(
          'message', E'¡Hola a todos!\n\nLucía empieza el instituto en septiembre y en clase van a usar tablet. Nos gustaría regalársela entre toda la familia.\n\nCualquier aportación suma. ¡Gracias!',
          'signature', 'Con cariño', 'familyName', 'Los Pruebas', 'date', 'Septiembre 2026'
        ),
        'progressTitle', '🎯 Progreso', 'contributorsTitle', '✨ Contribuidores', 'photoSectionTitle', '📸 Fotos',
        'cta', jsonb_build_object('icon', '📱', 'title', '¿Nos ayudas?', 'text', 'Elige un nivel y aporta por Bizum.', 'stats', '[]'::jsonb),
        'bizum_phone', '600000000', 'bizum_concept', 'Tablet Lucía', 'theme', 'tecnologia'
      )
    ) returning id into v_project;

    insert into public.contribution_levels (project_id, name, amount, emoji, description, color, rewards, is_active, sort_order)
    values
      (v_project, 'Funda',    10, '🧥', 'Para que no se le rompa el primer día.', '#3b82f6', '[]'::jsonb, true, 1),
      (v_project, 'Lápiz',    25, '✏️', 'Para tomar apuntes como una pro.',       '#8b5cf6', '[]'::jsonb, true, 2),
      (v_project, 'Pantalla', 50, '🖥️', 'La parte que más importa.',              '#10b981', '[]'::jsonb, true, 3);

    select id into v_level from public.contribution_levels where project_id = v_project and name = 'Lápiz';
    insert into public.contributions (project_id, contributor_name, contributor_email, contributor_emoji, amount, level_id, level_name, message, payment_method, payment_status, is_anonymous, is_test)
    values
      (v_project, 'Tía Carmen', 'carmen@example.com', '💛', 25, v_level, 'Lápiz', '¡Que lo disfrutes, Lucía!', 'bizum', 'completed', false, false),
      (v_project, 'Primo Dani', 'dani@example.com',   '🎈', 10, (select id from public.contribution_levels where project_id = v_project and name = 'Funda'), 'Funda', null, 'bizum', 'pending', false, false);

    insert into public.support_messages (project_id, author_name, author_emoji, message, is_from_contributor, is_approved)
    values
      (v_project, 'Tía Carmen', '💛', '¡Mucha suerte en el instituto!', true, true),
      (v_project, 'Vecina Rosa', '🌷', 'Qué mayor está ya…', false, false);
  end if;

  -- ── 2. Viaje de fin de curso (por tiempo, PRIVADO, activo) ───────────────
  if not exists (select 1 from public.project_config where tenant_id = v_tenant and slug = 'viaje-fin-de-curso') then
    insert into public.project_config (
      tenant_id, visibility, project_name, slug, project_description, project_status,
      campaign_mode, target_amount, current_amount, base_amount, base_label, allow_custom_amount, min_custom_amount,
      currency, project_image_url, start_date, end_date, redirect_url, bizum_phone, bizum_concept, emoji_options, page_content
    ) values (
      v_tenant, 'private', 'Viaje de fin de curso de Marcos', 'viaje-fin-de-curso',
      'Marcos se va de viaje de fin de curso. Los abuelos ponen 50 € y lo que juntemos hasta la fecha de cierre va para el viaje.',
      'active', 'open', 0, 0, 50, 'Los abuelos', true, 5,
      'EUR', null, current_date, current_date + 30, '/', '600000000', 'Viaje Marcos',
      '[{"value":"✈️","label":"Viajero"},{"value":"💛","label":"Familia"}]'::jsonb,
      jsonb_build_object(
        'pageTitle', '✈️ El viaje de Marcos',
        'pageSubtitle', 'Recaudamos hasta el cierre: cada euro es un recuerdo más',
        'productUrl', '',
        'mainMessage', jsonb_build_object(
          'message', E'Marcos se va de viaje de fin de curso y queremos que no le falte de nada.\n\nLos abuelos ponen los primeros 50 €. ¡Gracias por sumar!',
          'signature', 'La familia', 'familyName', 'Los Pruebas', 'date', 'Septiembre 2026'
        ),
        'progressTitle', '✈️ Lo que llevamos', 'contributorsTitle', '✨ La tripulación', 'photoSectionTitle', '📸 Fotos',
        'cta', jsonb_build_object('icon', '✈️', 'title', '¿Te apuntas?', 'text', 'Elige un nivel o pon la cantidad que quieras.', 'stats', '[]'::jsonb),
        'bizum_phone', '600000000', 'bizum_concept', 'Viaje Marcos', 'theme', 'viaje'
      )
    ) returning id into v_project;

    insert into public.contribution_levels (project_id, name, amount, emoji, description, color, rewards, is_active, sort_order)
    values
      (v_project, 'Bocadillo', 5,  '🥪', 'Para el autobús.',            '#f59e0b', '[]'::jsonb, true, 1),
      (v_project, 'Entrada',   15, '🎟️', 'Un museo o un parque.',       '#0ea5e9', '[]'::jsonb, true, 2),
      (v_project, 'Noche',     30, '🏨', 'Una noche de hotel.',          '#ef4444', '[]'::jsonb, true, 3);
  end if;

  -- ── 3. Castillo de LEGO (objetivo, público, completado) ───────────────────
  if not exists (select 1 from public.project_config where tenant_id = v_tenant and slug = 'lego-castillo') then
    insert into public.project_config (
      tenant_id, visibility, project_name, slug, project_description, project_status,
      campaign_mode, target_amount, current_amount, base_amount, base_label, allow_custom_amount, min_custom_amount,
      currency, project_image_url, start_date, end_date, redirect_url, bizum_phone, bizum_concept, emoji_options, page_content
    ) values (
      v_tenant, 'public', 'Castillo de LEGO para Pablo', 'lego-castillo',
      'El castillo medieval que Pablo llevaba meses pidiendo. ¡Conseguido entre todos!',
      'completed', 'target', 90, 0, 0, null, false, 5,
      'EUR', null, current_date - 40, current_date - 10, '/', '600000000', 'Castillo Pablo',
      '[{"value":"🏰","label":"Caballero"},{"value":"🐉","label":"Dragón"}]'::jsonb,
      jsonb_build_object(
        'pageTitle', '🏰 El castillo de Pablo',
        'pageSubtitle', '¡Objetivo conseguido!',
        'productUrl', 'https://www.example.com/castillo',
        'mainMessage', jsonb_build_object(
          'message', 'Gracias a todos: el castillo ya está montado en el salón.',
          'signature', 'La familia', 'familyName', 'Los Pruebas', 'date', 'Agosto 2026'
        ),
        'progressTitle', '🎯 Progreso', 'contributorsTitle', '⚔️ Los caballeros', 'photoSectionTitle', '📸 Fotos',
        'cta', jsonb_build_object('icon', '🏰', 'title', 'Gracias', 'text', 'Campaña terminada.', 'stats', '[]'::jsonb),
        'bizum_phone', '600000000', 'bizum_concept', 'Castillo Pablo', 'theme', 'fantasia'
      )
    ) returning id into v_project;

    insert into public.contribution_levels (project_id, name, amount, emoji, description, color, rewards, is_active, sort_order)
    values
      (v_project, 'Escudero',  15, '🛡️', 'Una torre.',   '#6366f1', '[]'::jsonb, true, 1),
      (v_project, 'Caballero', 30, '⚔️', 'La muralla.',  '#8b5cf6', '[]'::jsonb, true, 2),
      (v_project, 'Rey',       45, '👑', 'El castillo.', '#f59e0b', '[]'::jsonb, true, 3);

    -- Dos aportaciones confirmadas: el trigger recalcula current_amount (= 90, objetivo cumplido).
    insert into public.contributions (project_id, contributor_name, contributor_email, contributor_emoji, amount, level_id, level_name, message, payment_method, payment_status, is_anonymous, is_test)
    values
      (v_project, 'Abuela Pepa', 'pepa@example.com', '🏰', 45, (select id from public.contribution_levels where project_id = v_project and name = 'Rey'),       'Rey',       'Para mi caballero.', 'bizum', 'completed', false, false),
      (v_project, 'Tío Luis',    'luis@example.com', '🐉', 45, (select id from public.contribution_levels where project_id = v_project and name = 'Rey'),       'Rey',       null,                 'cash',  'completed', false, false);
  end if;
end $$;
