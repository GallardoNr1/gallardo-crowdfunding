# API y Rutas

## Páginas (rutas SSR)

| Método | Ruta | Auth | Descripción | Archivo |
|--------|------|------|-------------|---------|
| GET | `/` | No | Lista de todos los proyectos activos | `src/pages/index.astro` |
| GET | `/projects/:slug` | No | Página de detalle de un proyecto | `src/pages/projects/[slug].astro` |
| GET | `/info/tablet_ana` | No | Página informativa del proyecto tablet Ana | `src/pages/info/tablet_ana/index.astro` |
| GET | `/lego/DD` | No | Página experimental de tema Lego | `src/pages/lego/DD/index.astro` |

## Endpoints de API

### `GET /api/data.json`

> Endpoint legado — devuelve datos combinados del primer proyecto. Creado posiblemente para debugging. Las páginas SSR hacen sus propias queries directamente.

**Auth:** No requerida

**Respuesta 200:**
```json
{
  "projectConfig": { /* ProjectConfig */ },
  "contributionLevels": [ /* ContributionLevel[] */ ],
  "contributions": [ /* PublicContribution[] */ ],
  "familyMembers": [ /* FamilyMember[] */ ]
}
```

**Respuesta 500:**
```json
{ "error": "Failed to fetch data" }
```

**Headers:** `Cache-Control: no-store, max-age=0`

**Archivo:** `src/pages/api/data.json.ts`

---

## Operaciones de datos (client-side via Supabase JS)

Estas operaciones las ejecuta el cliente directamente contra Supabase (no hay backend propio para ellas).

### Crear contribución

**Función:** `createContribution(data)` en `src/lib/supabase.ts`

**Llamada desde:** `ContributionModal.astro` (script de cliente)

**Payload:**
```typescript
{
  contributorName: string;
  contributorEmail: string;
  contributorEmoji: string;
  amount: number;
  levelId?: string;
  levelName: string;
  contributorMessage?: string;
  paymentMethod: 'cash' | 'bizum' | 'bank_transfer';
  isAnonymous: boolean;
  projectId: string;
}
```

**Efectos:** INSERT en `contributions` + RPC `increment_project_current_amount`

---

### Crear mensaje de apoyo

**Función:** `createSupportMessage(data)` en `src/lib/supabase.ts`

**Llamada desde:** `SupportMessageFrom.astro`

**Payload:**
```typescript
{
  author_name: string;
  author_emoji: string;
  author_email: string;  // se usa para buscar si es contribuidor, no se guarda
  message: string;
  project_id: string;
}
```

**Efectos:** INSERT en `support_messages` (is_approved: true automáticamente)

---

## Suscripciones Realtime

| Canal | Tabla | Eventos | Consumidor |
|-------|-------|---------|------------|
| `contributions-changes` | `contributions` | INSERT, UPDATE, DELETE | `ContributorsList.tsx` |
| `support-messages-changes` | `support_messages` | INSERT | TBD (actualmente via CustomEvent) |

---

## Eventos CustomEvent (comunicación entre componentes)

| Evento | Emisor | Receptor | Payload |
|--------|--------|----------|---------|
| `levelSelected` | `ContributionLevels.astro` | `ContributionModal.astro` | `{ id, name, amount, emoji, color, ... }` |
| `contributionCompleted` | `ContributionModal.astro` / `ContributorsList.tsx` | `[slug].astro` (global) | `{ amount, contributor: { name, emoji, level, message, color } }` |
| `newSupportMessage` | `SupportMessageFrom.astro` | `SupportMessageSection.tsx` | `{ action: 'add', message: SupportMessage, timestamp }` |
| `contributionLocalInserted` | `ContributorsList.tsx` | Cualquier listener | `PublicContribution` |
