# Campañas abiertas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soportar campañas "por tiempo" (sin objetivo fijo, con aportación base y cantidad libre) y dejar preparado el proyecto de la bici de Máximo.

**Architecture:** Un `campaign_mode` en `project_config` con cuatro campos auxiliares; la lógica de apertura/cierre y totales vive en `src/lib/campaign.ts` (pura, con tests) y la usan la API, la página pública y el backoffice. La cantidad libre entra por el mismo endpoint (`customAmount` en lugar de `levelId`).

**Tech Stack:** el existente (Astro 5, Zod 4, Vitest, Supabase).

**Rama:** `feat/campana-abierta`. Spec: `docs/superpowers/specs/2026-09-22-campana-abierta-design.md`.

### Task 1: Migración y vista
**Files:** `supabase/migrations/20260922110000_open_campaigns.sql`, `supabase/README.md`, `docs/DATA-MODEL.md`
- [ ] Columnas nuevas con defaults, `check` de `campaign_mode`, vista `public_contributions` recreada con `left join`; bloque `-- down`.
- [ ] Fila en la tabla del README de migraciones. Commit.

### Task 2: Lógica pura y esquemas (TDD)
**Files:** `tests/campaign.test.ts`, `src/lib/campaign.ts`, `tests/schemas.test.ts`, `src/lib/schemas.ts`, `tests/project-form.test.ts`, `src/lib/project-form.ts`, `src/lib/supabase.ts` (tipo `ProjectConfig`)
- [ ] RED/GREEN `isCampaignOpen`, `daysLeft`, `campaignTotals`, `formatEndDate`.
- [ ] RED/GREEN `ContributionInput` con `levelId` xor `customAmount`; `ProjectFormInput` con modo/base/libre y refinamientos.
- [ ] RED/GREEN `parseProjectForm` mapea los campos nuevos. Commit.

### Task 3: Servidor
**Files:** `src/lib/contributions-server.ts`
- [ ] Selección de `campaign_mode, end_date, allow_custom_amount, min_custom_amount`; 409 si cerrada; rama de cantidad libre (422 si no permitida o bajo mínimo; redondeo a 2 decimales; `level_name = 'Aportación libre'`).
- [ ] Smoke con curl: 400 (ambos / ninguno), 404. Commit.

### Task 4: Página pública
**Files:** `src/components/OpenCampaignSection.astro` (nuevo), `src/components/ContributionLevels.astro`, `src/components/ContributionModal.astro`, `src/components/ProductCard.astro`, `src/pages/projects/[slug].astro`, `src/pages/index.astro`
- [ ] `OpenCampaignSection` con totales y cuenta atrás; hero de cierre; `ProductCard.price` opcional.
- [ ] Tarjeta "Otra cantidad" en niveles; modal con `customAmount`; `selectedLevelId` sin `required`.
- [ ] `[slug]`: `open`/`closed`, sección según modo, niveles solo si abierta. Home: tarjeta modo abierto.
- [ ] `npm run check && npm run build`; prueba en navegador. Commit.

### Task 5: Backoffice
**Files:** `src/pages/admin/projects/new.astro`, `src/pages/admin/projects/[id]/edit.astro`, `src/pages/admin/projects/[id]/contributions.astro`, `src/pages/admin/index.astro`
- [ ] Bloque "Tipo de campaña" en ambos formularios (valores ligados en edit). "Aportación libre" en el listado. Recaudado + días en `/admin`. Commit.

### Task 6: Seed de Máximo + docs
**Files:** `supabase/seeds/2026-09-22_maximo_bici.sql`, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/FILE-MAP.md`, `docs/CHANGELOG.md`, `docs/GLOSSARY.md`
- [ ] Seed con textos, niveles, emojis y placeholders marcados. Docs y CHANGELOG. `graphify update .`. Commit.
