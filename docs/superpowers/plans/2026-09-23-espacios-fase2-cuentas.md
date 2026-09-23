# Espacios multiusuario — fase 2 (cuentas) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cualquier persona puede crear una cuenta (email + contraseña con confirmación), entrar, recuperar y cambiar la contraseña, gestionar su espacio (nombre, avatar con foto) y pasar de la web pública a **su** `/admin` desde un menú de avatar. El backoffice queda filtrado por espacio; el administrador actual conserva un rol superadmin.

**Architecture:** El middleware resuelve la sesión en toda la web (`src/lib/session-server.ts`: verificación local HS256 con `SUPABASE_JWT_SECRET` o JWKS, `getUser` como respaldo, refresco con el refresh token) y deja `locals.user`, `locals.tenant`, `locals.isSuperAdmin`. La decisión de acceso por ruta es una función pura (`src/lib/auth-gate.ts`). Los formularios de cuenta son páginas Astro con handlers puros e inyectables en `src/lib/auth-routes.ts` (patrón de `project-draft-route.ts`). Flujo de emails con `token_hash` verificado en servidor (`verifyOtp`).

**Tech Stack:** el existente + `jose` (verificación de JWT).

**Rama:** `feat/cuentas` (desde `feat/espacios`). Spec: `docs/superpowers/specs/2026-09-23-espacios-multiusuario-design.md` (§2 cuenta, §3 sesión, §4 Supabase Auth, §6 navegación).

---

### Task 1: Puerta de acceso por ruta (TDD)
**Files:** `tests/auth-gate.test.ts`, `src/lib/auth-gate.ts`

