# Espacios multiusuario (tenants), cuentas y landing — diseño

**Fecha:** 2026-09-23 · **Estado:** aprobado por el usuario (decisiones cerradas en la conversación).

## Qué

Cada persona registrada tiene un **espacio** (tenant) con sus proyectos y su propio backoffice `/admin`.
Los proyectos son **públicos** (aparecen en el escaparate de la home) o **privados** (no listados: cualquiera con el
enlace los ve y aporta, como hasta ahora). Las URLs de proyecto pasan de `/projects/<slug>` a
`/<número de espacio>/projects/<slug>`. La home se convierte en una landing que presenta la web y muestra los
proyectos públicos. Se añade el flujo completo de cuenta: registro, confirmación por email, login, logout,
recuperación y cambio de contraseña, perfil con avatar (foto subida) y un menú de avatar desde el que se pasa de la
parte pública a `/admin`.

### Decisiones cerradas

| Tema | Decisión |
|------|----------|
| Identificación del espacio en la URL | Número de 6 dígitos aleatorio (`/[número]/…`). Sin subdominios. |
| Proyecto privado | "No listado": se ve y se aporta con el enlace, sin cuenta. Solo desaparece de las listas públicas. |
| Cuentas por espacio | Una cuenta = un espacio (sin invitaciones ni roles en esta versión). |
| Acceso | Email + contraseña (sin Google). |
| Avatar | Foto subida desde el dispositivo (Storage), con iniciales como respaldo. |
| Home | Landing con "publi" de la web + escaparate de proyectos públicos. |
| Navegación | Migas y enlaces "volver a la lista" en las páginas públicas y en el backoffice. |
| Migraciones | Las aplica Claude en producción al terminar, incluidas las 1-6 pendientes. |
| Superadmin | El rol actual (`app_metadata.role = 'admin'` / `ADMIN_EMAILS`) ve y gestiona todos los espacios. |

## 1. Datos

Migración nueva `supabase/migrations/20260923100000_tenants.sql` (después de las 1-7; la 5 —slug único global—
se sustituye por unicidad por espacio, ver abajo).

### Tabla `tenants`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid PK | |
| `number` | integer, único | 6 dígitos (100000–999999), aleatorio, generado por `public.next_tenant_number()` con reintento si choca |
| `name` | text | Nombre del espacio ("Familia Gallardo"). Se pide en el registro |
| `avatar_url` | text null | URL pública en el bucket `avatars` |
| `owner_user_id` | uuid único → `auth.users(id)` | Una cuenta, un espacio |
| `created_at`, `updated_at` | timestamptz | |

- **Creación automática:** trigger `after insert on auth.users` (función `security definer`) que inserta el tenant
  con `name = raw_user_meta_data->>'space_name'` (o la parte local del email) y un número nuevo. Así todo usuario
  tiene espacio aunque el flujo web falle a mitad.
- **Backfill:** se crea el espacio del administrador actual (email de `ADMIN_EMAILS`) y se le asignan los proyectos
  existentes.
- **RLS:** `anon`/`authenticated` leen `id, number, name, avatar_url` (necesario para pintar la portada del espacio);
  sin escrituras desde el navegador.

### Cambios en `project_config`

| Campo | Tipo | Notas |
|-------|------|-------|
| `tenant_id` | uuid not null → `tenants(id)` | Índice |
| `visibility` | text check (`public`,`private`) default `private` | La IA no lo rellena |

- Unicidad de `slug` **por espacio**: `create unique index project_config_tenant_slug_key on project_config (tenant_id, slug)`;
  se elimina el índice global `project_config_slug_key` si existe (migración 5).
- La vista `public_contributions` y las políticas de lectura no cambian: lo privado se filtra en servidor en las listas.

### Storage

- Bucket `avatars` (lectura pública). Ruta `tenants/<id>/avatar-<ts>.<ext>`. Subida desde el servidor con service role
  reutilizando `validateImageFile` (jpeg/png/webp/gif, ≤ 5 MB). Se borra el anterior al subir uno nuevo.
- `project-assets` sigue igual (`projects/<id>/…`).

## 2. Rutas

### Públicas

