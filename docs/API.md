# API y Rutas

## Páginas públicas (SSR)

| Método | Ruta | Descripción | Archivo |
|--------|------|-------------|---------|
| GET | `/` | Lista de proyectos (los cancelados no aparecen) | `src/pages/index.astro` |
| GET | `/projects/:slug` | Página de detalle; `404` si no existe, redirige a `/` si está cancelado | `src/pages/projects/[slug].astro` |
| GET | `/design-system` | Showcase del design system, **solo en desarrollo** (404 en producción) | `src/pages/design-system.astro` |
| GET | `*` | Página 404 | `src/pages/404.astro` |

## Backoffice (`/admin/*`, requiere sesión de administrador)

El middleware redirige a `/admin/login` sin sesión válida y a `/admin/login?error=forbidden` si el usuario no es admin.
Todas las acciones son formularios `POST` con un campo oculto `_action`.

| Método | Ruta | Acciones (`_action`) | Archivo |
|--------|------|----------------------|---------|
| GET/POST | `/admin/login` | Iniciar sesión (email + contraseña de Supabase Auth) | `src/pages/admin/login.astro` |
| POST | `/admin/logout` | Revoca la sesión en Supabase y borra cookies | `src/pages/admin/logout.astro` |
| GET | `/admin` | Proyectos con contadores de contribuciones y mensajes pendientes | `src/pages/admin/index.astro` |
| GET/POST | `/admin/projects/new` | Crear proyecto (validado con `parseProjectForm`; slug único) | `src/pages/admin/projects/new.astro` |
| GET/POST | `/admin/projects/:id/edit` | `update_project`, `add_level`, `delete_level`, `add_emoji`, `delete_emoji` | `src/pages/admin/projects/[id]/edit.astro` |
| GET/POST | `/admin/projects/:id/contributions` | `set_status` con `status` ∈ `pending` / `completed` / `failed` (recalcula `current_amount`) | `src/pages/admin/projects/[id]/contributions.astro` |
| GET/POST | `/admin/projects/:id/messages` | `approve`, `unapprove`, `delete` | `src/pages/admin/projects/[id]/messages.astro` |

## Endpoints JSON

Todos responden `Content-Type: application/json`. Errores de validación: `400` con `fields` (`{ campo: mensaje }`).
Otros métodos: `405`. Límite: 10 peticiones por IP cada 10 minutos por endpoint (`429` + `Retry-After`).

### `POST /api/contributions`

Crea una contribución **pendiente**. El importe lo decide el servidor: del nivel (`levelId`) o, si el proyecto tiene `allow_custom_amount`, de `customAmount` (≥ `min_custom_amount`). Se envía exactamente uno de los dos; cualquier campo extra (`amount`) se rechaza. Si la campaña está cerrada (`end_date` pasada o estado no activo) responde `409`.

**Body:**
```json
{
  "projectId": "uuid",
  "levelId": "uuid  (o bien customAmount)",
  "customAmount": 12.5,
  "contributorName": "Ana",
  "contributorEmail": "ana@example.com",
  "contributorEmoji": "💛",
  "message": "opcional, ≤150 caracteres",
  "paymentMethod": "cash | bizum | bank_transfer",
  "isAnonymous": false
}
```

**Respuestas:**

| Código | Cuándo |
|--------|--------|
| `201` | `{ "id", "amount", "level_name", "payment_status": "pending" }` |
| `400` | Datos no válidos (`fields`) |
| `404` | Proyecto inexistente |
| `409` | Proyecto no activo o campaña cerrada por fecha |
| `422` | Nivel no válido / cantidad libre no permitida o bajo mínimo / método de pago no disponible |
| `429` | Demasiadas peticiones |

**Archivo:** `src/pages/api/contributions.ts` → `src/lib/contributions-server.ts`

### `POST /api/support-messages`

Crea un mensaje de apoyo **pendiente de aprobación**. Si `authorEmail` coincide con el de un contribuidor del proyecto, se marca `is_from_contributor` (esto se decide en servidor; el navegador no consulta `contributions`).

**Body:**
```json
{
  "projectId": "uuid",
  "message": "≤200 caracteres",
  "authorName": "opcional, ≤50",
  "authorEmail": "opcional"
}
```

**Respuestas:** `201` con el mensaje creado (`is_approved: false`), `400`, `404` (proyecto inexistente o cancelado), `429`.

**Archivo:** `src/pages/api/support-messages.ts` → `src/lib/support-messages-server.ts`

## Realtime (Broadcast)

Los eventos los emiten triggers de Postgres (`supabase/migrations/20260922100100_realtime_broadcast.sql`) en el topic `project:<project_id>`. El cliente se suscribe con `subscribeToProjectEvents(projectId, handlers)` (`src/lib/supabase.ts`).

| Evento | Cuándo | Payload | Consumidor |
|--------|--------|---------|------------|
| `contribution_completed` | Una contribución pasa a `completed` | `id, project_id, contributor_name (o "Anónimo"), contributor_emoji, amount, level_name, level_emoji, level_color, message, created_at` | `ContributorsList.tsx` |
| `support_message_approved` | Un mensaje pasa a `is_approved = true` | `id, project_id, author_name, author_emoji, message, is_from_contributor, created_at` | `SupportMessageSection.tsx` |

Ningún payload incluye `contributor_email`.

## Eventos del DOM (comunicación entre componentes)

| Evento | Emisor | Receptor | Payload |
|--------|--------|----------|---------|
| `levelSelected` | `ContributionLevels.astro` | `ContributionModal.astro` (abre el modal) | `{ id, name, amount, emoji }` |
| `contributionSubmitted` | `ContributionModal.astro` | `[slug].astro` (confeti) | `{ amount, levelName }` |
| `contributionCompleted` | `ContributorsList.tsx` (al recibir el broadcast) | `[slug].astro` (confeti + aviso, construido con `textContent`) | `{ amount, contributor: { name, emoji, level, message, color } }` |
| `photoSelected` | `FamilyPhotos.astro` | `PhotoLightboxModal.astro` | `{ url }` |
