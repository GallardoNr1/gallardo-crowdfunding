# Campañas abiertas (por tiempo) — diseño

**Fecha:** 2026-09-22 · **Estado:** aprobado por el usuario · **Primer caso de uso:** bici de Máximo (cierre 2026-10-29, una semana antes de su cumpleaños el 5/11).

## Problema

Los proyectos actuales tienen un objetivo fijo (`target_amount`): barra de porcentaje, "faltan X €", cierre manual. La bici de Máximo es distinta: se recauda **lo máximo posible hasta una fecha**, los padres ponen **150 € de base** y todo lo recaudado se suma al presupuesto. No hay porcentaje que mostrar ni objetivo que alcanzar.

## Decisiones

| Tema | Decisión |
|------|----------|
| Modelo | Un campo `campaign_mode` (`target` \| `open`) en `project_config`; todo lo demás se reutiliza. |
| Importe | Niveles sugeridos **y** una tarjeta "Otra cantidad" (mínimo configurable, por defecto 5 €). |
| Base de los padres | Campos `base_amount` + `base_label` en el proyecto; no aparecen en la lista de contribuidores. |
| Hitos / tramos | No. Solo recaudado, base, total y cuenta atrás. |
| Cierre | `end_date` pasa a ser vinculante en **todos** los proyectos: pasado ese día (incluido), la campaña está cerrada: la API responde 409, los niveles desaparecen y la página muestra el total final. |
| Lista pública | La vista `public_contributions` se redefine con `LEFT JOIN` a niveles para que las aportaciones libres (sin nivel) aparezcan; los anónimos salen como "Anónimo". |

## Datos

Migración `supabase/migrations/20260922110000_open_campaigns.sql`:

```sql
alter table public.project_config
  add column if not exists campaign_mode        text    not null default 'target',
  add column if not exists base_amount          numeric not null default 0,
  add column if not exists base_label           text,
  add column if not exists allow_custom_amount  boolean not null default false,
  add column if not exists min_custom_amount    numeric not null default 5;
-- check campaign_mode in ('target','open'); vista public_contributions con left join.
```

Contribución libre: `level_id = null`, `level_name = 'Aportación libre'`, `amount` = lo indicado (2 decimales, ≥ `min_custom_amount`).

## Lógica pura (`src/lib/campaign.ts`, con tests)

- `isCampaignOpen(project, now)`: `project_status === 'active'` y (`end_date` vacía o `now` < inicio del día siguiente a `end_date`, en UTC).
- `daysLeft(end_date, now)`: días enteros que faltan (0 si cerrada, `null` si no hay fecha).
- `campaignTotals(project)`: `{ raised: current_amount, base: base_amount, total: raised + base }`.
- `formatEndDate(end_date)`: "29 de octubre".

## Servidor

- `ContributionInput`: `levelId` **o** `customAmount` (exactamente uno).
- `createPendingContribution`: rechaza si la campaña está cerrada (409); con `customAmount` exige `allow_custom_amount` y `≥ min_custom_amount` (422).
- `ProjectFormInput`: `campaign_mode`, `base_amount`, `base_label`, `allow_custom_amount`, `min_custom_amount`; en modo `target` el objetivo debe ser > 0, en modo `open` `end_date` es obligatoria y el objetivo puede ser 0.

## Interfaz

**Página de proyecto (modo `open`):** `OpenCampaignSection.astro` sustituye a `ProgressSection`: "Familia y amigos: X €", "`base_label`: `base_amount` €", "Total: X+base €", "Quedan N días · cierra el 29 de octubre". Cerrada: hero "¡Campaña cerrada! Total final: … €". La tarjeta del producto no muestra precio. Los niveles (y "Otra cantidad") solo se ven con la campaña abierta.

**Niveles:** tarjeta "Otra cantidad" con un campo numérico; al seleccionarla el botón dice "¡Contribuir X €!" y el modal recibe `{ custom: true, amount }`.

**Modal:** envía `customAmount` cuando no hay `levelId`; el resumen muestra "Otra cantidad".

**Home:** en modo `open` la tarjeta muestra "Recaudado: X €" y "Quedan N días" (o "Cerrada") en lugar del porcentaje.

**Backoffice:** bloque "Tipo de campaña" en crear/editar (modo, base y etiqueta, cantidad libre y mínimo). En contribuciones, las libres se listan como "Aportación libre". Vista `/admin` muestra recaudado y días restantes para las campañas abiertas.

## Contenido de Máximo

Seed `supabase/seeds/2026-09-22_maximo_bici.sql` con proyecto, niveles y emojis; textos redactados y placeholders para: enlace e imagen de la bici, número y concepto de Bizum. Se ejecuta tras la migración (o se crea desde el backoffice copiando los textos).

## Fuera de alcance

Cuenta atrás en vivo (se calcula en cada carga), hitos, pasarela de pago, fotos (se suben al bucket como en los otros proyectos).

## Pruebas

- Unitarias: `campaign.ts`, esquemas (nivel/cantidad libre, modo/objetivo/fecha), `project-form`.
- Manuales en dev: página de proyecto abierto con cuenta atrás, tarjeta "Otra cantidad" → modal → `POST /api/contributions` con `customAmount` (400/422 con datos inválidos), backoffice con el bloque nuevo.
