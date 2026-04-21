# Comandos

## Desarrollo

### `npm run dev`
Inicia el servidor de desarrollo con hot-reload.
- **Puerto:** `http://localhost:4321`
- **Prerrequisito:** `.env` con las variables de Supabase
- **Cuándo usarlo:** Desarrollo local diario

### `npm run build`
Compila la aplicación para producción. Genera el directorio `dist/`.
- **Salida:** `dist/server/entry.mjs` (SSR) + `dist/client/` (assets)
- **Prerrequisito:** `.env` presente con variables válidas
- **Cuándo usarlo:** Antes de deployar o para verificar que el build funciona

### `npm run preview`
Sirve el build de producción localmente para verificación antes del deploy.
- **Prerrequisito:** Haber ejecutado `npm run build`
- **Cuándo usarlo:** QA final antes de deployar

### `npm run astro`
Acceso directo al CLI de Astro.
- **Ejemplos:** `npm run astro check`, `npm run astro add react`

---

## Producción

### Iniciar servidor en producción
```bash
NODE_ENV=production HOST=127.0.0.1 PORT=5025 node ./dist/server/entry.mjs
```
- Definido en `package.json` como `npm start`

### Reiniciar con PM2
```bash
pm2 restart gallardo-crowdfunding --update-env
```

### Ver logs de PM2
```bash
pm2 logs gallardo-crowdfunding
```

### Estado de PM2
```bash
pm2 status
```

### Guardar configuración PM2 (tras cambios)
```bash
pm2 save
```

---

## Configuración inicial del servidor (primera vez)

```bash
# En el servidor — arrancar por primera vez
cd /var/www/gallardo-crowdfunding
npm ci --omit=dev --legacy-peer-deps
PORT=5025 HOST=127.0.0.1 NODE_ENV=production pm2 start ./server/entry.mjs \
  --name gallardo-crowdfunding --cwd /var/www/gallardo-crowdfunding
pm2 save
pm2 startup  # para que arranque al reiniciar el servidor
```

---

## Variables de entorno — creación rápida local

```bash
cat > .env << 'EOF'
PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY_AQUI
EOF
```

---

## Supabase — comandos útiles en SQL Editor

### Verificar contribuciones por proyecto
```sql
SELECT * FROM contributions WHERE project_id = 'ID_PROYECTO' ORDER BY created_at DESC;
```

### Ver progreso del proyecto
```sql
SELECT * FROM project_overview;
```

### Crear la función RPC atómica (si no existe)
Ver el SQL completo en [DATA-MODEL.md](DATA-MODEL.md#función-rpc-en-supabase).

### Marcar contribución como completada manualmente
```sql
UPDATE contributions
SET payment_status = 'completed', completed_at = now()
WHERE id = 'ID_CONTRIBUCION';
```

---

## Debug en el navegador

El objeto `window.debugCrowdfunding` está disponible en la página de proyecto:

```js
// Simular una contribución completada (activa confeti + notificación)
window.debugCrowdfunding.triggerTestContribution()

// Ver estado de los componentes
window.debugCrowdfunding.getComponentsStatus()
```
