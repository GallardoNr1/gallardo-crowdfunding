# Registro de mejoras

Revisión completa realizada el **2026-09-22** (código, seguridad, infraestructura, documentación y tooling).
Sustituye al análisis del 2026-04-21, cuyo estado se recoge en la primera sección.

Leyenda de esfuerzo: **XS** < 1 h · **S** 1–3 h · **M** medio día–1 día · **L** varios días.

---

## 1. Estado de la revisión anterior (2026-04-21)

| # | Mejora (abril) | Estado | Nota |
|---|----------------|--------|------|
| 1 | `payment_status: 'completed'` en el insert | ⏳ Pendiente | Reformulada y ampliada en **N-01** (el problema real es que el cliente controla importe y estado). |
| 2 | `/api/data.json.ts` llama sin `project_id` | ⏳ Pendiente | Sigue devolviendo datos vacíos. Ver **N-16**. |
| 3 | `EmojiOption` duplicada | ⏳ Pendiente | `src/lib/supabase.ts:73` y `:80`. |
| 4 | Migraciones con Supabase CLI | ⏳ Pendiente | Ver **N-20**. |
| 5 | `.env.example` | ⏳ Pendiente | `docs/README.md:14` ya manda hacer `cp .env.example .env` y el archivo no existe. |
| 6 | Stripe instalado e inactivo | ⏳ Pendiente | Ampliada en **N-18** (también `@astrojs/vercel`, `@types/stripe`). |
| 7 | Moderación de mensajes (`is_approved: true`) | ⏳ Pendiente | Ver **N-06**. |
| 8 | ESLint + Prettier | ⏳ Pendiente | Ver **N-21**. |
| 9 | `timeFormating.ts` importa React | ⏳ Pendiente | |
| 10 | Tests con Vitest | ⏳ Pendiente | Ver **N-21**. |
| 11 | Deduplicación Realtime por ID | ⏳ Pendiente | El diagnóstico era incompleto: las claves ni siquiera coinciden. Ver **N-09**. |
| 12 | Queries de `BaseLayout` en todas las páginas | ⏳ Pendiente | Ver **N-13**. |
| 13 | Modal de éxito con `alert()` | ✅ Hecha | Sistema de toast (`window.showToast`) el 2026-04-21. |
| 14 | Favicon personalizado | ✅ Hecha | 2026-04-21. |
| 15 | Proteger `/api/data.json` | ⏳ Pendiente | Ver **N-16**. |

---

## 2. Hallazgos nuevos

### 🔴 Críticos — seguridad e integridad de datos

#### N-01 · Cualquiera puede alterar el importe recaudado de cualquier proyecto

**Problema.** Toda la escritura de contribuciones ocurre en el navegador con la clave `anon` (pública, va en el bundle):

- `createContribution` (`src/lib/supabase.ts:433-521`) inserta en `contributions` con `payment_status: 'completed'` e `is_test: false` fijados por el cliente, y con el `amount` que viene de un `<input type="hidden">` del formulario (`ContributionModal.astro:138-143`, `:1519-1529`). Se puede enviar 1 € etiquetado como "Paladín" o 10 000 € de golpe.
- A continuación llama a la RPC `increment_project_current_amount` (`:615-650`), que es `security definer` (salta RLS) y se puede invocar con el rol `anon` para **cualquier** `project_id` y **cualquier** importe, sin relación con ninguna contribución.
- Si la RPC falla, hay un *fallback* JS (`:683-736`) que hace `UPDATE project_config SET current_amount = …` directamente desde el cliente. Que exista y esté documentado como funcional sugiere que el rol `anon` tiene permiso de UPDATE sobre `project_config`.

