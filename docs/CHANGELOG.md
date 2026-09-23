# Changelog

## [2026-09-23] — Fix deploy: el secret ENV_LOCAL rompía el workflow con valores entre comillas

- **Qué cambió:** El paso "Crear .env desde el secret" de `deploy.yml` interpolaba `${{ secrets.ENV_LOCAL }}` dentro del comando `printf`; con `MAIL_FROM="Gallardo Crowdfunding <no-reply@gallardcode.com>"` las comillas cerraban la cadena y `<no-reply@…>` se leía como redirección (`No such file or directory`). Ahora el secret se pasa como variable de entorno del paso y se vuelca con `printf '%s\n' "$ENV_LOCAL"`. El paso SSH ya usaba un heredoc entrecomillado y no cambia.
- **Por qué:** El deploy fallaba en el build desde que `MAIL_FROM` lleva nombre y `<correo>`.
- **Archivos tocados:** `.github/workflows/deploy.yml`, `docs/INFRA.md`, `docs/CHANGELOG.md`.
- **Impacto:** Cualquier valor de `ENV_LOCAL` puede llevar comillas, `<`, `$` o espacios sin romper el deploy.

---

## [2026-09-23] — Avisos por email al organizador, fotos de la familia y escaparate solo con activos

- **Qué cambió:** (1) Cuando llega una aportación (queda pendiente) o un mensaje de apoyo (pendiente de moderar), el dueño del espacio recibe un email con los datos y el enlace a la pantalla de confirmación/moderación (`notifications.ts` + `mailer.ts` con nodemailer; variables `SMTP_*` y `MAIL_FROM`, opcionales). Se envía sin bloquear la respuesta y nunca falla la operación por el email. (2) Sección "Fotos de la familia" en la edición del proyecto: subir varias fotos (JPG/PNG/WEBP/GIF ≤ 5 MB, 12 por vez) y borrarlas; van a `projects/<id>/fotoFami/`, la carpeta que ya lee la página pública. (3) El escaparate de la landing solo muestra proyectos activos.
- **Por qué:** Hasta ahora había que entrar al panel para enterarse de una aportación, las fotos solo se podían subir a mano en Supabase y los proyectos terminados llenaban la portada.
- **Archivos tocados:** `src/lib/{notifications,notifications-server,mailer,project-photos-server,env-schema,env}.ts`, `src/pages/api/{contributions,support-messages}.ts`, `src/pages/admin/projects/[id]/edit.astro`, `src/pages/index.astro`, `.env.example`, `tests/{notifications,project-photos,env-schema}.test.ts`, `docs/*`, `package.json` (`nodemailer`).
- **Impacto:** Los avisos requieren `SMTP_HOST` (y el resto de `SMTP_*`) en `.env` y en `ENV_LOCAL`; sin ellos no se envía nada y todo lo demás funciona igual.

---

## [2026-09-23] — Botón Compartir en la página del proyecto

- **Qué cambió:** `ShareButton.astro`: "Compartir" (icono de nodos) abre el menú nativo con la Web Share API (móvil y navegadores compatibles) o copia el enlace y avisa con el toast. En la página del proyecto va dentro de la tarjeta, bajo la descripción (prop `share` de `ProductCard`); en las tarjetas de la lista (landing y portada del espacio) solo el icono, abajo a la derecha. Sin botón de WhatsApp (el menú nativo ya lo incluye).
- **Por qué:** Compartir el proyecto era el paso más habitual y había que copiar la URL a mano.
- **Archivos tocados:** `src/components/ShareButton.astro`, `src/pages/[tenant]/projects/[slug].astro`, `tests/share-button.test.ts`, `docs/*`.
- **Impacto:** Solo interfaz; sin cambios de datos.

---

## [2026-09-23] — Ajustar con IA, invitaciones, cambio de email, Google y cabecera móvil

