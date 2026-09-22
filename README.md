# Gallardo Crowdfunding

Plataforma de crowdfunding familiar: cada proyecto tiene su página pública con progreso, niveles de aportación,
lista de contribuidores en tiempo real y muro de mensajes. Los pagos son offline (Bizum, efectivo, transferencia)
y la familia los confirma desde un backoffice.

**Producción:** https://gc.gallardcode.com

## Stack

Astro 5 (SSR, adapter Node) · React 19 (islands) · Supabase (Postgres + RLS, Auth, Realtime Broadcast, Storage) · Zod · Vitest · GitHub Actions + PM2.

## Arrancar en local

```bash
npm install
cp .env.example .env     # credenciales de Supabase (ver docs/INFRA.md)
npm run dev              # http://localhost:4321
```

## Comandos

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run check` | Comprobación de tipos (`astro check`) |
| `npm run lint` | ESLint |
| `npm test` | Tests unitarios (Vitest) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Servir el build |

## Documentación

Toda la documentación vive en [`docs/`](docs/README.md): stack, infraestructura y despliegue, arquitectura y flujos,
mapa de archivos, modelo de datos y migraciones, API, comandos, changelog y registro de mejoras.

Las migraciones de base de datos están en [`supabase/migrations/`](supabase/README.md).