**Propuesta.**
1. Mover la escritura a un endpoint de servidor (`src/pages/api/contributions.ts`, `POST`) que use `createAdminClient()`; el servidor obtiene el importe desde `contribution_levels.amount` a partir de `level_id`, fija `payment_status: 'pending'`, valida `project_id` y aplica un límite de peticiones.
2. `REVOKE EXECUTE ON FUNCTION increment_project_current_amount FROM anon, authenticated;` y sustituirla por un **trigger** en `contributions` que sume a `current_amount` solo cuando `payment_status` pase a `completed`.
3. Políticas RLS: `anon` solo `SELECT` sobre las vistas públicas; sin `INSERT`/`UPDATE` en `contributions` ni `project_config`.
4. Eliminar `incrementProjectCurrentAmount` (fallback JS) y `updateContributionStatus` del cliente; la confirmación de pago pasa al backoffice (`/admin/projects/[id]/contributions`).

**Esfuerzo:** M. **Cubre** los antiguos #1 y #15.

---

#### N-02 · XSS almacenado vía Realtime en la notificación de "nueva contribución"

**Problema.** `src/pages/projects/[slug].astro:453-462` construye la notificación con `innerHTML` interpolando `contributor.name`, `contributor.level` y `contributor.message` sin escapar. Esos valores llegan del evento `contributionCompleted`, que `ContributorsList.tsx:80-93` re-emite para **cada INSERT de Realtime**. Basta con registrar una contribución con nombre `<img src=x onerror="…">` para ejecutar JavaScript en el navegador de todos los visitantes conectados en ese momento. `RealtimeContributions.astro:51-55` (sin uso) tiene el mismo patrón, y `BaseLayout.astro:162-165` (`showToast`) inserta con `innerHTML` mensajes que a veces vienen de `result.error`.

**Propuesta.** Construir la notificación con `document.createElement` + `textContent`, o escapar con una función `escapeHtml`. Cambiar `showToast` a `textContent`. Borrar `RealtimeContributions.astro`. Añadir una `Content-Security-Policy` (ver N-15) como segunda barrera.

**Esfuerzo:** XS.

---

#### N-03 · Cualquier usuario de Supabase Auth es administrador (y el alta puede estar abierta)

**Problema.** `src/middleware.ts:23-30` solo comprueba que el token corresponda a un usuario válido; no hay concepto de rol. Si el alta por email está habilitada en el proyecto de Supabase (valor por defecto), cualquiera puede llamar a `POST /auth/v1/signup` con la clave `anon` y entrar en `/admin` para editar o cancelar proyectos. Además, `/admin/login` no tiene límite de intentos propio ni registro de accesos.

**Propuesta.**
1. En Supabase → Authentication → *Disable new user signups* (o restringir por dominio).
2. Comprobar en el middleware `user.app_metadata.role === 'admin'` (o una tabla `admins`) y denegar el resto.
3. Registrar login/logout/errores de auth en el log del servidor (sin tokens).

**Esfuerzo:** S.

---

#### N-04 · Realtime sin filtro: contribuciones de otros proyectos, anónimas y con email

**Problema.** `subscribeToContributions` (`src/lib/supabase.ts:885-894`) se suscribe a `event: '*'` sobre **toda** la tabla `contributions`, sin `filter: project_id=eq.…`. `ContributorsList.tsx:47-67` inserta cualquier fila que llegue:

- una contribución al proyecto A aparece en la página del proyecto B;
- se muestra `contributor_name` aunque `is_anonymous = true` (la vista `public_contributions` lo oculta, Realtime no);
- si RLS permite `SELECT` a `anon` sobre `contributions`, el *payload* incluye `contributor_email` y llega a todos los navegadores conectados. `findContribution` (`:816-838`, `select('*')` desde el cliente) apunta a que ese permiso existe.

**Propuesta.** Suscribirse con `filter: \`project_id=eq.${projectId}\``, descartar filas con `is_anonymous` o `payment_status !== 'completed'`, y en Supabase habilitar Realtime solo sobre una **vista/tabla de publicación** sin email (o usar *broadcast* desde el trigger). Verificar las políticas con:

```sql
select tablename, policyname, roles, cmd from pg_policies where schemaname = 'public';
```

**Esfuerzo:** S.

---

#### N-05 · PII en el repositorio

**Problema.** `data.json:6` contiene un email real de un contribuidor (y el resto de la fila). El archivo no se usa en ningún sitio (FILE-MAP lo describe como "datos de muestra").

