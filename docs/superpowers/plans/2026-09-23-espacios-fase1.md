# Espacios multiusuario — fase 1 (espacios y URLs) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada proyecto pertenece a un espacio (`tenants`); las páginas públicas viven en `/[número]/projects/[slug]` con migas y "volver"; los enlaces antiguos redirigen con 301; el alta y la edición fijan espacio y visibilidad. La cuenta actual sigue entrando igual (superadmin).

**Architecture:** Tabla `tenants` (número de 6 dígitos, dueño único) creada por trigger al registrarse un usuario; `project_config.tenant_id` + `visibility`; slug único por espacio. Helpers puros en `src/lib/tenants.ts` (validación de número, URLs, redirección legacy) con tests; consultas nuevas en `src/lib/supabase.ts`; el backoffice obtiene el espacio del usuario con `src/lib/tenants-server.ts`.

**Tech Stack:** el existente (Astro 5 SSR, Zod 4, Vitest + Container API + happy-dom, Supabase).

**Rama:** `feat/espacios`. Spec: `docs/superpowers/specs/2026-09-23-espacios-multiusuario-design.md`.

**Orden de despliegue:** aplicar en producción las migraciones 1-6 pendientes y la 8 (`20260923100000_tenants.sql`) **antes** de mezclar en `master` (la migración es compatible con el código desplegado hoy: solo añade tablas/columnas con valores por defecto).

---

### Task 1: Rama y migración
**Files:** `supabase/migrations/20260923100000_tenants.sql`, `supabase/README.md`

- [ ] `git checkout -b feat/espacios`.
- [ ] Migración con bloque `-- up` / `-- down`:

```sql
-- 20260923100000_tenants
-- Espacios (tenants): cada usuario tiene uno; los proyectos cuelgan de un espacio y tienen visibilidad.
-- Ver docs/superpowers/specs/2026-09-23-espacios-multiusuario-design.md.

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
    coalesce(nullif(trim(new.raw_user_meta_data->>'space_name'), ''), split_part(new.email, '@', 1), 'Mi espacio'),
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
       coalesce(nullif(trim(u.raw_user_meta_data->>'space_name'), ''), split_part(u.email, '@', 1), 'Mi espacio'),
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
drop index if exists public.project_config_slug_key;                       -- unicidad global (migración 5)
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
-- alter table public.project_config drop column if exists visibility, drop column if exists tenant_id;
-- drop trigger if exists on_auth_user_created_tenant on auth.users;
-- drop function if exists public.handle_new_user_tenant();
-- drop function if exists public.next_tenant_number();
-- drop table if exists public.tenants;
```

- [ ] Fila 8 en la tabla de `supabase/README.md` ("Espacios: tabla `tenants`, trigger de alta, `tenant_id` + `visibility`, slug único por espacio. Después de la 5; aplicar antes de desplegar la fase 1").
- [ ] Commit `feat(db): migración de espacios (tenants) y visibilidad`.

### Task 2: Helpers puros de espacios (TDD)
**Files:** `tests/tenants.test.ts`, `src/lib/tenants.ts`

- [ ] RED: tests de `isTenantNumber('123456') === true`, `'12345'`/`'abc123'`/`'1234567'` → false; `tenantUrl(123456) === '/123456'`; `projectUrl(123456, 'bici-maximo') === '/123456/projects/bici-maximo'`; `parseTenantParam(undefined) === null` y `parseTenantParam('123456') === 123456`; `tenantInitials('Familia Gallardo') === 'FG'`, `tenantInitials('máximo') === 'M'`, `tenantInitials('') === '?'`.
- [ ] GREEN:

```ts
// Espacios (tenants): número público de 6 dígitos y URLs. Puro: lo usan páginas, layouts y tests.
export const TENANT_NUMBER_RE = /^\d{6}$/;

export function isTenantNumber(value: unknown): value is string {
  return typeof value === 'string' && TENANT_NUMBER_RE.test(value);
}

/** Parámetro de ruta `[tenant]` → número, o null si no tiene el formato. */
export function parseTenantParam(value: string | undefined): number | null {
  return isTenantNumber(value) ? Number(value) : null;
}

export const tenantUrl = (number: number) => `/${number}`;
export const projectUrl = (number: number, slug: string) => `/${number}/projects/${slug}`;

/** Iniciales para el avatar de respaldo (máx. 2 letras). */
export function tenantInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]!.toUpperCase());
  return letters.join('') || '?';
}
```

