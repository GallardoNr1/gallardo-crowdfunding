# Espacios multiusuario — fase 3 (landing y superadmin) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La home presenta la web (qué es, cómo funciona, qué incluye) y muestra el escaparate de proyectos públicos; el superadmin ve todos los espacios y puede gestionar cualquiera.

**Architecture:** `src/pages/index.astro` pasa a ser una landing con secciones estáticas más `ProjectsList`; `src/pages/admin/espacios/index.astro` lista `tenants` con su dueño (`auth.admin.listUsers`) y número de proyectos, y un `POST` fija la cookie `gc-admin-tenant` que el middleware ya respeta.

**Tech Stack:** el existente. **Rama:** `feat/cuentas`. Spec: §5 y §2 (superadmin) de `docs/superpowers/specs/2026-09-23-espacios-multiusuario-design.md`.

---

### Task 1: Superadmin — `/admin/espacios`
**Files:** `src/pages/admin/espacios/index.astro`

- [ ] Carga `tenants` (todos, orden `created_at desc`), usuarios (`auth.admin.listUsers({ perPage: 1000 })` → email por `owner_user_id`) y recuento de proyectos por `tenant_id`.
- [ ] Tabla: número, nombre (enlace a la portada), email del dueño, proyectos, fecha de alta; botón "Gestionar" (`POST` `_action=enter` + `tenant_number` → cookie `gc-admin-tenant` → `/admin`). Marca el espacio propio.
- [ ] Enlace "Todos los espacios" ya existe en la barra lateral (solo superadmin). Commit.

### Task 2: Landing
**Files:** `src/pages/index.astro`

- [ ] Hero: título "Regalos en familia, entre todos", texto corto, botones "Crea tu crowdfunding" (`/registro`, o `/admin/projects/new` con sesión) y "Ver proyectos" (ancla `#proyectos`).
- [ ] "Cómo funciona" (3 pasos), "Qué incluye" (6 tarjetas: niveles, objetivo o tiempo, temas, mensajes, aportación base, asistente IA).
- [ ] Escaparate `#proyectos` con `ProjectsList` (máx. 12 públicos, activos primero) y texto si no hay.
- [ ] Pie con enlaces a privacidad y acceso (el `Footer` existente). Estilos con tokens y animaciones existentes (`fadeInUp`, `.reveal`).
- [ ] Commit.

### Task 3: Documentación y verificación
**Files:** `docs/API.md`, `docs/FILE-MAP.md`, `docs/CHANGELOG.md`

- [ ] Rutas nuevas y entrada de changelog. `npm test`, `npm run check`, `npm run lint`, `npm run build`. Commit.