| Ruta | Qué |
|------|-----|
| `/` | Landing (sección 5) |
| `/[number]` | Portada del espacio: nombre, avatar y tarjetas de sus proyectos **públicos**. Si el visitante es el dueño (sesión verificada) o superadmin, también los privados, marcados "privado" |
| `/[number]/projects/[slug]` | Página del proyecto (la actual `[slug].astro`, buscando por `(tenant.number, slug)`) |
| `/projects/[slug]` | **301** a la URL nueva (si el slug existe en varios espacios, el proyecto más antiguo); 404 si no existe |
| `/privacidad` | Aviso de privacidad breve (qué se guarda, emails de contribuidores, contacto) |

`[number]` se valida en la página (`/^\d{6}$/`), si no → 404. Las rutas estáticas (`/admin`, `/api`, `/login`, …)
tienen prioridad sobre la dinámica en Astro, así que no hay colisión.

### Cuenta

| Ruta | Método | Qué |
|------|--------|-----|
| `/login` | GET/POST | Email + contraseña. Sustituye a `/admin/login` (que redirige aquí). Tras entrar → `/admin` (o `?next=`) |
| `/registro` | GET/POST | Nombre del espacio, email, contraseña (≥ 8), casilla de privacidad → `signUp` con `data.space_name` → pantalla "revisa tu correo" |
| `/recuperar` | GET/POST | Pide el email → `resetPasswordForEmail`. Mensaje neutro siempre ("si existe una cuenta, te hemos enviado un correo") |
| `/auth/confirm` | GET | Recibe `token_hash` y `type` (`signup`/`recovery`/`email`) del enlace del email → `verifyOtp` en servidor → cookies de sesión → `signup`: `/admin?bienvenida=1`; `recovery`: `/cuenta/contrasena` |
| `/cuenta` | GET/POST | Nombre del espacio, avatar (subir/quitar), email (solo lectura) |
| `/cuenta/contrasena` | GET/POST | Contraseña nueva ×2 → `updateUser({ password })` |
| `/logout` | POST | `signOut` + borrar cookies → `/` |

Rate limit por IP con el limitador existente: login 10/10 min, registro 5/h, recuperación 5/h.
Errores de login siempre "Email o contraseña incorrectos".

### Backoffice

- `/admin/**` como ahora, filtrado por `locals.tenant`. Alta y edición ganan el campo **Visibilidad**
  (público/privado, por defecto privado) y un botón "Copiar enlace" con la URL nueva.
- Toda escritura pasa por `requireProjectInTenant(supabase, projectId, tenant)` (404 si el proyecto no es del espacio).
- Superadmin: `/admin/espacios` lista todos los espacios (número, nombre, nº de proyectos, email del dueño) con
  "Entrar"; elegir uno guarda la cookie `gc-admin-tenant` (número) que el middleware solo respeta si el usuario es
  superadmin. Una franja en `AdminLayout` avisa "Estás gestionando el espacio X" con "Volver al mío".
- `/admin/api/draft-project` no cambia.

### Redirecciones y compatibilidad

- `/projects/[slug]` → 301. `/admin/login` → 302 a `/login`.
- `Astro.redirect` tras login respeta `?next=` solo si es una ruta relativa interna (evita open redirect).

## 3. Sesión y middleware

- Cookies HttpOnly `sb-access-token` / `sb-refresh-token` como hoy (`session-cookies.ts`).
- El middleware resuelve `locals.user` **en todas las rutas** cuando hay cookie: verificación local del JWT con `jose`
  (JWKS de Supabase en `/auth/v1/.well-known/jwks.json`, cacheado 10 min; si el proyecto firma con HS256, secreto en
  `SUPABASE_JWT_SECRET` opcional). Si el token ha caducado, refresco con el refresh token como ahora (una llamada).
  Sin llamada de red por página en el caso normal.
- `locals.tenant` (espacio del usuario, una consulta por petición con sesión) y `locals.isSuperAdmin`.
- Protección: `/admin/**`, `/cuenta/**` y `POST /logout` exigen sesión; `/admin/espacios` exige superadmin.
  Sin sesión → `/login?next=<ruta>`.
- Cabecera pública (`Header.astro`) recibe `user`/`tenant` por props: menú de avatar (foto o iniciales) con
  "Mi espacio" (`/[number]`), "Administrar" (`/admin`), "Mi cuenta", "Salir" (formulario POST). Sin sesión:
  "Entrar" y "Crear cuenta".
- `AdminLayout` muestra el mismo menú y el nombre del espacio.

### Variables de entorno nuevas

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `SUPABASE_JWT_SECRET` | No | Solo si el proyecto usa firma HS256 (legacy). Con JWKS no hace falta |