- **Qué cambió:** (1) **Ajustar con IA**: el endpoint del borrador acepta `{ instructions, current }`; el panel (`src/components/admin/AiDraftPanel.astro`, compartido por alta y edición) envía el formulario actual y aplica solo los campos que cambian (`collectFormValues` / `applyDraftToForm` con `current`); en edición los niveles van como contexto y no se tocan. (2) **Invitar** desde `/admin/espacios`: email + nombre del espacio, con invitación por email (`inviteUserByEmail`, plantilla *Invite user* → `/auth/confirm?type=invite`) o cuenta confirmada con contraseña temporal mostrada una vez (`createUser`). (3) **Cambiar email** en "Mi cuenta" confirmando la contraseña actual (`auth.admin.updateUserById`, sin correo de verificación). (4) **Entrar con Google**: `/auth/google` inicia el flujo PKCE en servidor (verificador en cookie HttpOnly) y `/auth/callback` intercambia el código; botones en login y registro. (5) Cabecera en móvil: logo a la izquierda, avatar (solo icono) a la derecha y título/subtítulo debajo centrados.
- **Por qué:** Peticiones del usuario tras probar la web: refinar el borrador sin rehacerlo, dar de alta a familiares sin que se registren, corregir el email y entrar sin contraseña.
- **Archivos tocados:** `src/lib/{project-draft,project-draft-route,project-draft-server,auth-routes,auth-supabase,schemas,tenant-invite-server,oauth-server,oauth-supabase}.ts`, `src/lib/client/ai-draft.ts`, `src/components/admin/AiDraftPanel.astro`, `src/pages/admin/projects/{new,[id]/edit}.astro`, `src/pages/admin/espacios/index.astro`, `src/pages/{login,registro}.astro`, `src/pages/auth/{confirm,google,callback}.astro`, `src/pages/cuenta/index.astro`, `src/layouts/{Header,AuthLayout}.astro`, `tests/*`, `docs/*`.
- **Impacto:** Google necesita el cliente OAuth en Google Cloud y el proveedor activado en Supabase (ver INFRA); hasta entonces el botón lleva a `/login?error=google`. La invitación por email necesita SMTP y la plantilla *Invite user*; la contraseña temporal funciona ya. El cambio de email no verifica el nuevo correo (lo decide el propio usuario con su contraseña).

---

## [2026-09-23] — Vista previa al compartir (Open Graph)

- **Qué cambió:** `BaseLayout` emite `og:title`, `og:description`, `og:url`, `og:image`, `og:site_name`, `og:locale` y las etiquetas `twitter:*` (`summary_large_image`). La página de proyecto comparte su subtítulo (o descripción) y la imagen del proyecto; la portada del espacio, su nombre y avatar; el resto usa `public/og-default.png` (1200×630, generado con Pillow). La URL y la imagen se hacen absolutas con `siteOrigin` (cabeceras `X-Forwarded-*` detrás de nginx).
- **Por qué:** Al compartir un enlace por WhatsApp salía sin tarjeta; ahora aparece la foto y el título del proyecto.
- **Archivos tocados:** `src/layouts/BaseLayout.astro`, `src/pages/[tenant]/projects/[slug].astro`, `src/pages/[tenant]/index.astro`, `public/og-default.png`, `tests/base-layout-og.test.ts`.
- **Impacto:** WhatsApp cachea la vista previa por URL: los enlaces ya compartidos pueden tardar en refrescarse. Las imágenes de proyecto muy pesadas (varios MB) pueden no mostrarse en la tarjeta; conviene subir portadas de menos de 1 MB.

---

## [2026-09-23] — Borrar cuenta y borrar espacio

- **Qué cambió:** `src/lib/tenant-delete-server.ts` (`deleteTenantCompletely`): borra en orden mensajes de apoyo, contribuciones, niveles, familiares y proyectos del espacio, los archivos de Storage (`projects/<id>/…` y el avatar), el espacio y por último la cuenta de Supabase Auth. En `/cuenta`, "Borrar mi cuenta" pide escribir el email y confirmar; en `/admin/espacios` el superadmin tiene "Borrar" en cada espacio ajeno. La landing muestra un aviso con `?cuenta=borrada`.
- **Por qué:** `project_config.tenant_id` es `on delete restrict`, así que borrar el usuario desde Supabase fallaba si tenía proyectos; hacía falta un proceso completo y confirmado.
- **Archivos tocados:** `src/lib/tenant-delete-server.ts`, `src/pages/cuenta/index.astro`, `src/pages/admin/espacios/index.astro`, `src/pages/index.astro`, `tests/tenant-delete-server.test.ts`, `docs/*`.
- **Impacto:** Irreversible por diseño; ambas pantallas piden confirmación. La cuenta se borra con `auth.admin.deleteUser`.

---

## [2026-09-23] — Seed del espacio de pruebas

- **Qué cambió:** `supabase/seeds/2026-09-23_espacio_pruebas.sql`: cuenta confirmada `pruebas@gallardcode.com` (clave `pruebas-2026`) creada en `auth.users` + `auth.identities`, espacio "Familia Pruebas" (nº 926215 en producción) y tres proyectos: `tablet-lucia` (objetivo, público, con una aportación confirmada y otra pendiente y dos mensajes), `viaje-fin-de-curso` (por tiempo, privado, base de los abuelos) y `lego-castillo` (completado, público). Aplicado en producción.
- **Por qué:** Probar registro/login, el backoffice por espacio, la visibilidad privada y el flujo de confirmación de pagos sin tocar los proyectos reales.
- **Archivos tocados:** `supabase/seeds/2026-09-23_espacio_pruebas.sql`, `supabase/README.md`.
- **Impacto:** Datos de prueba visibles en la landing (los dos proyectos públicos). Para retirarlos: borrar el usuario `pruebas@gallardcode.com` desde Supabase → Authentication (el espacio y sus proyectos caen en cascada) o marcar los proyectos como privados.