- [ ] Commit `feat(tenants): helpers de número de espacio y URLs`.

### Task 3: Tipos y consultas de lectura
**Files:** `src/lib/supabase.ts`

- [ ] `export interface Tenant { id: string; number: number; name: string; avatar_url?: string | null; created_at: string }`.
- [ ] `ProjectConfig`: `tenant_id: string; visibility?: 'public' | 'private'; tenants?: Pick<Tenant, 'number' | 'name'> | null` (embed opcional).
- [ ] Consultas (todas con el cliente anon, `select` explícito; `console.error` + null/[] en error como las existentes):
  - `getTenantByNumber(number: number): Promise<Tenant | null>` — `from('tenants').select('id, number, name, avatar_url, created_at').eq('number', number).maybeSingle()`.
  - `getProjectByTenantAndSlug(tenantId: string, slug: string): Promise<ProjectConfig | null>` — `eq('tenant_id', tenantId).eq('slug', slug).maybeSingle()`.
  - `getTenantProjects(tenantId: string, opts: { includePrivate?: boolean } = {}): Promise<ProjectConfig[]>` — orden `created_at desc`; sin `includePrivate` filtra `visibility = 'public'`; nunca `cancelled`.
  - `getPublicProjects(): Promise<ProjectConfig[]>` — `select('*, tenants(number, name)')`, `visibility = 'public'`, no `cancelled`, `created_at desc`.
  - `findLegacyProjectBySlug(slug: string): Promise<(ProjectConfig & { tenants: { number: number } }) | null>` — `select('*, tenants(number)').eq('slug', slug).order('created_at').limit(1).maybeSingle()`; el más antiguo gana si hay varios.
- [ ] `getProjectBySlug` se mantiene solo para la redirección; marcar `@deprecated` en el JSDoc.
- [ ] `npm run check` sin errores. Commit `feat(tenants): consultas por espacio y proyectos públicos`.

### Task 4: Espacio del usuario en servidor
**Files:** `src/lib/tenants-server.ts`

```ts
// Espacio (tenant) del usuario con sesión. Solo servidor (service role).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tenant } from './supabase';

export async function getTenantForUser(admin: SupabaseClient, userId: string): Promise<Tenant | null> {
  const { data, error } = await admin
    .from('tenants')
    .select('id, number, name, avatar_url, created_at')
    .eq('owner_user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[tenants] error leyendo el espacio del usuario:', error.message);
    return null;
  }
  return data;
}
```

- [ ] Commit junto a la tarea 5.

### Task 5: Visibilidad en el formulario (TDD)
**Files:** `tests/schemas.test.ts`, `tests/project-form.test.ts`, `src/lib/schemas.ts`, `src/lib/project-form.ts`

- [ ] RED: `ProjectFormInput` acepta `visibility: 'public'` y por defecto `'private'`; rechaza `'secreto'`. `parseProjectForm` devuelve `data.visibility`.
- [ ] GREEN: `export const ProjectVisibility = z.enum(['public', 'private'])`; en `ProjectFormInput`: `visibility: z.preprocess(emptyToUndefined, ProjectVisibility.default('private'))`; `ProjectRowInput.visibility: ProjectVisibility` y mapeo en `parseProjectForm`.
- [ ] Commit `feat(admin): campo de visibilidad del proyecto`.

### Task 6: Migas de pan
**Files:** `src/components/Breadcrumbs.astro`, `tests/breadcrumbs.test.ts`

- [ ] RED (Container API): renderiza `<nav aria-label="Migas">` con enlaces para los elementos con `href` y `aria-current="page"` en el último; escapa el texto.
- [ ] GREEN:

```astro
---
export interface Crumb { label: string; href?: string }
export interface Props { items: Crumb[] }
const { items } = Astro.props;
---
<nav class='breadcrumbs' aria-label='Migas'>
  <ol>
    {items.map((item, i) => (
      <li>
        {item.href && i < items.length - 1 ? <a href={item.href}>{item.label}</a> : <span aria-current='page'>{item.label}</span>}
      </li>
    ))}
  </ol>
</nav>
<style>
  .breadcrumbs { margin: -22px 0 22px; font-size: 0.9rem; color: var(--color-text-secondary); }
  .breadcrumbs ol { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 0; padding: 0; }
  .breadcrumbs li + li::before { content: '›'; margin-right: 6px; opacity: 0.6; }
  .breadcrumbs a { color: var(--color-brand-primary); text-decoration: none; font-weight: 600; }
  .breadcrumbs a:hover { text-decoration: underline; }
  .breadcrumbs [aria-current] { font-weight: 600; color: var(--color-text-primary); }
</style>
```

- [ ] Commit `feat(ui): migas de pan`.

### Task 7: Rutas públicas nuevas y redirección
**Files:** `src/pages/[tenant]/projects/[slug].astro` (mover desde `src/pages/projects/[slug].astro`), `src/pages/projects/[slug].astro` (nuevo, redirección), `src/pages/[tenant]/index.astro`

- [ ] `git mv src/pages/projects/[slug].astro "src/pages/[tenant]/projects/[slug].astro"`. En el frontmatter:

```ts
import Breadcrumbs from '@/components/Breadcrumbs.astro';
import { parseTenantParam, projectUrl, tenantUrl } from '@/lib/tenants';
import { getProjectByTenantAndSlug, getTenantByNumber } from '@/lib/supabase';

const tenantNumber = parseTenantParam(Astro.params.tenant);
const tenant = tenantNumber ? await getTenantByNumber(tenantNumber) : null;
const { slug } = Astro.params;
const projectConfig = tenant && slug ? await getProjectByTenantAndSlug(tenant.id, slug) : null;
if (!tenant || !projectConfig) return new Response(null, { status: 404 });
if (projectConfig.project_status === 'cancelled') return Astro.redirect(tenantUrl(tenant.number));
const backHref = tenantUrl(tenant.number);
```

  Bajo `<div class='container' …>` añadir `<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: tenant.name, href: backHref }, { label: projectConfig.project_name }]} />` y, antes del `<Footer>`, `<p class='back-link'><a href={backHref}>← Volver a los proyectos de {tenant.name}</a></p>` (estilo: centrado, margen 32px, color `--color-brand-primary`).
- [ ] `src/pages/projects/[slug].astro` (redirección 301):

```astro
---
// Enlaces antiguos (/projects/<slug>) → URL con espacio. 301 para que WhatsApp y buscadores actualicen.
export const prerender = false;
import { findLegacyProjectBySlug } from '@/lib/supabase';
import { projectUrl } from '@/lib/tenants';

const { slug } = Astro.params;
const project = slug ? await findLegacyProjectBySlug(slug) : null;
if (!project?.tenants) return new Response(null, { status: 404 });
return Astro.redirect(projectUrl(project.tenants.number, project.slug), 301);
---
```

- [ ] `src/pages/[tenant]/index.astro`: valida el número (404 si no), carga `getTenantByNumber` + `getTenantProjects(tenant.id)` (solo públicos en esta fase), `BaseLayout` con `title={tenant.name}` y `subtitle='Proyectos de este espacio'`, migas `Inicio › {tenant.name}`, cabecera con avatar (foto o iniciales `tenantInitials`) y la misma lista de tarjetas que la home (extraer la tarjeta a `src/components/ProjectCard.astro` con props `project`, `href`, `index` para no duplicar; la home la reutiliza). Vacío: "Este espacio aún no tiene proyectos públicos."
- [ ] `npm run check`. Commit `feat(tenants): páginas /[número] y /[número]/projects/[slug] con redirección 301 de las URLs antiguas`.