**Propuesta.** Eliminar `data.json` del repo y del historial si se considera necesario (`git filter-repo`), o sustituirlo por datos ficticios.

**Esfuerzo:** XS.

---

### 🟠 Importantes — errores funcionales

#### N-06 · Mensajes de apoyo: publicación inmediata, suplantación y sin Realtime

- `createSupportMessage` (`supabase.ts:741-789`) inserta `is_approved: true` desde el cliente (antiguo #7).
- Cualquiera que acierte nombre + email de un contribuidor obtiene la insignia ⭐ (`findContribution` se llama desde el navegador con datos del formulario).
- Los mensajes nuevos solo se ven en la pestaña que los envía (evento local `newSupportMessage`); `subscribeToSupportMessages` existe (`:962-971`) pero no se usa.
- `SupportMessageFrom.astro:65-69` conserva un `csrf_token` con valor literal `{{ csrf_token }}` (resto de una plantilla Django).

**Propuesta.** Endpoint de servidor para crear mensajes con `is_approved: false` por defecto, aprobación desde el backoffice, suscripción Realtime filtrada por proyecto para el muro, y borrar el input CSRF.

**Esfuerzo:** M.

---

#### N-07 · El progreso se calcula desde una lista limitada y sin ordenar

**Problema.** `[slug].astro:122` y `:142` calculan "Recaudado" sumando `contibutionsList`, que viene de `getPublicContributions` con `limit 50` y **sin `order`** (`supabase.ts:310-331`). A partir de la contribución 51 el total mostrado es incorrecto y la lista inicial sale en orden arbitrario. La home (`index.astro:83`) usa `project.current_amount`, así que ambas páginas pueden discrepar.

**Propuesta.** Usar `project_config.current_amount` (o la vista `project_overview` filtrada por `id`) como única fuente de verdad y añadir `.order('created_at', { ascending: false })` a la query.

**Esfuerzo:** XS.

---

#### N-08 · Importes con decimales se truncan al seleccionar nivel

**Problema.** `ContributionLevels.astro:399` hace `parseInt(card.dataset.amount)`. Un nivel de 12,50 € se registra como 12 €. El formulario del backoffice permite `step="0.01"`.

**Propuesta.** `Number(card.dataset.amount)`; mejor aún, no enviar el importe desde el cliente (ver N-01).

**Esfuerzo:** XS.

---

#### N-09 · Contribución duplicada y doble celebración tras enviar el formulario

**Problema.** `ContributorsList.tsx` guarda la clave de deduplicación como `nombre-importe-created_at` (`:71`) pero la comprueba como `nombre-importe-mensaje` (`:127`): nunca coinciden. El usuario que envía ve su contribución dos veces (evento local + Realtime) y el confeti de `[slug].astro` se dispara dos veces porque el componente re-emite `contributionCompleted` (`:80-93`). `ContributionLevels.astro:459-466` además despacha `levelSelected` dos veces y abre el modal desde dos sitios.

**Propuesta.** Deduplicar por `id` de la fila (Realtime la trae; el modal puede recibirla de `createContribution`), no re-emitir `contributionCompleted` desde el island, y despachar `levelSelected` una sola vez.

**Esfuerzo:** S. **Cubre** el antiguo #11.

---

#### N-10 · Fecha del mensaje principal en texto libre → "Invalid Date"

**Problema.** `MessageSection.astro:64-70` hace `new Date(mainMessage.date).toLocaleDateString(…)`, pero el backoffice pide la fecha como texto libre con placeholder "Julio 2025" (`admin/projects/new.astro:203`). Con ese valor la página muestra literalmente `Invalid Date`.

**Propuesta.** Guardar la fecha como `type="date"` y formatear en servidor, o mostrar el texto tal cual si no es parseable.

**Esfuerzo:** XS.

---

#### N-11 · Página de proyecto inexistente devuelve 200 con datos de "Ana"

**Problema.** `[slug].astro:34-64`: si el slug no existe, se marca `errorLoadingConfig` y se renderiza la página en "modo demostración" con título, descripción e imagen hardcodeados de la tablet de Ana, con HTTP 200. Lo mismo ocurre si Supabase falla. Además, las cinco consultas se hacen en serie (`await` encadenados) aunque ARCHITECTURE.md dice "en paralelo"; con `BaseLayout` son 7 viajes secuenciales a Supabase por visita.

**Propuesta.** `return new Response(null, { status: 404 })` (o `Astro.redirect('/')`) cuando no hay proyecto; eliminar los valores por defecto de Ana; `Promise.all` para las consultas.

**Esfuerzo:** S.

---

#### N-12 · Modal: scroll bloqueado tras cerrar con Escape y fallo si no hay foco

**Problema.** `UI/Modal.astro:207` pone `body.overflow = hidden` al abrir y solo lo restaura en `closeModal` (`:224`). `<dialog>` se cierra con Escape de forma nativa sin pasar por ahí → la página queda sin scroll. `:213` hace `firstFocusable.focus()` sin comprobar `null`.

**Propuesta.** Escuchar el evento `close` del `<dialog>` para restaurar el scroll; `firstFocusable?.focus()`.

**Esfuerzo:** XS.

---

#### N-13 · `BaseLayout` consulta Supabase en páginas sin proyecto

**Problema.** `BaseLayout.astro:20-22` ejecuta `getProjectBySlug('')` y `getPaymentMethods()` en **todas** las páginas. En `/` el `.single()` falla y escribe `Error fetching project by slug` en el log de PM2 en cada visita.

**Propuesta.** Cargar el proyecto y los métodos de pago en `[slug].astro` y pasarlos por props al layout (antiguo #12).

**Esfuerzo:** XS.

---

#### N-14 · Validación en el backoffice

- `new.astro:47` / `edit.astro:52`: `target_amount` puede quedar en `0` → `ProgressSection` muestra 100 % (`Infinity`) y la home `NaN %`.
- `project_status` se guarda sin validar contra el enum (`edit.astro:51`).
- El slug solo cambia espacios por guiones (`new.astro:13`); no se comprueba unicidad ni el patrón `[a-z0-9-]+` en servidor; dos proyectos con el mismo slug rompen `getProjectBySlug().single()`.
- Los `<label>` del backoffice no tienen `for` → no están asociados a sus inputs.

**Propuesta.** Función `parseProjectForm(form)` con Zod (o validación manual) compartida por `new.astro` y `edit.astro`; índice `UNIQUE` sobre `project_config.slug`.

**Esfuerzo:** S.

---

#### N-15 · Sin cabeceras de seguridad ni `noindex` en zonas internas

**Problema.** No se envían `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy` ni `X-Content-Type-Options`. `/admin/login` y `/design-system` (1 430 líneas, público en producción) son indexables.

**Propuesta.** Añadir las cabeceras en `middleware.ts` (CSP con `'self'`, Supabase y Google Fonts); `<meta name="robots" content="noindex">` en `AdminLayout` y `login.astro`; servir `/design-system` solo en `import.meta.env.DEV` o tras el middleware de admin.

**Esfuerzo:** S.

---

#### N-16 · `/api/data.json` sigue roto y sin protección

**Problema.** `src/pages/api/data.json.ts:16-19` llama a `getProjectConfig()`, `getContributionLevels()`, etc. sin `id` → responde `{ projectConfig: null, contributionLevels: [], … }`. Sin auth ni límite de peticiones. El build no lo detecta porque no hay `astro check`.

**Propuesta.** Eliminarlo (no lo usa ninguna página). Si se quiere mantener, aceptar `?projectId=` y proteger con el middleware.

**Esfuerzo:** XS. **Cubre** los antiguos #2 y #15.

---

### 🟡 Calidad, deuda técnica y tooling

#### N-17 · Código muerto y páginas heredadas en producción

| Elemento | Motivo |
|----------|--------|
| `src/components/SupabaseTest.astro` (461 líneas) | Sin uso; llama a funciones con firmas antiguas. |
| `src/components/ContributorsList.astro` (698 líneas) | Sustituido por el island React. |
| `src/components/RealtimeContributions.astro` | Sin uso y con `innerHTML` inseguro. |
| `src/styles/globals.css` | Sin uso (se carga `public/styles/global.css`). |
| `src/pages/info/tablet_ana/` y `src/pages/lego/DD/` | Rutas públicas que duplican `[slug].astro` con `?id=`; siguen desplegadas. |
| `supabase.ts`: `getProjectOverview` (`.single()` falla con >1 proyecto), `getQuickStats`, `updateContributionStatus`, `subscribeToSupportMessages`, `testConnection` | Sin llamadas. |
| `[slug].astro:555-575` y `:599-628` | Bloques comentados y objeto `window.debugCrowdfunding` en producción. |
| `Header.astro:13` | `<dic class="header-bg">` — etiqueta inexistente (typo de `div`). |
| `index.astro:45-51` | `<a><li>` — `li` fuera de `ul`, HTML inválido. |

**Propuesta.** Borrar; mover las páginas experimentales a una rama.

**Esfuerzo:** S.

---

#### N-18 · Dependencias: sin uso, mal clasificadas y con vulnerabilidades

- Sin uso: `@astrojs/vercel`, `stripe`, `@types/stripe` (Stripe ya publica sus tipos).
- `@types/react` y `@types/react-dom` están en `dependencies`; deberían ir en `devDependencies`.
- `npm audit`: 27 avisos (19 high, 2 critical); `ws` afecta a Realtime en servidor. `@supabase/supabase-js` 2.50 → 2.117, `astro` 5.12 → 5.18 (rama 5.x).
- No hay Dependabot/Renovate.
- CI usa `npm install --legacy-peer-deps` en vez de `npm ci` → builds no reproducibles.

**Propuesta.** Limpiar `package.json`, `npm audit fix`, actualizar dentro de 5.x, añadir `.github/dependabot.yml`, `npm ci` en CI.

**Esfuerzo:** S. **Cubre** el antiguo #6.

---

#### N-19 · Despliegue con ventana de caída y acciones sin fijar

**Problema.** `deploy.yml` borra todo `/var/www/gallardo-crowdfunding` (salvo `node_modules` y `.env`) **antes** de subir el nuevo `dist`. El servidor Node sigue vivo, pero Astro carga las páginas con `import()` dinámico bajo demanda → las peticiones durante la copia fallan con 500. Las acciones (`appleboy/*`, `actions/*`) se referencian por tag, no por SHA. No hay paso de build/test en PR: solo se construye al hacer push a `main`.

**Propuesta.** Desplegar en `releases/<sha>` y cambiar un symlink `current` + `pm2 reload`; fijar acciones por SHA; workflow `ci.yml` (typecheck + build) en `pull_request`.

**Esfuerzo:** M.

---

#### N-20 · Esquema de base de datos fuera del repo

**Problema.** Tablas, vistas, RPC, políticas RLS y configuración de Realtime viven solo en el dashboard de Supabase. No hay forma de reproducir el entorno ni de revisar cambios de permisos (ver N-01, N-03, N-04).

**Propuesta.** `supabase init` + `supabase db pull` para volcar el esquema actual a `supabase/migrations/`, y a partir de ahí toda modificación (trigger de `current_amount`, `UNIQUE(slug)`, RLS) como migración revisable.

**Esfuerzo:** M. **Cubre** el antiguo #4.

---

#### N-21 · Sin typecheck, lint ni tests

**Problema.** `npm run build` pasa aunque `data.json.ts` y `SupabaseTest.astro` tengan errores de tipos, porque Vite no comprueba tipos. No hay ESLint/Prettier ni un solo test. `Contribution.payment_method` (`supabase.ts:123`) declara `'bizum' | 'paypal' | 'card' | 'transfer' | 'crypto'` mientras la app usa `'cash' | 'bizum' | 'bank_transfer'`.

**Propuesta.**
```bash
npm i -D @astrojs/check typescript eslint prettier eslint-plugin-astro vitest
```
Scripts `check`, `lint`, `test`; ejecutar los tres en CI. Primeros tests: `getTimeAgo`, `normalizeProjectPageContent`, `parseProjectForm`.

**Esfuerzo:** S (base) + continuo. **Cubre** los antiguos #8 y #10.

---

#### N-22 · Sesión de administrador caduca en 1 h aunque la cookie dure 7 días

**Problema.** `login.astro:31-36` guarda `access_token` (JWT, caduca ~1 h) y `refresh_token`, pero el middleware nunca refresca: pasada 1 h cualquier acción redirige al login. El logout no revoca la sesión en Supabase.

**Propuesta.** Refrescar con `supabase.auth.refreshSession({ refresh_token })` en el middleware cuando `getUser` falle, reescribiendo las cookies, o adoptar `@supabase/ssr`. Llamar a `auth.signOut()` (scope `local`) al cerrar sesión.

**Esfuerzo:** S.

---

#### N-23 · Variables de entorno sin validar al arrancar

**Problema.** `SUPABASE_SERVICE_ROLE_KEY` solo se comprueba al construir el cliente admin (`supabase-server.ts:7-9`) → un despliegue sin la variable arranca bien y falla con 500 al entrar en `/admin`. `start` en `package.json` usa sintaxis `VAR=x node …` que no funciona en Windows.

**Propuesta.** Módulo `src/lib/env.ts` que valide las tres variables al importar (Zod o comprobación manual) y `.env.example`. `cross-env` o documentar que `start` es solo para Linux.

**Esfuerzo:** XS. **Cubre** el antiguo #5.

---

#### N-24 · Documentación desactualizada respecto al código

- `README.md` raíz sigue siendo la plantilla de Astro.
- `ARCHITECTURE.md` y `API.md` no mencionan el middleware, `supabase-server.ts` ni las rutas `/admin/*` y sus acciones POST.
- `FILE-MAP.md` no lista `src/middleware.ts`, `src/lib/supabase-server.ts`, `src/styles/tokens.css`, `src/pages/admin/**`, `design-system.astro`.
- `INFRA.md` dice "estas dos variables" y lista tres; `docs/README.md` manda `cp .env.example .env`.
- `ARCHITECTURE.md` afirma que las queries van "en paralelo" (son secuenciales).

**Propuesta.** Actualizar al cerrar N-01/N-11; regla CLAUDE.md ya obliga a mantenerlo.

**Esfuerzo:** S.

---

### 🟢 UX, accesibilidad y producto

#### N-25 · Accesibilidad

- Las tarjetas de nivel (`ContributionLevels.astro:23-28`) son `<div>` con `click`: no se pueden seleccionar con teclado. Deben ser `<button>` (o `<input type="radio">`).
- La barra de progreso no expone `role="progressbar"` ni `aria-valuenow`.
- Labels del backoffice sin `for` (ver N-14).
- Enlace "términos y condiciones" apunta a `#` (`ContributionModal.astro:326-330`).

**Esfuerzo:** S.

---

#### N-26 · Textos y moneda hardcodeados

- `ContributionLevels.astro:446` "¡Contribuir X€!", `ProgressSection.astro:69` "Contribuciones de 25€ necesarias", `[slug].astro:175` "🌸 La Tribu Que Le Da Alas", `index.astro:117` muestra `Estado: active` sin traducir.
- `ProgressSection.astro:62` muestra "Faltan por conseguir −X €" cuando se supera la meta.
- `project.currency` existe en BD pero casi todo usa `'€'`.

**Esfuerzo:** S.

---

#### N-27 · Rendimiento de carga

- Google Fonts (Poppins/Inter) sin `font-display` controlado por nosotros y sin *preload*; considerar autoalojar.
- `project_image_url` externa sin `width`/`height` → CLS.
- `getImagesFromFolder` lista el bucket en cada visita; cachear (memoria con TTL o `Cache-Control: s-maxage` en el proxy).
- Ninguna respuesta lleva `Cache-Control`; `/` podría cachearse 30–60 s.

**Esfuerzo:** S.

---

#### N-28 · Confirmación de pago desde el backoffice

Hoy no hay forma de marcar una contribución como pagada/pendiente ni de ver la lista de contribuciones por proyecto sin entrar en Supabase. Es el complemento natural de N-01 (estado `pending` por defecto).

**Esfuerzo:** M.

---

## 3. Orden de ataque sugerido

| Prioridad | Ítems | Motivo |
|-----------|-------|--------|
| 1 | N-02, N-05, N-03 | XSS y PII: arreglos de minutos con impacto alto. |
| 2 | N-01, N-04, N-20 | Integridad del importe y fuga de datos por Realtime; requieren migraciones y endpoint servidor. |
| 3 | N-07, N-08, N-09, N-10, N-12, N-13, N-16 | Bugs visibles para el usuario, todos XS/S. |
| 4 | N-21, N-18, N-23, N-19 | Red de seguridad: typecheck + CI + deps + despliegue sin caída. |
| 5 | N-06, N-11, N-14, N-15, N-22, N-28 | Backoffice completo y endurecimiento. |
| 6 | N-17, N-24, N-25, N-26, N-27 | Limpieza, docs, a11y y rendimiento. |

---

## 4. Estado tras la implementación (2026-09-22, rama `mejoras/2026-09`)

| Ítem | Estado | Nota |
|------|--------|------|
| N-01 | ✅ código · ⏳ migraciones | `/api/contributions` + estado `pending`; trigger y `REVOKE` en `supabase/migrations/` pendientes de aplicar |
| N-02 | ✅ | Notificación y toast con `textContent` |
| N-03 | ✅ código · ⏳ Supabase | `isAdminUser` en middleware y login; falta desactivar el alta libre y dar el rol / `ADMIN_EMAILS` |
| N-04 | ✅ código · ⏳ migraciones | Broadcast por proyecto; hasta aplicar la migración no hay tiempo real |
| N-05 | ✅ | `data.json` eliminado (el historial de git no se ha reescrito) |
| N-06 | ✅ código · ⏳ migración | `/api/support-messages` + moderación en backoffice |
| N-07 … N-13 | ✅ | Ver CHANGELOG 2026-09-22 |
| N-14 | ✅ código · ⏳ migración | `parseProjectForm` + comprobación de slug; índice único pendiente |
| N-15 | ✅ parcial | Cabeceras y CSP en producción; `script-src` aún con `'unsafe-inline'` (siguiente paso: nonces) |
| N-16, N-17 | ✅ | Código muerto y páginas heredadas eliminados |
| N-18 | ✅ parcial | Deps limpias y actualizadas dentro de major; quedan avisos que exigen Astro 7 / sharp |
| N-19 | ✅ | Releases + symlink + `pm2 startOrReload`; acciones por SHA; `verify` antes del deploy |
| N-20 | ✅ parcial | Migraciones nuevas versionadas; baseline `supabase db pull` pendiente |
| N-21 | ✅ | `astro check` 0 errores, ESLint 0 errores (20 warnings), 36 tests, CI en PR |
| N-22 | ✅ | Refresco de sesión en middleware; logout revoca en Supabase |
| N-23 | ✅ | `env-schema.ts` + `.env.example` |
| N-24 | ✅ | Docs reescritas (ARCHITECTURE, API, INFRA, FILE-MAP, COMMANDS, STACK, DATA-MODEL, README) |
| N-25 | ✅ parcial | Niveles como `<button>`, labels asociados, `role=progressbar`; contraste sin auditar |
| N-26 | ✅ parcial | Moneda del proyecto en toda la UI; el título "La Tribu…" sigue fijo |
| N-27 | ⏳ | Rendimiento (fuentes, cache, dimensiones de imagen) sin tocar |
| N-28 | ✅ | `/admin/projects/:id/contributions` |

### Pendiente manual (no se puede hacer desde el repo)

1. Aplicar las migraciones de `supabase/migrations/` en el orden de `supabase/README.md` (la de RLS, después de desplegar).
2. Supabase → Authentication: desactivar *Allow new users to sign up*; dar rol admin al usuario o añadir `ADMIN_EMAILS` al `.env` y al secret `ENV_LOCAL`.
3. Revisar el `select` de `20260922100050_resync_current_amount.sql` antes de ejecutarlo.
4. Primer deploy con el nuevo `deploy.yml`: comprueba que PM2 arranca desde `current/` y que nginx sigue apuntando a `127.0.0.1:5025`.