- [ ] RED: `authGate({ pathname, method, hasUser, isSuperAdmin })` devuelve `'allow'` para rutas públicas, `'login'` para `/admin`, `/admin/x`, `/cuenta`, `/cuenta/contrasena` y `POST /logout` sin usuario, `'allow'` con usuario, `'forbidden'` para `/admin/espacios` sin superadmin, `'allow'` para `/login`, `/registro`, `/recuperar`, `/auth/confirm` siempre.
- [ ] GREEN. `safeNext(next: string | null): string` — solo rutas relativas internas (`/…`, sin `//` ni `\`), si no `/admin`. Tests.
- [ ] Commit.

### Task 2: Sesión en servidor (TDD)
**Files:** `package.json` (`jose`), `src/lib/env-schema.ts`, `src/lib/env.ts`, `.env.example`, `tests/env-schema.test.ts`, `tests/session-server.test.ts`, `src/lib/session-server.ts`, `src/env.d.ts`

- [ ] `SUPABASE_JWT_SECRET` opcional (`anthropic…` como modelo). Test.
- [ ] RED (firmando tokens HS256 con `jose` en el test): `verifyAccessToken(token, { secret })` → `{ id, email, app_metadata, user_metadata }`; caducado → null; firma mala → null; sin secreto → llama a `getUser` inyectado.
- [ ] `resolveSession(cookies, deps)`: access válido → usuario; inválido + refresh → `refreshSession` inyectado → nuevas cookies → usuario; sin nada → null. Tests con cookies falsas.
- [ ] `AuthUser` tipo compartido. `App.Locals`: `user: AuthUser | null; tenant: Tenant | null; isSuperAdmin: boolean; adminTenantOverride: boolean`.
- [ ] Commit.

### Task 3: Middleware global
**Files:** `src/middleware.ts`, `src/lib/authz.ts` (sin cambios de firma), `src/lib/tenants-server.ts` (`getTenantByNumberAdmin`)

- [ ] En cada petición: `locals.user = await resolveSession(...)`; `locals.isSuperAdmin = isAdminUser(user, env.adminEmails)`; `locals.tenant = user ? await getTenantForUser(...)` (si superadmin y cookie `gc-admin-tenant` válida → ese espacio, `adminTenantOverride = true`).
- [ ] `authGate` → `'login'`: redirect `/login?next=<pathname>`; `'forbidden'`: 403 página simple. `/admin/login` → 302 `/login`.
- [ ] `X-Robots-Tag: noindex` también en `/cuenta`, `/auth`, `/login`, `/registro`, `/recuperar`.
- [ ] Commit.

### Task 4: Handlers de cuenta (TDD)
**Files:** `tests/auth-routes.test.ts`, `src/lib/auth-routes.ts`, `src/lib/schemas.ts` (`LoginInput`, `RegisterInput`, `RecoverInput`, `PasswordInput`)

- [ ] Esquemas Zod: email, contraseña ≥ 8 (≤ 72), `space_name` 1-80, `accept_privacy` checkbox obligatorio en registro; `password === password2`.
- [ ] Handlers con deps inyectadas (`auth: { signInWithPassword, signUp, resetPasswordForEmail, verifyOtp }`, `updatePassword`, `limiter`, `now`):
  - `handleLogin(form, ip)` → `{ ok: true, session }` o `{ ok: false, error, status }` (401 "Email o contraseña incorrectos", 429).
  - `handleRegister(form, ip, siteUrl)` → `{ ok: true, session | null, needsConfirmation }`; errores neutros ("Si el email ya existe…" no: Supabase devuelve un usuario "fake" cuando el email existe si la confirmación está activa; se muestra siempre "Revisa tu correo").
  - `handleRecover(form, ip)` → siempre `{ ok: true }` salvo 429/validación.
  - `handleConfirm({ token_hash, type })` → `{ ok: true, session, type }` o error.
  - `handlePasswordChange(form, userId)` → `{ ok }`.
- [ ] Commit.

### Task 5: Páginas de cuenta
**Files:** `src/layouts/AuthLayout.astro` (tarjeta centrada, estilos de `admin/login.astro`), `src/pages/login.astro`, `src/pages/registro.astro`, `src/pages/recuperar.astro`, `src/pages/auth/confirm.astro`, `src/pages/logout.astro`, `src/pages/cuenta/index.astro`, `src/pages/cuenta/contrasena.astro`, `src/pages/privacidad.astro`, `src/pages/admin/login.astro` (redirige), `src/pages/admin/logout.astro` (eliminar; el formulario apunta a `/logout`)

- [ ] `/login`: form; éxito → cookies → `safeNext(next)`. Enlaces a registro y recuperar.
- [ ] `/registro`: nombre del espacio, email, contraseña, casilla privacidad → `signUp` con `options.data.space_name` y `emailRedirectTo: <origin>/auth/confirm`; si devuelve sesión (confirmación desactivada) → cookies → `/admin?bienvenida=1`; si no → pantalla "Revisa tu correo".
- [ ] `/recuperar`: email → `resetPasswordForEmail(email, { redirectTo: <origin>/auth/confirm })` → siempre "Si existe una cuenta con ese email, te hemos enviado un enlace".
- [ ] `/auth/confirm`: GET con `token_hash` + `type` → `verifyOtp` → cookies → `signup`/`email` → `/admin?bienvenida=1`; `recovery` → `/cuenta/contrasena?recovery=1`. Error → página con enlace a `/recuperar`.
- [ ] `/logout` POST → `auth.admin.signOut(token, 'local')` + borrar cookies → `/`.
- [ ] `/cuenta`: nombre del espacio (update `tenants.name`), avatar (subir/quitar, `src/lib/tenant-avatar-server.ts` con `validateImageFile`, bucket `avatars`, ruta `tenants/<id>/avatar-<ts>.<ext>`), email solo lectura, enlace a cambiar contraseña, enlace "Mi espacio" y "Administrar".
- [ ] `/cuenta/contrasena`: contraseña nueva ×2 → `auth.admin.updateUserById(user.id, { password })` → mensaje + enlace.
- [ ] `/privacidad`: texto breve (qué datos, emails de contribuidores, cookies técnicas, contacto).
- [ ] Commit por página o por bloque.

### Task 6: Menú de avatar y navegación
**Files:** `src/layouts/Header.astro`, `src/layouts/BaseLayout.astro`, `src/layouts/AdminLayout.astro`, `tests/header.test.ts`

- [ ] `Header.astro` lee `Astro.locals.user` / `Astro.locals.tenant`: con sesión, `<details class='user-menu'>` con avatar (foto o iniciales) y opciones "Mi espacio" (`/<n>`), "Administrar" (`/admin`), "Mi cuenta" (`/cuenta`), "Salir" (form POST `/logout`); sin sesión, "Entrar" y "Crear cuenta". Test con Container (`locals`).
- [ ] `AdminLayout.astro`: en el pie de la barra lateral, avatar + nombre del espacio, enlaces "Ver mi espacio", "Mi cuenta" y "Cerrar sesión" (POST `/logout`). Si `adminTenantOverride`, franja "Estás gestionando el espacio X · Volver al mío" (POST a `/admin/espacios` que borra la cookie; la página llega en la fase 3, el botón puede apuntar a `/admin/espacios/salir`).
- [ ] Commit.

### Task 7: Backoffice filtrado por espacio
**Files:** `src/pages/admin/index.astro`, `src/pages/admin/projects/new.astro`, `src/pages/admin/projects/[id]/{edit,contributions,messages}.astro`, `src/lib/tenants-server.ts` (`requireProjectInTenant`), `tests/tenants-server.test.ts`

- [ ] `requireProjectInTenant(admin, projectId, tenantId)` → fila o null (test con cliente falso).
- [ ] `admin/index`: `.eq('tenant_id', locals.tenant.id)`; sin espacio → aviso. `new`: usa `locals.tenant`. `edit`/`contributions`/`messages`: 404 si el proyecto no es del espacio.
- [ ] `/admin` con `?bienvenida=1`: tarjeta "¡Bienvenido! Crea tu primer proyecto" enlazando a `/admin/projects/new`.
- [ ] Commit.

### Task 8: Portada del espacio con privados para el dueño
**Files:** `src/pages/[tenant]/index.astro`

- [ ] Si `locals.tenant?.id === tenant.id` o superadmin: `getTenantProjects(tenant.id, { includePrivate: true })` y etiqueta "🔒 privado" en la tarjeta (`ProjectsList` prop `private?: boolean` por item).
- [ ] Commit.

### Task 9: Migración del bucket y documentación
**Files:** `supabase/migrations/20260923110000_avatars_bucket.sql`, `supabase/README.md`, `docs/INFRA.md` (variables + configuración de Auth: signups, confirm email, plantillas `token_hash`, Site URL, SMTP), `docs/API.md` (rutas de cuenta), `docs/ARCHITECTURE.md`, `docs/FILE-MAP.md`, `docs/CHANGELOG.md`, `.env.example`

- [ ] `insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;`
- [ ] Docs. Commit.

### Task 10: Verificación
- [ ] `npm test`, `npm run check`, `npm run lint`, `npm run build`.
- [ ] Con la migración aplicada y Auth configurado: registro real de una cuenta de prueba, confirmación, login, avatar, cambio de contraseña, logout; comprobar que un usuario no superadmin no ve proyectos de otro espacio (404 en `/admin/projects/<id-ajeno>/edit`).