---

## [2026-09-23] — Espacios (fase 3): landing y superadmin

- **Qué cambió:** La home es una landing: hero con "Crea tu crowdfunding" (registro, o alta directa con sesión), "Cómo funciona" en tres pasos, "Qué incluye" (niveles, objetivo o tiempo, temas, mensajes, aportación base, IA), escaparate de proyectos públicos (abiertos primero, máx. 12) y llamada final. `/admin/espacios` (solo superadmin) lista todos los espacios con dueño, nº de proyectos y fecha, y "Gestionar" abre el backoffice de ese espacio.
- **Por qué:** Tercera y última fase del spec de espacios: la web se presenta a quien llega sin enlace y el administrador conserva la visión global.
- **Archivos tocados:** `src/pages/index.astro`, `src/pages/admin/espacios/index.astro`, `docs/*`.
- **Impacto:** Sin cambios de datos. Para desplegar el conjunto (fases 1-3) hay que aplicar las migraciones pendientes (1-6, 8, 9) y configurar Supabase Auth (ver INFRA).

---

## [2026-09-23] — Espacios (fase 2): cuentas, sesión global y backoffice por espacio

- **Qué cambió:** Registro público (`/registro`: nombre del espacio, email, contraseña, privacidad) con confirmación por email, `/login` (sustituye a `/admin/login`), `/recuperar`, `/auth/confirm` (verifica el `token_hash` de los emails en servidor), `/cuenta` (nombre del espacio y foto de avatar en el bucket `avatars`), `/cuenta/contrasena`, `/logout` y `/privacidad`. El middleware resuelve la sesión en toda la web (`jose` con `SUPABASE_JWT_SECRET` opcional, `getUser` como respaldo, refresco automático) y deja `locals.user`, `locals.tenant`, `locals.isSuperAdmin`; la decisión de acceso por ruta es pura (`auth-gate.ts`). Cabecera pública con menú de avatar (Mi espacio, Administrar, Mi cuenta, Salir) o botones Entrar / Crear cuenta. Backoffice filtrado por espacio: listado, alta, edición, contribuciones y mensajes solo del espacio del usuario (404 en proyectos ajenos); tarjeta de bienvenida tras registrarse; barra lateral con el espacio y accesos; el superadmin puede gestionar otro espacio (cookie `gc-admin-tenant`, `/admin/espacios/salir`). La portada del espacio muestra al dueño también sus proyectos privados (etiqueta 🔒).
- **Por qué:** Segunda fase del spec de espacios multiusuario: que cualquier familia cree su cuenta y gestione sus proyectos sin depender del administrador.
- **Archivos tocados:** `src/middleware.ts`, `src/env.d.ts`, `src/lib/{auth-gate,session-server,auth-routes,auth-supabase,tenant-avatar-server,tenants-server,session-cookies,schemas,env-schema,env}.ts`, `src/layouts/{AuthLayout,Header,AdminLayout}.astro`, `src/pages/{login,registro,recuperar,logout,privacidad}.astro`, `src/pages/auth/confirm.astro`, `src/pages/cuenta/*`, `src/pages/admin/**`, `src/pages/[tenant]/index.astro`, `src/components/ProjectsList.astro`, `supabase/migrations/20260923110000_avatars_bucket.sql`, `tests/*`, `docs/*`, `package.json` (`jose`).
- **Impacto:** Hay que configurar Supabase Auth (registro y confirmación activos, plantillas con `token_hash`, Site URL, SMTP propio) y aplicar la migración del bucket; ver INFRA → "Supabase Auth". `SUPABASE_JWT_SECRET` es opcional pero recomendable (evita una llamada a Supabase por página con sesión). `/admin/logout` desaparece (ahora `/logout`).

---

## [2026-09-23] — Espacios (fase 1): proyectos por espacio y URLs con número

- **Qué cambió:** Tabla `tenants` (espacio por usuario, número público de 6 dígitos, creado por trigger al registrarse) y `tenant_id` + `visibility` en `project_config`, con slug único por espacio (migración `20260923100000_tenants.sql`; backfill del espacio del administrador con los proyectos actuales como públicos). Rutas públicas nuevas: `/[número]` (portada del espacio, con avatar o iniciales) y `/[número]/projects/[slug]` (página del proyecto, con migas "Inicio › Espacio › Proyecto" y enlace "Volver a los proyectos de…"); `/projects/[slug]` redirige con 301. La home lista los proyectos públicos de todos los espacios ("por Familia X") con la tarjeta extraída a `ProjectsList.astro`. Backoffice: el alta crea el proyecto en el espacio del usuario (`getTenantForUser`), campo "Visibilidad" (privado por defecto) en alta y edición, enlace público nuevo con botón "Copiar enlace" (origen tomado de `X-Forwarded-*` detrás de nginx) y etiqueta 🌍/🔒 en el listado.
- **Por qué:** Primer paso de la web multiusuario: cada familia tendrá su espacio y sus proyectos sin pisarse los slugs, y los proyectos privados quedan fuera de las listas.
- **Archivos tocados:** `supabase/migrations/20260923100000_tenants.sql`, `supabase/README.md`, `src/lib/{tenants,tenants-server,supabase,schemas,project-form}.ts`, `src/components/{ProjectsList,Breadcrumbs}.astro`, `src/pages/index.astro`, `src/pages/[tenant]/**`, `src/pages/projects/[slug].astro`, `src/pages/admin/**`, `tests/{tenants,breadcrumbs,schemas,project-form}.test.ts`, `docs/*`.
- **Impacto:** Requiere aplicar la migración **antes** de desplegar (es compatible con el código anterior). Los enlaces antiguos siguen funcionando vía 301. Cuentas y landing llegan en las fases 2 y 3 (spec `docs/superpowers/specs/2026-09-23-espacios-multiusuario-design.md`).