## 4. Configuración de Supabase Auth (la hace el usuario en el dashboard; documentado en INFRA)

- Authentication → Providers → Email: **activar** "Allow new users to sign up" y "Confirm email".
- URL Configuration: Site URL `https://gc.gallardcode.com`; Redirect URLs `https://gc.gallardcode.com/auth/confirm`.
- Plantillas: *Confirm signup* → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`;
  *Reset password* → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`.
- SMTP propio (Resend, Brevo…) para producción: el SMTP por defecto de Supabase limita a unos pocos correos por hora.
- Bucket `avatars` público de lectura (lo crea la migración si el proyecto lo permite; si no, a mano).

## 5. Landing `/`

Secciones, reutilizando `Header`, `Footer`, tarjetas de `index.astro` y tokens de tema:

1. **Hero:** nombre, eslogan ("Regalos en familia, entre todos"), texto de dos líneas, botones "Crea tu crowdfunding"
   (`/registro`) y "Entrar" (`/login`). Partículas/emoji sutiles como en la página de proyecto.
2. **Cómo funciona** (3 pasos): crea el proyecto (con ayuda de la IA) → comparte el enlace → la familia aporta por
   Bizum y tú confirmas.
3. **Qué incluye:** niveles de aportación, campañas por objetivo o por tiempo, seis temas, mensajes de apoyo
   moderados, aportación base, asistente de IA.
4. **Escaparate:** proyectos públicos (activos primero, máx. 12) con las tarjetas actuales; enlace "Ver más" si hay más.
5. **Pie:** enlaces a privacidad y acceso.

## 6. Navegación

- Franja de migas bajo la cabecera en páginas públicas: `Inicio › Familia Gallardo › Bici para Máximo`
  (en la portada del espacio: `Inicio › Familia Gallardo`).
- Página de proyecto: enlace "← Volver a los proyectos de {espacio}" arriba (en las migas) y al final de la página.
- Backoffice: "← Proyectos" en editar, contribuciones y mensajes (subnav actual) y enlace al proyecto público.
- El logo de la cabecera lleva a `/` en todas partes.

## 7. Seguridad

- Toda escritura sigue pasando por el servidor con service role y comprobación de pertenencia al espacio.
- `next` de login validado como ruta relativa. CSRF cubierto por cookies `SameSite=Lax` y formularios POST (como hoy).
- Mensajes de auth que no revelan si un email existe. Rate limit por IP en login/registro/recuperación.
- Cabeceras y CSP actuales; `X-Robots-Tag: noindex` en `/admin`, `/cuenta` y `/auth/*`.
- Página `/privacidad` enlazada desde registro y pie.

## 8. Pruebas

- Puras con dependencias inyectadas (patrón de `project-draft-route.ts`): handlers de login/registro/recuperar/confirm
  (`auth-routes.ts`), `requireProjectInTenant`, generación/validación de número de espacio, cálculo de redirección
  301, `safeNext`.
- Middleware: matriz ruta × sesión × rol (sin sesión, dueño, superadmin, cookie de espacio ajeno).
- Container API: landing, portada de espacio (con y sin privados), migas y menú de avatar en `Header`.
- Migración: SQL con `-- down`; comprobación manual de `pg_policies` y del backfill.

## 9. Fases (cada una se despliega sola)

1. **Espacios y URLs:** migración (con las 1-6 pendientes) + backfill, `tenant_id` en alta/listado, rutas
   `/[number]/…`, redirecciones 301, migas y "volver". Tu cuenta sigue entrando igual (superadmin).
2. **Cuentas:** login/registro/recuperar/confirm/cuenta/avatar/logout, middleware global, menú de avatar,
   `/admin` por espacio, `requireProjectInTenant`.
3. **Landing, visibilidad y superadmin:** landing nueva, campo Visibilidad, `/admin/espacios`, `/privacidad`.

Orden de despliegue de la fase 1: aplicar la migración en producción y, acto seguido, desplegar el código.
Para aplicar migraciones desde aquí hace falta o bien el **token de acceso personal de Supabase** (Management API) o la
**cadena de conexión** de Postgres (Settings → Database); el usuario la facilita al final de la fase 1.

## Fuera de alcance (esta versión)

Invitaciones y roles por espacio, login con Google, cambio de email, subdominios,
pagos automáticos.
