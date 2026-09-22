# Stack Tecnológico

## Tabla resumen

| Categoría | Herramienta | Versión | Propósito |
|-----------|-------------|---------|-----------|
| Framework web | Astro | ^5.18 | SSR, routing, componentes `.astro`, endpoints `/api/*` |
| UI interactiva | React + React DOM | ^19.3 | Islands: lista de contribuidores, muro de mensajes |
| Adaptador SSR | @astrojs/node | ^9.5 | Servidor Node standalone (`dist/server/entry.mjs`) |
| Integración React | @astrojs/react | ^4.4 | Islands de React en Astro |
| BaaS / DB | @supabase/supabase-js | ^2.117 | Postgres (RLS), Auth, Realtime Broadcast, Storage |
| Validación | zod | ^4 | Cuerpos HTTP, formularios del backoffice y variables de entorno |
| IA | @anthropic-ai/sdk | ^0.128 | Borrador de proyecto en el backoffice (`POST /admin/api/draft-project`, `claude-opus-5` con salida estructurada) |
| Lenguaje | TypeScript | ^5.9 | `tsconfig` estricto; `astro check` en CI |
| Tests | vitest | ^5 | Unitarios de `src/lib` (`tests/`) |
| Tests (DOM) | happy-dom | ^20 (dev) | Entorno DOM para los scripts del navegador del alta (`tests/client-forms.test.ts`) |
| Lint / formato | eslint 10 + typescript-eslint + eslint-plugin-astro, prettier + prettier-plugin-astro | — | `npm run lint`, `npm run format` |
| Tipos Astro | @astrojs/check | ^0.9 | `npm run check` |
| Estilos | CSS vanilla | — | `public/styles/global.css`, `src/styles/tokens.css`, `<style>` por componente |
| Fuentes | Google Fonts | — | Poppins (público), Inter (backoffice) |
| Runtime | Node.js | 22 | Local, CI y producción (nvm en el VPS) |
| Proceso | PM2 | — | `ecosystem.config.cjs`, modo cluster, `startOrReload` |
| Gestor de paquetes | npm | 10 | `package-lock.json`; `npm ci` en CI |
| Dependencias | Dependabot | — | Semanal (npm + GitHub Actions); majors de Astro excluidos |

Eliminados en 2026-09: `stripe`, `@types/stripe` (sin uso), `@astrojs/vercel` (se despliega con el adapter Node).

## Detalles

### Astro 5.x — modo SSR
- `output: 'server'`, adapter `@astrojs/node` en modo `standalone`.
- Todas las páginas llevan `export const prerender = false`.
- Los endpoints de `src/pages/api/` exportan `POST` (y `ALL` → 405).
- `src/middleware.ts` corre en todas las peticiones.
- **Aviso:** `npm audit` sigue marcando avisos en `astro`, `@astrojs/node`, `esbuild` (solo dev) y `sharp` que
  requieren saltar a Astro 7 / @astrojs/node 11; es un cambio de major planificado aparte.

### React 19
- Solo en `client:load`: `ContributorsList.tsx`, `SupportMessageSection.tsx`, `Spinner.tsx`.
- Ambos islands reciben `projectId` y se suscriben a Broadcast con `subscribeToProjectEvents`.

### Supabase
- `src/lib/supabase.ts`: cliente **anon** (lecturas, broadcast). Compartido por SSR y navegador.
- `src/lib/supabase-server.ts`: cliente **service_role** (solo servidor).
- Realtime Broadcast desde triggers (`realtime.send`), topic `project:<id>`.
- Storage: fotos en `project-assets/projects/{id}/fotoFami/`.
- Migraciones en `supabase/migrations/` (ver `supabase/README.md`).

### Zod 4
- `src/lib/schemas.ts` (entrada de endpoints y formularios), `src/lib/env-schema.ts` (arranque).
- Los tipos se infieren de los esquemas (`z.infer`), no se duplican.

### Tests y calidad
- `tests/*.test.ts` cubren `env-schema`, `schemas`, `project-form`, `rate-limit`, `api`, `authz`, `format`, `html`.
- CI ejecuta `check`, `lint`, `test` y `build` en cada PR; el deploy exige `verify` en verde.

### Tooling de desarrollo (no se despliega)
| Herramienta | Versión | Propósito |
|-------------|---------|-----------|
| graphify (`graphifyy`, pipx) | 0.9.46 | Grafo de conocimiento del repo en `graphify-out/` para consultas de Claude Code |
| rtk (winget `rtk-ai.rtk`) | 0.48.0 | Compresión de la salida de comandos para ahorrar tokens |