---

## [2026-09-23] — Casilla "otra cantidad" alineada en los formularios del backoffice

- **Qué cambió:** En "Aportaciones" (alta y edición) la casilla "Permitir otra cantidad" pasa a una fila casilla + texto (`.field--check`, `.check-label`) con tamaño propio y una ayuda debajo; antes heredaba el `width: 100%` de los inputs y quedaba descolgada. El resaltado de la IA marca la etiqueta entera de la casilla.
- **Por qué:** Se veía mal (casilla suelta bajo la etiqueta, hueco enorme).
- **Archivos tocados:** `src/pages/admin/projects/new.astro`, `src/pages/admin/projects/[id]/edit.astro`, `src/lib/client/ai-draft.ts`.
- **Impacto:** Solo CSS y marcado; mismo `name`/`id`, así que el envío del formulario y la restauración no cambian.

---

## [2026-09-22] — Borrador de proyecto con IA, niveles en el alta y textos por tema

- **Qué cambió:** Panel "✨ Rellenar con IA" en `/admin/projects/new`: se describe el crowdfunding a grandes rasgos y `POST /admin/api/draft-project` pide a Claude (`claude-opus-5`, salida estructurada validada con Zod) un borrador de todos los campos del formulario, incluidos niveles de contribución y una lista de suposiciones/datos que faltan; el navegador rellena los campos (resaltados) y **no guarda nada** hasta pulsar "Crear proyecto". Nuevo `ANTHROPIC_API_KEY` opcional: sin clave el panel muestra un aviso. El alta admite ahora filas de niveles (se insertan tras crear el proyecto) y recupera lo escrito si el servidor devuelve un error (sessionStorage). Los temas llevan textos propios (`texts` en `themes.ts`): título de la familia ("La Tribu Que Le Da Alas"), etiqueta del contador ("Héroes"), títulos de niveles, mensaje familiar y muro de apoyo. Cabecera: el logo va en `position: absolute` para que el título quede centrado en la página.
- **Por qué:** Dar de alta un proyecto exigía redactar más de veinte campos a mano; con el borrador solo hay que revisar. Los textos fijos "de fiesta" desentonaban en los demás temas y el logo desplazaba el título.
- **Archivos tocados:** `src/lib/project-draft.ts`, `src/lib/project-draft-form.ts`, `src/lib/project-draft-route.ts`, `src/lib/project-draft-server.ts`, `src/pages/admin/api/draft-project.ts`, `src/lib/client/{ai-draft,level-rows,form-restore}.ts`, `src/lib/project-form.ts`, `src/lib/env-schema.ts`, `src/lib/env.ts`, `src/lib/themes.ts`, `src/pages/admin/projects/new.astro`, `src/pages/admin/projects/[id]/edit.astro`, `src/pages/projects/[slug].astro`, `src/components/**`, `src/layouts/Header.astro`, `tests/*`, `docs/*`, `.env.example`, `package.json` (`@anthropic-ai/sdk`, `happy-dom` en dev).
- **Impacto:** Sin cambios de esquema. Cada borrador es una llamada de pago a la API de Anthropic (límite: 20 por usuario y 10 minutos). Para activarlo en producción hay que añadir `ANTHROPIC_API_KEY` al secret `ENV_LOCAL` y, si nginx corta a los 60 s, subir `proxy_read_timeout` (ver INFRA). Si la clave es de organización (sin workspace) la API exige además `ANTHROPIC_WORKSPACE_ID` (cabecera `anthropic-workspace-id`); el error se muestra en el panel con esa indicación.

---

## [2026-09-22] — Formularios detrás de nginx

- **Qué cambió:** `security.checkOrigin: false` en `astro.config.mjs`.
- **Por qué:** En producción todos los POST de formulario (login, backoffice) fallaban con "Cross-site POST form submissions are forbidden": Node ve `http://127.0.0.1:5025` y el navegador envía `Origin: https://gc.gallardcode.com`.
- **Archivos tocados:** `astro.config.mjs`, `docs/INFRA.md`.
- **Impacto:** CSRF cubierto por cookies `SameSite=Lax`. Reactivable si nginx envía `X-Forwarded-Proto`/`Host` (ver INFRA).

