# Ajustar con IA, invitaciones, cambio de email y Google — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Refinar el borrador de IA sin rehacerlo, en alta y edición; (2) el superadmin crea espacios para otras personas; (3) cambio de email desde "Mi cuenta"; (4) login con Google.

**Architecture:** El endpoint `/admin/api/draft-project` acepta dos cuerpos: `{ brief }` (generar) y `{ instructions, current }` (ajustar). El prompt de ajuste incluye el formulario actual como JSON y pide devolver el borrador completo cambiando solo lo necesario; el navegador aplica únicamente los campos que difieren. El panel de IA pasa a un componente compartido por alta y edición. Invitaciones y cambio de email usan la Admin API de Supabase. Google usa el flujo PKCE de Supabase con el verificador guardado en una cookie HttpOnly (`/auth/google` → Google → `/auth/callback`).

**Tech Stack:** el existente. **Rama:** `master` (cambios acotados, cada uno desplegable).

---

### Task 1: Ajustar con IA — servidor (TDD)
**Files:** `tests/project-draft.test.ts`, `src/lib/project-draft.ts`, `tests/project-draft-route.test.ts`, `src/lib/project-draft-route.ts`, `src/lib/project-draft-server.ts`

- [ ] `RefineRequest = z.strictObject({ instructions: string 3-2000, current: CurrentDraft })` con `CurrentDraft` = campos del formulario (`Record<string, string | boolean | number>`) + `levels` opcional. `DraftRequestBody = union(DraftRequest, RefineRequest)`.
- [ ] `buildRefineUserMessage(current, instructions)`: JSON del formulario actual + instrucciones + regla "devuelve el borrador completo, cambia solo lo que pidan las instrucciones o lo que corrija un dato, conserva el resto literalmente; `notes` solo con lo que sigue faltando".
- [ ] Ruta: `generate` recibe `DraftInput = { kind: 'brief', brief } | { kind: 'refine', instructions, current }`; test de ambos cuerpos y de cuerpo inválido.
- [ ] Servidor: para `refine`, el mensaje de usuario es el de `buildRefineUserMessage`.

### Task 2: Ajustar con IA — navegador (TDD con happy-dom)
**Files:** `tests/client-forms.test.ts`, `src/lib/client/ai-draft.ts`, `src/components/admin/AiDraftPanel.astro`, `src/pages/admin/projects/new.astro`, `src/pages/admin/projects/[id]/edit.astro`

- [ ] `collectFormValues(form, levels)` → `{ fields, levels }` (texto, número, checkbox, radio elegido; niveles de las filas o de `[data-level-json]` en edición).
- [ ] `applyDraftToForm(form, draft, levels, { current })`: con `current`, solo escribe y resalta los campos distintos; los niveles se reemplazan solo si cambian y solo si hay filas (alta).
- [ ] Panel compartido `AiDraftPanel.astro` (`mode='new' | 'edit'`, `configured`): en alta, "Rellenar con IA" + bloque "Ajustar" (visible tras el primer borrador); en edición, solo "Ajustar". `initAiDraftPanel` gestiona ambos botones. En edición, los niveles actuales se serializan en `data-level-json` para dárselos como contexto.
- [ ] `new.astro` y `edit.astro` usan el componente (los estilos del panel se mueven a él).

### Task 3: Invitar (superadmin)
**Files:** `src/lib/tenant-invite-server.ts`, `tests/tenant-invite-server.test.ts`, `src/pages/admin/espacios/index.astro`, `src/lib/auth-routes.ts` (`OTP_TYPES` + `invite`), `src/pages/auth/confirm.astro`

- [ ] `inviteTenantOwner(admin, { email, spaceName, mode: 'email' | 'password', redirectTo })`: `email` → `auth.admin.inviteUserByEmail(email, { data: { space_name }, redirectTo })`; `password` → genera contraseña temporal (16 caracteres) y `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { space_name } })`; devuelve `{ ok, tempPassword? }`. Test con cliente falso.
- [ ] Formulario "Invitar" en `/admin/espacios` (email, nombre del espacio, modo). Resultado: aviso con la contraseña temporal (una sola vez) o "invitación enviada".
- [ ] `/auth/confirm` con `type=invite` → sesión → `/cuenta/contrasena?recovery=1` (elige contraseña).

### Task 4: Cambio de email
**Files:** `src/lib/auth-routes.ts` (`handleEmailChange`), `src/lib/auth-supabase.ts` (`updateEmail`), `tests/auth-routes.test.ts`, `src/lib/schemas.ts` (`EmailChangeInput`), `src/pages/cuenta/index.astro`

- [ ] `handleEmailChange(form, user, deps)`: valida email nuevo (≠ actual) y contraseña actual (`signInWithPassword` con el email actual); `auth.updateEmail(userId, newEmail)` → `auth.admin.updateUserById(id, { email, email_confirm: true })`. Tests.
- [ ] Formulario en "Mi cuenta" (email nuevo + contraseña) con mensaje de éxito; la sesión sigue válida.

### Task 5: Entrar con Google
**Files:** `src/lib/oauth-server.ts`, `tests/oauth-server.test.ts`, `src/pages/auth/google.astro`, `src/pages/auth/callback.astro`, `src/pages/login.astro`, `src/pages/registro.astro`, `src/lib/auth-gate.ts` (rutas públicas), `docs/INFRA.md`

- [ ] `startGoogleLogin(origin, next)`: cliente con `flowType: 'pkce'` y storage en memoria; `signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback', skipBrowserRedirect: true } })` → `{ url, codeVerifier }`. `finishOAuth(code, codeVerifier)`: storage precargado + `exchangeCodeForSession(code)` → sesión. Tests de la parte pura (lectura/escritura del verificador en el storage falso).
- [ ] `/auth/google` (GET): guarda el verificador y `next` en cookies HttpOnly (10 min) y redirige a Google. `/auth/callback?code=…`: intercambia, pone las cookies de sesión y va a `safeNext(next)`; error → `/login?error=google`.
- [ ] Botón "Entrar con Google" en login y registro. INFRA: pasos en Google Cloud (cliente OAuth, URI de redirección `https://<ref>.supabase.co/auth/v1/callback`) y en Supabase (Providers → Google).

### Task 6: Documentación y verificación
- [ ] `docs/API.md`, `docs/FILE-MAP.md`, `docs/INFRA.md`, `docs/CHANGELOG.md`. `npm test`, `npm run check`, `npm run lint`, `npm run build`. Deploy y comprobación en producción (ajustar con la cuenta de pruebas; invitar en modo contraseña).
