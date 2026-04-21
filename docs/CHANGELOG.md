# Changelog

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
