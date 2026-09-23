# Comandos

## Desarrollo

| Comando | Qué hace | Notas |
|---------|----------|-------|
| `npm run dev` | Servidor de desarrollo con hot-reload en `http://localhost:4321` | Necesita `.env` |
| `npm run check` | `astro check`: tipos en `.astro`, `.ts` y `.tsx` | Debe dar 0 errores |
| `npm run lint` | ESLint (config plana en `eslint.config.js`) | 0 errores; los warnings son deuda conocida |
| `npm test` | Vitest sobre `tests/**/*.test.ts` | Funciones puras de `src/lib` |
| `npm run format` | Prettier sobre `src/**` | Opcional; no se ejecuta en CI |
| `npm run build` | Build de producción → `dist/server/entry.mjs` + `dist/client/` | Incrusta las variables del `.env` |
| `npm run preview` | Sirve el build local | Tras `npm run build` |
| `npm start` | `node ./dist/server/entry.mjs` | `HOST`, `PORT` y `NODE_ENV` los pone el entorno (PM2) |

## Variables de entorno — creación rápida local

```bash
cp .env.example .env
# y rellenar PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (y ADMIN_EMAILS)
```

## Base de datos (Supabase)

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push            # aplica supabase/migrations/ pendientes
npx supabase db pull            # vuelca el esquema actual (baseline) a una migración
```

Plantillas de email de Auth (registro, recuperar contraseña, invitación, cambio de email):

```bash
npm run supabase:email-templates -- --dry   # muestra qué enviaría
npm run supabase:email-templates            # aplica supabase/email-templates/ vía Management API
```

Lee `SUPABASE_ACCESS_TOKEN` (token personal de https://supabase.com/dashboard/account/tokens) del entorno o del `.env`
y deduce el proyecto de `PUBLIC_SUPABASE_URL`. El token no lo usa la web: solo hace falta para este comando.

Consultas útiles en el SQL Editor:

```sql
-- políticas RLS activas
select tablename, policyname, roles, cmd from pg_policies where schemaname = 'public' order by tablename;

-- contribuciones pendientes de confirmar
select project_id, contributor_name, amount, created_at from contributions where payment_status = 'pending' order by created_at;

-- diferencia entre current_amount y la suma real
select p.project_name, p.current_amount,
       coalesce((select sum(amount) from contributions c where c.project_id = p.id and c.payment_status = 'completed' and c.is_test = false), 0) as calculado
  from project_config p;

-- dar rol admin a un usuario de Auth
update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb where email = 'tu-email@dominio.com';
```

## Producción (VPS)

```bash
cd /var/www/gallardo-crowdfunding
ls releases/                                   # releases desplegadas (se conservan 3)
readlink current                               # release activa
pm2 status
pm2 logs gallardo-crowdfunding
pm2 startOrReload current/ecosystem.config.cjs --update-env   # recargar sin caída
pm2 save
```

Rollback manual a una release anterior:

```bash
ln -sfn /var/www/gallardo-crowdfunding/releases/<sha-anterior> /var/www/gallardo-crowdfunding/current.tmp \
  && mv -Tf /var/www/gallardo-crowdfunding/current.tmp /var/www/gallardo-crowdfunding/current \
  && pm2 startOrReload /var/www/gallardo-crowdfunding/current/ecosystem.config.cjs --update-env
```

Primera vez en un servidor nuevo: `pm2 startup` para que arranque al reiniciar.

## Endpoints (pruebas rápidas)

```bash
# 400 esperado: datos inválidos
curl -s -X POST http://localhost:4321/api/contributions -H 'content-type: application/json' -d '{}'
# 404 esperado: proyecto inexistente
curl -s -X POST http://localhost:4321/api/support-messages -H 'content-type: application/json' \
  -d '{"projectId":"00000000-0000-4000-8000-000000000000","message":"hola"}'
```

---

## Tooling de Claude Code

### graphify — grafo de conocimiento del repo
```bash
graphify query "¿cómo se registra una contribución?"   # respuesta desde el grafo (sin releer archivos)
graphify path "ContributionModal" "createPendingContribution"  # camino entre dos conceptos
graphify explain "middleware"                            # explicación de un nodo
graphify update .                                        # reconstruir tras cambiar código (solo AST, sin LLM)
```
- Salidas en `graphify-out/`: `graph.html` (interactivo), `GRAPH_REPORT.md`, `graph.json`.
- Desde Claude Code: `/graphify` (rebuild completo) o `/graphify --update`.

### rtk — salida de comandos comprimida (menos tokens)
```bash
rtk git status        # equivalente compacto de git status
rtk npm run build     # filtra el ruido del build
rtk gain              # cuánto se ha ahorrado
```
- El hook automático (reescribe los comandos Bash de Claude) se instala con `rtk init -g --auto-patch` y requiere reiniciar Claude Code.
- Filtros propios del proyecto en `.rtk/filters.toml`.
