-- Proyecto "Bici para Máximo" — campaña por tiempo (cierra el 29/10/2026, una semana antes de su cumpleaños).
-- Requiere la migración 20260922110000_open_campaigns.sql.
--
-- ANTES DE EJECUTAR, sustituye los tres marcadores:
--   {{URL_BICI}}     enlace a la bici elegida (tienda)
--   {{IMAGEN_BICI}}  URL de la imagen del producto
--   {{BIZUM}}        número de Bizum (9 dígitos)
-- El concepto de Bizum propuesto es "Bici Máximo"; cámbialo si quieres.
-- Idempotente: si ya existe un proyecto con slug 'bici-maximo' no hace nada.

with nuevo as (
  insert into public.project_config (
    project_name, slug, project_description, project_status,
    campaign_mode, target_amount, current_amount, base_amount, base_label,
    allow_custom_amount, min_custom_amount,
    currency, project_image_url, start_date, end_date, redirect_url,
    bizum_phone, bizum_concept, emoji_options, page_content
  )
  select
    'Bici para Máximo',
    'bici-maximo',
    'El 5 de noviembre Máximo cumple años y sueña con su primera bici de verdad. Papá y mamá ponen los primeros 150 €; todo lo que consigamos entre familia y amigos hasta el 29 de octubre irá íntegro a la bici.',
    'active',
    'open', 0, 0, 150, 'Papá y mamá',
    true, 5,
    'EUR', '{{IMAGEN_BICI}}', current_date, date '2026-10-29', '/',
    '{{BIZUM}}', 'Bici Máximo',
    '[
      {"value": "🚴", "label": "Compañero de ruta"},
      {"value": "💛", "label": "Familia"},
      {"value": "🎈", "label": "Amigo de la familia"},
      {"value": "🏆", "label": "Fan de Máximo"}
    ]'::jsonb,
    jsonb_build_object(
      'pageTitle', '🚴 Una bici para Máximo',
      'pageSubtitle', 'Su cumpleaños es el 5 de noviembre: ¡ayúdanos a que llegue pedaleando!',
      'productUrl', '{{URL_BICI}}',
      'mainMessage', jsonb_build_object(
        'message', E'¡Hola familia y amigos! 🚴\n\nEl 5 de noviembre Máximo cumple años y este año tiene un sueño de dos ruedas: su primera bici de verdad.\n\nNosotros ponemos los primeros 150 €. Con lo que aportéis entre todos hasta el 29 de octubre elegiremos la mejor bici que podamos: no hay objetivo, cada euro la hace un poco mejor.\n\nMás que el dinero, queremos que Máximo sepa cuánta gente le quiere y le empuja. Cada aportación, grande o pequeña, es un empujoncito en su primera ruta.\n\n¡Gracias por pedalear con nosotros! 💛',
        'signature', 'Con todo nuestro cariño',
        'familyName', 'Papá y mamá',
        'date', 'Septiembre 2026'
      ),
      'progressTitle', '🚴 Lo que llevamos',
      'contributorsTitle', '✨ La cuadrilla que empuja',
      'photoSectionTitle', '📸 Máximo en acción',
      'cta', jsonb_build_object(
        'icon', '🚴',
        'title', '¿Le das un empujón?',
        'text', 'Elige un nivel o pon la cantidad que quieras. Todo suma a la bici de Máximo hasta el 29 de octubre.',
        'stats', jsonb_build_array(
          jsonb_build_object('number', '150 €', 'label', 'los ponen papá y mamá'),
          jsonb_build_object('number', '29/10', 'label', 'cierre de la campaña'),
          jsonb_build_object('number', '5/11', 'label', 'cumpleaños de Máximo')
        )
      ),
      'bizum_phone', '{{BIZUM}}',
      'bizum_concept', 'Bici Máximo'
    )
  where not exists (select 1 from public.project_config where slug = 'bici-maximo')
  returning id
)
insert into public.contribution_levels
  (project_id, name, amount, emoji, description, color, rewards, is_active, sort_order)
select nuevo.id, v.name, v.amount, v.emoji, v.description, v.color, '[]'::jsonb, true, v.sort_order
from nuevo
cross join (values
  ('Timbre',           5,  '🔔', 'Un ¡ring ring! de ánimo para la ruta.',              '#f59e0b', 1),
  ('Casco',            10, '🪖', 'Seguridad ante todo: su casco lleva tu nombre.',      '#3b82f6', 2),
  ('Rueda',            20, '🛞', 'Sin ruedas no hay bici. Tú pones una.',               '#10b981', 3),
  ('Cambio de marchas', 30, '⚙️', 'Para las cuestas que vengan.',                       '#8b5cf6', 4),
  ('Sillín de capitán', 50, '🏆', 'La aportación de los que quieren verle volar.',      '#ef4444', 5)
) as v(name, amount, emoji, description, color, sort_order);
