# Changelog

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
