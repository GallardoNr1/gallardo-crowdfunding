# Propuesta de Mejoras

Análisis realizado el 2026-04-21. Ordenado por impacto estimado.

---

## 🔴 Críticas (rompen cosas o generan inconsistencias de datos)

### 1. `payment_status: 'completed'` en el momento del insert

**Problema:** Toda contribución se marca como completada al registrarse, aunque el pago real (Bizum, efectivo) no haya ocurrido. Si alguien rellena el formulario y no paga, el proyecto muestra más dinero del que realmente tiene.

**Propuesta:** Insertar con `payment_status: 'pending'` y solo marcar `completed` cuando el administrador confirme el pago (desde un panel sencillo en Supabase o una ruta protegida). El `current_amount` solo debería incrementarse al confirmar.

**Archivos afectados:** `src/lib/supabase.ts` → `createContribution`, `src/components/ContributionModal.astro`

---

### 2. `/api/data.json.ts` llama a funciones sin `project_id`

**Problema:** El endpoint llama a `getProjectConfig()`, `getContributionLevels()` y `getPublicContributions()` sin argumento, mientras que esas funciones ahora esperan un `id`. El endpoint o fallará en runtime o devolverá datos vacíos.

**Propuesta:** O bien actualizar el endpoint para que acepte un `?projectId=` como query param, o bien eliminarlo si ya no se usa (las páginas SSR hacen sus propias queries).

**Archivos afectados:** `src/pages/api/data.json.ts`

---

### 3. Doble declaración de `EmojiOption`

**Problema:** La interfaz `EmojiOption` está declarada dos veces en `src/lib/supabase.ts` (aprox. líneas 76 y 81). TypeScript lo acepta pero es confuso y puede llevar a divergencias futuras.

**Propuesta:** Eliminar el duplicado.

**Archivos afectados:** `src/lib/supabase.ts`

---

## 🟠 Importantes (deuda técnica con impacto en producción)

### 4. Sin sistema de migraciones de base de datos

**Problema:** El esquema de Supabase se gestiona a mano desde el SQL Editor. No hay historial de cambios, no hay forma de reproducir el esquema en otro entorno, y un error puede ser irreversible.

**Propuesta:** Adoptar las migraciones de Supabase CLI:
```bash
supabase init
supabase db diff --use-migra -f nombre_migracion
supabase migration up
```
Guardar los archivos de migración en `supabase/migrations/` dentro del repo.

---

### 5. Sin `.env.example`

**Problema:** Un colaborador nuevo (o uno que reinstale el proyecto) no sabe qué variables de entorno necesita sin leer el código fuente.

**Propuesta:** Crear `.env.example` en la raíz:
```
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```
Y añadir `.env` al `.gitignore` si no está ya.

---

### 6. Stripe instalado pero inactivo

**Problema:** `stripe: ^18.3.0` ocupa espacio en `node_modules`, aparece en auditorías de seguridad y genera confusión sobre si los pagos con tarjeta están implementados.

**Propuesta:** Una de dos:
- **Eliminar** `stripe` de `package.json` hasta que se implemente realmente.
- **Documentar** en `STACK.md` que está preparado para integración futura y crear un issue/ticket de seguimiento.

---

### 7. Moderación de mensajes de apoyo

**Problema:** `is_approved: true` por defecto en todos los mensajes. Cualquiera puede escribir cualquier cosa y aparece públicamente de inmediato.

**Propuesta:** Cambiar el default a `is_approved: false` e implementar un flujo mínimo de aprobación (ej: una ruta protegida por Basic Auth, o gestión directamente desde el dashboard de Supabase con una vista filtrada).

---

## 🟡 Mejoras de calidad (no urgentes pero acumulan deuda)

### 8. Sin linter ni formatter

**Problema:** Sin ESLint y Prettier, el estilo de código puede divergir entre archivos. Ya se ve inconsistencia en el uso de punto y coma, comillas y espaciado.

**Propuesta:**
```bash
npm install -D eslint prettier eslint-plugin-astro @typescript-eslint/parser
```
Añadir scripts en `package.json`:
```json
"lint": "eslint src --ext .ts,.tsx,.astro",
"format": "prettier --write src"
```

---

### 9. `import React from 'react'` en un archivo `.ts`

**Problema:** `src/helpers/timeFormating.ts` importa React (para el hook `useTimeAgo`) en un archivo `.ts` en lugar de `.tsx`. Funciona, pero es semánticamente incorrecto y puede confundir el bundler.