---

## [2026-09-22] — Pulido del diseño común

- **Qué cambió:** Backoffice en móvil: botón hamburguesa en la barra superior que abre el menú lateral como cajón desde la derecha (fondo oscurecido, cierre con ✕, fondo o Escape; `AdminLayout.astro`). Tarjeta del proyecto con botón "Quiero aportar" llamativo (anillo pulsante, brillo, flecha) que baja a la sección de niveles (`#contribuir`), solo mientras la campaña está abierta; las secciones ya visibles al cargar no se animan (evita un doble salto). `global.css`: scroll suave, foco visible coherente (`:focus-visible`), color de selección, utilidad `.reveal` (aparición al hacer scroll), botón "volver arriba" y `prefers-reduced-motion`. Cabecera con línea de acento en los colores del tema y entrada animada del título. Home: tarjetas con tokens, elevación al pasar el ratón, zoom suave de la imagen, entrada escalonada, barra de progreso animada, estado como píldora y pie de página (antes no tenía). Página de proyecto: las secciones aparecen al hacer scroll (`.reveal`, JS del `[slug]`) y el botón de contribuir late cuando ya se puede pulsar.
- **Por qué:** Dar coherencia y "vida" al diseño sin tocar la estructura ni el contenido.
- **Archivos tocados:** `public/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/layouts/Header.astro`, `src/pages/index.astro`, `src/pages/projects/[slug].astro`, `src/components/ContributionLevels.astro`.
- **Impacto:** Solo CSS y dos scripts pequeños; sin JS todo se ve (la clase `.reveal` la añade el script). Las animaciones se desactivan con `prefers-reduced-motion`.

---

## [2026-09-22] — Temas por proyecto y ajustes del backoffice

- **Qué cambió:** En las campañas por tiempo la barra de progreso mide el **tiempo** (inicio → cierre, `campaignTimeline` en `src/lib/campaign.ts`): "Día X de N", fechas de inicio y cierre y cuenta atrás, en lugar de la barra de dinero. Seis temas (fiesta, aventura, navidad, fantasía, viaje, tecnología) definidos en `src/lib/themes.ts` con paleta de colores y juego de emojis; se guardan en `page_content.theme` (sin migración) y se aplican en la página del proyecto con `html[data-theme]` sobrescribiendo los tokens CSS y pasando los emojis a `ContributionLevels`, `MessageSection`, `SupportMessageSection`, el modal, el hero de cierre y el confeti. Los colores fijos de los componentes públicos pasan a tokens (`--color-accent*` nuevos en `tokens.css`). La home marca cada tarjeta con el color de su tema. Backoffice: sección "Aspecto" con tarjetas de tema; los selectores de modo y tema ocultan el círculo del radio. Imagen del producto sin recortar (`object-fit: contain`); botones 💳/💬 del listado de `/admin` con borde y ajuste de línea. Temas asignados a los proyectos existentes.
- **Por qué:** Cada campaña tiene su personalidad (bici, dragón, tablet, viaje) y el look único de "fiesta" no encajaba con todas.
- **Archivos tocados:** `src/lib/themes.ts`, `src/styles/tokens.css`, `src/lib/supabase.ts`, `src/lib/schemas.ts`, `src/lib/project-form.ts`, `src/layouts/BaseLayout.astro`, `src/pages/projects/[slug].astro`, `src/pages/index.astro`, `src/components/**`, `src/pages/admin/projects/**`, `tests/themes.test.ts`, `docs/*`.
- **Impacto:** Sin cambios de esquema. Un proyecto sin `theme` usa `fiesta` (aspecto anterior). Para añadir un tema basta con una entrada en `THEMES`.

---

## [2026-09-22] — Campañas por tiempo (bici de Máximo)