### Task 8: Home con enlaces nuevos
**Files:** `src/pages/index.astro`, `src/components/ProjectCard.astro`

- [ ] La home usa `getPublicProjects()` y `projectUrl(project.tenants.number, project.slug)` en cada tarjeta (a través de `ProjectCard`). Debajo del nombre, línea pequeña "por {tenants.name}". Sin `tenants` (no debería pasar) la tarjeta se omite.
- [ ] Commit `feat(home): escaparate de proyectos públicos con URLs por espacio`.

### Task 9: Backoffice con espacio y visibilidad
**Files:** `src/pages/admin/projects/new.astro`, `src/pages/admin/projects/[id]/edit.astro`, `src/pages/admin/index.astro`, `src/lib/tenants-server.ts`

- [ ] `new.astro`: `const tenant = await getTenantForUser(supabase, Astro.locals.user.id)`; sin espacio → `error = 'Tu cuenta no tiene espacio asignado.'` y no se inserta. Comprobación de slug repetido **dentro del espacio** (`.eq('tenant_id', tenant.id)`). Insert con `tenant_id: tenant.id` (la visibilidad viene de `parsed.data`). Sección "2. Información básica": radios "Visibilidad" con el estilo `.mode-option` (`🔒 Privado — solo quien tenga el enlace` por defecto, `🌍 Público — aparece en la portada de la web`). El panel de IA no toca este campo.
- [ ] `edit.astro`: mismos radios con el valor actual; el `update` guarda `visibility`; el enlace público y el `subnav` "👁 Ver página" usan `projectUrl(tenant.number, slug)` (cargar el espacio del proyecto con `select('*, tenants(number, name)')`); botón "📋 Copiar enlace" (script `navigator.clipboard.writeText` + toast) junto a la URL completa (`Astro.url.origin + projectUrl(...)`).
- [ ] `admin/index.astro`: `select('*, tenants(number, name)')`; "👁 Ver" → `projectUrl`; etiqueta "🔒 Privado" / "🌍 Público" junto al estado.
- [ ] `npm run check`, `npm run lint`. Commit `feat(admin): alta y edición por espacio con visibilidad y enlace público nuevo`.

### Task 10: Documentación
**Files:** `docs/DATA-MODEL.md`, `docs/ARCHITECTURE.md`, `docs/FILE-MAP.md`, `docs/CHANGELOG.md`, `supabase/README.md`

- [ ] DATA-MODEL: tabla `tenants`, `tenant_id`/`visibility` en `project_config`, índice único `(tenant_id, slug)`, diagrama ER.
- [ ] ARCHITECTURE: rutas nuevas (`/[tenant]`, `/[tenant]/projects/[slug]`, 301 de `/projects/[slug]`), sección "Decisión: espacios por ruta con número".
- [ ] FILE-MAP: `tenants.ts`, `tenants-server.ts`, `Breadcrumbs.astro`, `ProjectCard.astro`, páginas nuevas, test nuevo.
- [ ] CHANGELOG: entrada de la fase 1.
- [ ] Commit `docs: espacios fase 1`.

### Task 11: Verificación local
- [ ] `npm test`, `npm run check`, `npm run lint`, `npm run build` en verde.
- [ ] Con la migración ya aplicada (tarea 12) arrancar el dev server y comprobar con curl: `/projects/bici-maximo` → 301 a `/<número>/projects/bici-maximo`; esa URL → 200 con migas; `/<número>` → 200; `/999999` → 404; `/abc` → 404; home → 200 con enlaces nuevos.

### Task 12: Migraciones en producción, merge y despliegue
- [ ] Pedir al usuario el token de acceso personal de Supabase (Management API) o la cadena de conexión de Postgres.
- [ ] Aplicar en orden las migraciones 1, 2, 3, 4, 5, 6 y 8 (`20260923100000_tenants.sql`); comprobar `select number, name from tenants` y `select slug, tenant_id, visibility from project_config`.
- [ ] `git checkout master && git merge --no-ff feat/espacios && git push` → deploy; verificar en producción los mismos curl de la tarea 11 sobre `https://gc.gallardcode.com`.
