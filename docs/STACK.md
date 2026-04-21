# Stack Tecnológico

## Tabla resumen

| Categoría | Herramienta | Versión | Propósito |
|-----------|-------------|---------|-----------|
| Framework web | Astro | ^5.12.9 | SSR, routing, componentes `.astro` |
| UI interactiva | React | ^19.1.0 | Islands interactivos (lista de contribuidores, mensajes) |
| UI React DOM | React DOM | ^19.1.0 | Renderizado React en el cliente |
| Adaptador SSR | @astrojs/node | ^9.4.0 | Servidor Node.js standalone (producción) |
| Integración React | @astrojs/react | ^4.3.0 | Integración oficial de React en Astro |
| BaaS / DB | Supabase JS | ^2.50.4 | Base de datos PostgreSQL, Realtime, Storage |
| Pagos (instalado) | Stripe | ^18.3.0 | TBD — instalado pero no integrado aún |
| Lenguaje | TypeScript | vía Astro | Tipado estático en toda la app |
| Estilos | CSS vanilla | — | `public/styles/global.css` + `<style>` por componente |
| Fuentes | Google Fonts | — | Poppins (300, 400, 600, 700) |
| Runtime | Node.js | 22 (CI/CD) | Servidor de producción |
| Gestor de paquetes | npm | — | `package-lock.json` presente |

## Detalles

### Astro 5.x — modo SSR
- `output: 'server'` → todas las páginas son SSR por defecto.
- `export const prerender = false` en páginas dinámicas.
- Adaptador `@astrojs/node` en modo `standalone` → genera `dist/server/entry.mjs`.
- Integración `@astrojs/react` para Islands de React.

### React 19
- Usado únicamente en componentes interactivos (`client:load`):
  - `ContributorsList.tsx` — lista en tiempo real
  - `SupportMessageSection.tsx` — muro de mensajes de apoyo
  - `Spinner.tsx` — componente de carga

### Supabase
- Cliente creado en `src/lib/supabase.ts` con `createClient`.
- `persistSession: false` → no se gestiona autenticación de usuarios.
- Realtime habilitado para la tabla `contributions`.
- Storage usado para fotos del proyecto en `project-assets/projects/{id}/fotoFami/`.

### TypeScript
- Configurado vía `tsconfig.json`.
- Todos los tipos de dominio definidos en `src/lib/supabase.ts`.
- Sin herramienta de lint o formateo configurada en `package.json` (TBD).

### Stripe
- Instalado como dependencia (`stripe: ^18.3.0`) pero sin uso real en el código.
- Probablemente planeado para pagos con tarjeta en el futuro.