- **Qué cambió:** Nuevo `campaign_mode` en `project_config` (`target` | `open`) con `base_amount`, `base_label`, `allow_custom_amount` y `min_custom_amount` (migración `20260922110000`). En modo abierto la página muestra "familia y amigos + base = total" y una cuenta atrás (`OpenCampaignSection`), sin porcentaje ni precio; al pasar `end_date` la campaña se cierra sola (409 en la API, niveles ocultos, hero de cierre). Tarjeta "Otra cantidad" en los niveles y `customAmount` en `POST /api/contributions`. `end_date` pasa a ser vinculante en todos los proyectos. Backoffice con bloque "Tipo de campaña"; `/admin` muestra total y días. Vista `public_contributions` recreada con `LEFT JOIN` (aportaciones sin nivel visibles, anónimos como "Anónimo"). Seed `supabase/seeds/2026-09-22_maximo_bici.sql` con textos, niveles y emojis (imagen y Bizum se completan desde el backoffice). El formulario del backoffice empieza por "¿Cómo termina la campaña?" y muestra solo los campos del modo elegido (`src/lib/client/campaign-form.ts`); la imagen de portada se puede **subir desde el dispositivo** (`src/lib/project-image-server.ts` → bucket `project-assets/projects/<id>/cover-*`), además de pegar una URL; sin URL de producto la imagen no enlaza.
- **Por qué:** La bici de Máximo se recauda "lo máximo posible hasta el 29/10", con 150 € de base de los padres; el modelo de objetivo fijo no encajaba.
- **Archivos tocados:** `supabase/migrations/20260922110000_open_campaigns.sql`, `supabase/seeds/*`, `src/lib/campaign.ts`, `src/lib/schemas.ts`, `src/lib/project-form.ts`, `src/lib/contributions-server.ts`, `src/lib/supabase.ts`, `src/components/OpenCampaignSection.astro`, `src/components/ContributionLevels.astro`, `src/components/ContributionModal.astro`, `src/components/ProductCard.astro`, `src/pages/projects/[slug].astro`, `src/pages/index.astro`, `src/pages/admin/**`, `tests/*`, `vitest.config.ts`, `docs/*`.
- **Impacto:** Requiere aplicar la migración 7 antes de crear el proyecto (sin ella las columnas no existen y el backoffice fallará al guardar). Proyectos existentes siguen en modo `target` sin cambios; ojo: si alguno tenía `end_date` en el pasado, ahora aparece cerrado. Vitest usa `getViteConfig` (tests con la Container API de Astro).

---

## [2026-09-22] — Implementación de las mejoras N-01…N-28 (rama `mejoras/2026-09`)

- **Qué cambió:**
  - **Escrituras en servidor:** `POST /api/contributions` y `POST /api/support-messages` (Zod + rate limit + service role). El navegador ya no inserta ni actualiza nada; `src/lib/supabase.ts` solo lee. Las contribuciones nacen `pending` con el importe del nivel; los mensajes, sin aprobar.
  - **Backoffice:** confirmación de pagos (`/admin/projects/:id/contributions`, recalcula `current_amount`), moderación de mensajes (`/admin/projects/:id/messages`), validación de formularios con `parseProjectForm`, slug único, labels accesibles, contadores de pendientes. Solo entran usuarios con `app_metadata.role = 'admin'` o email en `ADMIN_EMAILS`; la sesión se refresca sola y el logout revoca en Supabase.
  - **Seguridad:** notificaciones y toasts sin `innerHTML`; cabeceras de seguridad y CSP en producción; `/admin` con `noindex`; `/design-system` solo en dev; `data.json` (email real) eliminado.
  - **Base de datos:** migraciones versionadas en `supabase/migrations/` — trigger que recalcula `current_amount`, broadcast por proyecto desde triggers, `is_approved` por defecto `false`, índice único en `slug`, RLS (anon solo lee, sin `contributor_email`).
  - **Tiempo real:** suscripción Broadcast `project:<id>` (`subscribeToProjectEvents`) en vez de `postgres_changes` sobre toda la tabla; dedupe por id.
  - **Bugs:** 404 real en proyectos inexistentes, consultas en paralelo, progreso desde `current_amount`, `Number()` en importes de nivel, un solo evento `levelSelected`, scroll restaurado al cerrar el modal con Escape, fecha del mensaje en texto libre, `<dic>` → `<div>`, HTML válido en la home, estados traducidos, sin NaN ni negativos en el progreso, stats del CTA conservadas al editar.
  - **Tooling:** Vitest (36 tests), `astro check`, ESLint + Prettier, Zod, `.env.example` + validación al arrancar, Dependabot; dependencias sin uso eliminadas (`stripe`, `@astrojs/vercel`) y actualizadas dentro de major.
  - **CI/CD:** `ci.yml` en PR; `deploy.yml` con `verify`, acciones por SHA, releases + symlink `current` + `pm2 startOrReload` (`ecosystem.config.cjs`).
  - **Limpieza:** eliminados `/api/data.json`, `SupabaseTest`, `ContributorsList.astro`, `RealtimeContributions`, `globals.css`, `/info/tablet_ana`, `/lego/DD`.
