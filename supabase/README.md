# Base de datos — migraciones

El esquema vive en Supabase; este directorio versiona los cambios como SQL plano compatible con
[Supabase CLI](https://supabase.com/docs/guides/local-development/overview) (`supabase/migrations/`).

## Cómo aplicar las migraciones de 2026-09

En orden, una a una. Cada archivo lleva su bloque `-- down` comentado.

| # | Archivo | Qué hace | Cuándo |
|---|---------|----------|--------|
| 1 | `20260922100000_contributions_amount_trigger.sql` | Trigger que recalcula `current_amount`; revoca la RPC pública | Antes o después del deploy: el servidor también recalcula |
| 2 | `20260922100050_resync_current_amount.sql` | Alinea `current_amount` con las contribuciones completadas (revisar el `select` del encabezado antes) | Tras la 1 |
| 3 | `20260922100100_realtime_broadcast.sql` | Broadcast por proyecto desde triggers; quita `contributions` de `postgres_changes` | Tras desplegar el código nuevo (el cliente escucha `project:<id>`) |
| 4 | `20260922100200_support_messages_moderation.sql` | `is_approved` por defecto `false` | Cualquier momento |
| 5 | `20260922100300_project_config_slug_unique.sql` | Índice único en `slug` | Cualquier momento |
| 6 | `20260922100400_rls_lockdown.sql` | RLS: anon solo lee; sin acceso a `contributor_email` | **Después** de desplegar el código nuevo |
| 7 | `20260922110000_open_campaigns.sql` | Campañas por tiempo: `campaign_mode`, aportación base, cantidad libre; recrea `public_contributions` con LEFT JOIN | Antes de crear el proyecto de la bici |
| 8 | `20260923100000_tenants.sql` | Espacios: tabla `tenants`, trigger que crea el espacio de cada usuario nuevo, backfill del usuario actual, `tenant_id` + `visibility` en `project_config`, slug único **por espacio** (sustituye a la 5) | Después de la 5; **antes** de desplegar la fase 1 de espacios (compatible con el código anterior) |

**Opción A — SQL Editor:** pegar y ejecutar cada archivo en el dashboard (Database → SQL Editor).

**Opción B — CLI:**
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push          # aplica las migraciones pendientes
```

## Seeds

`supabase/seeds/2026-09-22_maximo_bici.sql` crea el proyecto "Bici para Máximo" (campaña por tiempo, base 150 €,
cantidad libre, cierre 29/10/2026) con sus niveles y emojis. Ejecútalo en el SQL Editor **después** de la migración 7
(idempotente: no duplica el slug). La imagen (subida desde el dispositivo) y el número de Bizum se ponen luego desde el backoffice.

## Capturar el esquema actual (baseline)

Para que el repo contenga también las tablas, vistas y la RPC existentes:
```bash
npx supabase db pull          # genera supabase/migrations/<ts>_remote_schema.sql
```
Revisar el archivo generado y commitearlo antes que las migraciones anteriores (renombrar con un timestamp menor).

## Acceso al backoffice

Solo entran usuarios con `app_metadata.role = 'admin'` o cuyo email esté en `ADMIN_EMAILS` (`.env`).
Para dar el rol desde SQL:
```sql
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
 where email = 'tu-email@dominio.com';
```
Y en el dashboard → Authentication → Providers → Email: desactivar **Allow new users to sign up**
para que nadie pueda registrarse por su cuenta.

## Comprobar las políticas

```sql
select tablename, policyname, roles, cmd
  from pg_policies
 where schemaname = 'public'
 order by tablename;
```