**Propuesta:** Renombrar a `timeFormating.tsx` o separar el hook React en un archivo `.tsx` aparte y dejar solo las funciones puras en `.ts`.

**Archivos afectados:** `src/helpers/timeFormating.ts`

---

### 10. Sin tests

**Problema:** No hay ningún test en el proyecto. Los bugs en lógica de negocio (cálculo de progreso, incremento de `current_amount`, deduplicación de eventos Realtime) son invisibles hasta que llegan a producción.

**Propuesta mínima:** Añadir Vitest para las funciones puras:
```bash
npm install -D vitest
```
Cubrir primero las funciones de `src/helpers/timeFormating.ts` y la lógica de `incrementProjectCurrentAmount`.

---

### 11. Deduplicación de eventos entre Realtime y modal

**Problema:** Cuando un usuario registra una contribución, el evento `contributionCompleted` se emite en `ContributionModal.astro` Y llega por Supabase Realtime a `ContributorsList.tsx`. Hay lógica de deduplicación con `recentKeysRef` pero la clave (`name-amount-message`) no incluye un ID único, por lo que dos contribuciones con el mismo nombre e importe en menos de 5 segundos se descartarían.

**Propuesta:** Usar el `id` de la contribución devuelto por Supabase como clave de deduplicación en lugar de la combinación `name-amount-message`.

**Archivos afectados:** `src/components/react/ContributorsList/ContributorsList.tsx`

---

### 12. `BaseLayout.astro` hace dos queries a Supabase (slug + payment methods)

**Problema:** `BaseLayout.astro` llama a `getProjectBySlug(slug)` y `getPaymentMethods()` en cada render, incluso en páginas que no son de proyecto (ej: la página raíz `/`). En la raíz, `slug` es `undefined`, lo que provoca una query inútil.

**Propuesta:** Mover las queries de `ContributionModal` al layout específico de proyecto (`[slug].astro`) y pasar los datos como props al layout, o usar un guard `if (slug)` antes de hacer la query.

**Archivos afectados:** `src/layouts/BaseLayout.astro`

---

## 🟢 Mejoras de UX / producto (opcionales)

### 13. El modal de éxito usa `alert()` nativo

**Problema:** Tras una contribución exitosa, el modal muestra un `alert('✅ Contribución registrada')` del navegador — muy diferente a la experiencia visual del resto de la UI.

**Propuesta:** Usar el `<Modal>` que ya existe en `src/components/UI/Modal.astro` para mostrar una pantalla de éxito con animación (el CSS de éxito ya está escrito en `ContributionModal.astro`).

---

### 14. Sin favicon personalizado

**Problema:** El favicon es el SVG por defecto de Astro (el cohete).

**Propuesta:** Crear un favicon relacionado con el proyecto (emoji de la familia, letra G, etc.) y reemplazar `public/favicon.svg`.

---

### 15. El endpoint `/api/data.json` no tiene protección ni rate limiting

**Problema:** Cualquiera puede hacer peticiones ilimitadas al endpoint, que a su vez hace queries a Supabase. Con muchas peticiones, se pueden agotar los créditos del plan gratuito de Supabase.

**Propuesta:** Si el endpoint es solo para uso interno/debugging, añadir un check de IP o un API key sencillo. Si no se usa, eliminarlo.

---

## Resumen de prioridades

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | `payment_status` pending en insert | Medio | Crítico |
| 2 | Fix `/api/data.json.ts` | Bajo | Crítico |
| 3 | Eliminar `EmojiOption` duplicado | Muy bajo | Bajo |
| 4 | Migraciones con Supabase CLI | Alto | Alto |
| 5 | Crear `.env.example` | Muy bajo | Alto |
| 6 | Decidir sobre Stripe | Muy bajo | Medio |
| 7 | Moderación de mensajes | Medio | Medio |
| 8 | Añadir ESLint + Prettier | Bajo | Medio |
| 9 | Renombrar `timeFormating.ts` → `.tsx` | Muy bajo | Bajo |
| 10 | Tests con Vitest | Alto | Alto |
| 11 | Deduplicación por ID en Realtime | Bajo | Medio |
| 12 | Queries en BaseLayout | Bajo | Medio |
| 13 | Modal de éxito sin `alert()` | Medio | Alto (UX) |
| 14 | Favicon personalizado | Muy bajo | Bajo |
| 15 | Proteger `/api/data.json` | Bajo | Medio |