- **Por qué:** cerrar los hallazgos críticos de `docs/MEJORAS.md` (importe manipulable, XSS, admin sin rol, fuga de datos por Realtime) y dejar red de seguridad (tests, typecheck, CI) antes de seguir añadiendo funcionalidad.
- **Archivos tocados:** `src/lib/*`, `src/pages/api/*`, `src/pages/admin/**`, `src/pages/projects/[slug].astro`, `src/pages/index.astro`, `src/pages/404.astro`, `src/middleware.ts`, `src/layouts/*`, `src/components/**`, `supabase/**`, `tests/**`, `.github/**`, `ecosystem.config.cjs`, `package.json`, `.env.example`, `eslint.config.js`, `vitest.config.ts`, `docs/**`, `README.md`.
- **Impacto:**
  - **Comportamiento nuevo:** las aportaciones no suman ni aparecen hasta que la familia las confirma en el backoffice; los mensajes no se publican hasta aprobarlos.
  - **Antes de desplegar:** añadir `ADMIN_EMAILS` (o el rol) para no quedarse fuera del backoffice; aplicar las migraciones (la de RLS, después del deploy); desactivar el alta libre en Supabase Auth.
  - Hasta aplicar la migración de broadcast no hay actualizaciones en tiempo real (la página sigue funcionando al recargar).
  - Layout de producción nuevo (`releases/` + `current`); el primer deploy recrea el proceso PM2.

---

## [2026-09-22] — Revisión completa + graphify + RTK

- **Qué cambió:** Revisión completa del proyecto (seguridad, correctitud, infra, docs) registrada en `docs/MEJORAS.md` (28 hallazgos nuevos, estado de los 15 anteriores y orden de ataque). Instalado **graphify** (grafo de conocimiento en `graphify-out/`, sección `## graphify` en `CLAUDE.md` y hooks `PreToolUse` en `.claude/settings.json`) e **RTK** (binario `rtk` 0.48 vía winget, instrucciones en `CLAUDE.md`, filtros en `.rtk/filters.toml`).
- **Por qué:** Detectar riesgos antes de seguir añadiendo funcionalidad y reducir el coste en tokens de las sesiones de Claude Code (el grafo evita re-escanear el repo; RTK comprime la salida de comandos).
- **Archivos tocados:** `docs/MEJORAS.md`, `docs/CHANGELOG.md`, `docs/FILE-MAP.md`, `docs/COMMANDS.md`, `docs/STACK.md`, `CLAUDE.md`, `.claude/settings.json`, `.rtk/filters.toml` (nuevo), `graphify-out/` (nuevo).
- **Impacto:** Sin cambios en código de producción. El hook global de RTK (`rtk init -g`) queda pendiente de ejecutar a mano (modifica `~/.claude/settings.json`). Ver MEJORAS N-01…N-05 antes de cualquier otro desarrollo.

---
## [2026-04-21] — Banner de proyecto completado + sistema de toast

- **Qué cambió:** Cuando `project_status === 'completed'` se muestra una sección celebratoria animada (emojis flotantes CSS, trofeo con animación spring, importe recaudado en grande, mensaje de agradecimiento). Se reemplazaron los 5 `alert()` nativos de `ContributionModal` y `ContributionLevels` por un sistema de toast global (`window.showToast`) definido en `BaseLayout`, con tipos `success / error / warning / info` y animación slide-in.
- **Por qué:** Los `alert()` bloqueantes son mala UX. La pantalla de completado hace que el proyecto "tenga cierre" y celebra el logro colectivo.
- **Archivos tocados:** `src/pages/projects/[slug].astro`, `src/layouts/BaseLayout.astro`, `src/components/ContributionModal.astro`, `src/components/ContributionLevels.astro`
- **Impacto:** Ningún breaking change. `window.showToast(mensaje, tipo, duración)` disponible globalmente en todas las páginas públicas.

---

## [2026-04-21] — Logotipo SVG con branding + integración en la app

- **Qué cambió:** Creado logotipo SVG con badge redondeado en gradiente naranja-rojo (colores de marca), cintas de regalo como marca de agua y letras "GC". Integrado en: **Header** (badge brand como link a `/`, con drop-shadow y hover animado), **Footer** (versión horizontal sobre fondo oscuro), **Admin sidebar** (badge índigo como link a `/admin`), **Página de login** (badge índigo centrado reemplazando el ⚙️). Añadida sección "Logotipo" al design system con 6 variantes de color (Brand, Índigo, Esmeralda, Uva, Solar, Océano), iconmarks, variantes sobre fondo oscuro, y versión animada con canvas (gradiente vivo, shine sweep, lazo flotante, partículas, texto con breathing effect).
- **Por qué:** El proyecto carecía de identidad visual consistente. El "GC" era un círculo gris sin personalidad.
- **Archivos tocados:** `public/favicon.svg`, `public/logo-preview.svg`, `src/layouts/Header.astro`, `src/layouts/Footer.astro`, `src/layouts/AdminLayout.astro`, `src/pages/admin/login.astro`, `src/pages/design-system.astro`
- **Impacto:** Ningún breaking change. Gradiente IDs únicos por componente para evitar conflictos en el mismo documento.

---

## [2026-04-21] — Favicon SVG con branding del proyecto

