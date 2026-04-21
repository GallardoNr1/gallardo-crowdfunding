# Changelog

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