- **Qué cambió:** Reemplazado el favicon por defecto de Astro por un SVG con el iconmark del proyecto (badge naranja-rojo con regalo y lazo). Añadidas las `<link rel="icon">` que faltaban en `BaseLayout`, `AdminLayout` y `login.astro`.
- **Por qué:** La pestaña del navegador mostraba el logo de Astro.
- **Archivos tocados:** `public/favicon.svg`, `src/layouts/BaseLayout.astro`, `src/layouts/AdminLayout.astro`, `src/pages/admin/login.astro`
- **Impacto:** Ninguno.

---

## [2026-04-21] — Gestión de emoji options desde el backoffice

- **Qué cambió:** La página de edición de proyectos (`/admin/projects/[id]/edit`) incluye una nueva sección "Emojis del modal de contribución" que lista los emojis actuales del proyecto y permite añadir o eliminar opciones. Las acciones `add_emoji` y `delete_emoji` actualizan la columna JSONB `emoji_options` de `project_config`.
- **Por qué:** Los admins necesitaban personalizar qué emojis aparecen en el modal de contribución sin tocar la base de datos directamente.
- **Archivos tocados:** `src/pages/admin/projects/[id]/edit.astro`
- **Impacto:** Ningún breaking change. Proyectos sin `emoji_options` siguen usando el fallback del sistema.

---

## [2026-04-21] — Ocultar proyectos cancelados en parte pública

- **Qué cambió:** `getProjectsConfig()` excluye proyectos con `status = 'cancelled'`. La ruta `/projects/[slug]` redirige a `/` si el proyecto está cancelado, bloqueando el acceso directo por URL.
- **Por qué:** Proyectos cancelados no deben ser visibles públicamente pero sí gestionables desde el backoffice.
- **Archivos tocados:** `src/lib/supabase.ts`, `src/pages/projects/[slug].astro`
- **Impacto:** Ningún breaking change. Los proyectos cancelados siguen existiendo en BD y aparecen en `/admin`.

---

## [2026-04-21] — Design system aplicado a todos los componentes

- **Qué cambió:** Sustituidos todos los colores, tipografías, radios, sombras y transiciones hardcodeados por variables CSS del design system (`tokens.css`) en Header, Footer, ProductCard, ProgressSection, ContributionLevels, BaseLayout y todas las páginas del backoffice. Fix de layout: `box-sizing: border-box` global en AdminLayout con `is:global`; `min-width: 0` y `width: 100%` en formularios admin para evitar overflow de grid.
- **Por qué:** Consistencia visual y facilidad de cambio de tema desde un único fichero.
- **Archivos tocados:** `src/layouts/BaseLayout.astro`, `Header.astro`, `Footer.astro`, `AdminLayout.astro`, `src/components/ContributionLevels.astro`, `ProductCard.astro`, `ProgressSection.astro`, `src/pages/admin/**`
- **Impacto:** Ningún breaking change visual. Los valores son equivalentes a los anteriores.

---

## [2026-04-21] — Design system: tokens CSS y página showcase

- **Qué cambió:** Creado `src/styles/tokens.css` con todas las variables CSS del proyecto (colores de marca, UI, admin, tipografía, espaciado, bordes, sombras, transiciones, z-index, layout). Creada página `/design-system` con showcase visual completo.
- **Por qué:** Centralizar magic numbers dispersos en componentes.
- **Archivos tocados:** `src/styles/tokens.css` (nuevo), `src/pages/design-system.astro` (nuevo)
- **Impacto:** Ninguno en producción. La página `/design-system` es pública pero solo para uso interno de desarrollo.

---

## [2026-04-21] — Backoffice de administración

- **Qué cambió:** Implementación de panel de administración protegido con Supabase Auth.
- **Por qué:** Necesidad de crear y editar proyectos sin tocar código ni Supabase directamente.
- **Archivos tocados:** `src/middleware.ts`, `src/env.d.ts`, `src/lib/supabase-server.ts`, `src/layouts/AdminLayout.astro`, `src/pages/admin/login.astro`, `src/pages/admin/index.astro`, `src/pages/admin/logout.astro`, `src/pages/admin/projects/new.astro`, `src/pages/admin/projects/[id]/edit.astro`
- **Impacto:** Nueva variable de entorno requerida: `SUPABASE_SERVICE_ROLE_KEY`. Añadir también al secret `ENV_LOCAL` de GitHub Actions.

## [2026-04-21] — Documentación inicial generada por Claude Code

- **Qué cambió:** Creación de la carpeta `/docs` con documentación completa del proyecto.
- **Por qué:** Análisis exhaustivo del proyecto para facilitar el trabajo en sesiones futuras sin necesidad de releer todo el código.
- **Archivos tocados:** `docs/README.md`, `docs/STACK.md`, `docs/INFRA.md`, `docs/ARCHITECTURE.md`, `docs/FILE-MAP.md`, `docs/DATA-MODEL.md`, `docs/API.md`, `docs/COMMANDS.md`, `docs/CHANGELOG.md`, `docs/GLOSSARY.md`, `CLAUDE.md`
- **Impacto:** Solo documentación — sin cambios en código de producción.
