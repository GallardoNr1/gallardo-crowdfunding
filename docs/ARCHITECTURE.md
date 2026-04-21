# Arquitectura

## Patrón arquitectónico

**Monolito modular con Islands Architecture** (patrón nativo de Astro).

- El servidor renderiza HTML completo en cada petición (SSR).
- Los componentes interactivos se "hidratan" en el cliente como React Islands (`client:load`).
- No hay separación frontend/backend en repositorios distintos — todo convive en un único proyecto.

## Capas y responsabilidades

| Capa | Directorio | Responsabilidad |
|------|-----------|-----------------|
| **Páginas** | `src/pages/` | Routing, SSR, composición de componentes, fetch de datos inicial |
| **Layouts** | `src/layouts/` | HTML shell, Header, Footer, modal global de contribución |
| **Componentes Astro** | `src/components/` | Secciones de la UI (ProductCard, ProgressSection, etc.) |
| **Islands React** | `src/components/react/` | UI interactiva con estado: lista en tiempo real, mensajes |
| **UI atómicos** | `src/components/UI/` | Componentes reutilizables (Modal, CloseButton, Spinner) |
| **Data layer** | `src/lib/supabase.ts` | Toda la lógica de acceso a datos — queries, inserts, realtime |
| **Helpers** | `src/helpers/` | Utilidades puras (formateo de fechas) |
| **Assets** | `public/` | CSS global, imágenes estáticas |

## Diagrama de componentes

```mermaid
graph TD
    subgraph Pages
        Index["/index.astro<br/>Lista de proyectos"]
        Slug["/projects/[slug].astro<br/>Detalle del proyecto"]
        API["/api/data.json.ts<br/>Endpoint JSON legado"]
    end

    subgraph Layouts
        BaseLayout["BaseLayout.astro<br/>HTML + Header + ContributionModal"]
        Header["Header.astro"]
        Footer["Footer.astro"]
    end

    subgraph Components_Astro
        ProductCard["ProductCard.astro"]
        ProgressSection["ProgressSection.astro"]
        ContributionLevels["ContributionLevels.astro"]
        FamilyPhotos["FamilyPhotos.astro"]
        MessageSection["MessageSection.astro"]
        ContributionModal["ContributionModal.astro"]
    end

    subgraph React_Islands
        ContributorsList["ContributorsList.tsx<br/>(client:load)"]
        SupportMessageSection["SupportMessageSection.tsx<br/>(client:load)"]
        Spinner["Spinner.tsx"]
    end

    subgraph DataLayer
        Supabase["src/lib/supabase.ts<br/>Queries + Mutations + Realtime"]
        DB[(Supabase DB)]
        RT[Supabase Realtime]
        Storage[Supabase Storage]
    end

    Index --> BaseLayout
    Slug --> BaseLayout
    BaseLayout --> Header
    BaseLayout --> ContributionModal
    Slug --> ProductCard
    Slug --> ProgressSection
    Slug --> ContributionLevels
    Slug --> FamilyPhotos
    Slug --> MessageSection
    Slug --> ContributorsList
    MessageSection --> SupportMessageSection
    SupportMessageSection --> Spinner

    Slug --> Supabase
    BaseLayout --> Supabase
    ContributionModal -->|client-side import| Supabase
    ContributorsList -->|subscribeToContributions| RT
    Supabase --> DB
    Supabase --> RT
    Supabase --> Storage
```

## Flujos principales

### Flujo 1: Cargar una página de proyecto

```mermaid
sequenceDiagram
    participant Browser
    participant AstroSSR as Astro SSR [slug].astro
    participant SupabaseLib as src/lib/supabase.ts
    participant DB as Supabase DB

    Browser->>AstroSSR: GET /projects/mi-proyecto
    AstroSSR->>SupabaseLib: getProjectBySlug(slug)
    AstroSSR->>SupabaseLib: getContributionLevels(id)
    AstroSSR->>SupabaseLib: getPublicContributions(id)
    AstroSSR->>SupabaseLib: getFamilyMembers(id)
    AstroSSR->>SupabaseLib: getImagesFromFolder(id)
    SupabaseLib->>DB: Queries en paralelo
    DB-->>SupabaseLib: Datos
    SupabaseLib-->>AstroSSR: Datos tipados
    AstroSSR-->>Browser: HTML completo
    Browser->>Browser: Hidratar ContributorsList React Island
    Browser->>DB: WebSocket Realtime (contributions)
```

### Flujo 2: Registrar una contribución

```mermaid
sequenceDiagram
    participant User
    participant ContribLevels as ContributionLevels.astro
    participant Modal as ContributionModal.astro (JS client)
    participant SupabaseLib as supabase.ts (client-side)
    participant DB as Supabase DB
    participant ContribList as ContributorsList.tsx

    User->>ContribLevels: Clic en nivel (ej. "Paladín")
    ContribLevels->>Modal: CustomEvent "levelSelected"
    Modal->>User: Abre modal con formulario
    User->>Modal: Rellena nombre, email, método de pago
    User->>Modal: Submit
    Modal->>SupabaseLib: createContribution(data)
    SupabaseLib->>DB: INSERT contributions
    DB-->>SupabaseLib: OK
    SupabaseLib->>DB: RPC increment_project_current_amount
    DB-->>SupabaseLib: nuevo current_amount
    SupabaseLib-->>Modal: { success: true }
    Modal->>Modal: CustomEvent "contributionCompleted"
    Modal->>User: Alert + cierre
    DB-->>ContribList: Realtime INSERT event
    ContribList->>ContribList: Añade contribuidor a la lista
```

### Flujo 3: Enviar mensaje de apoyo

```mermaid
sequenceDiagram
    participant User
    participant SupportForm as SupportMessageFrom.astro
    participant SupabaseLib as supabase.ts (client-side)
    participant DB as Supabase DB
    participant SupportSection as SupportMessageSection.tsx

    User->>SupportForm: Escribe nombre, email y mensaje
    User->>SupportForm: Envía
    SupportForm->>SupabaseLib: createSupportMessage(data)
    SupabaseLib->>DB: SELECT contributions (findContribution)
    DB-->>SupabaseLib: ¿es contribuidor?
    SupabaseLib->>DB: INSERT support_messages (is_approved: true)
    DB-->>SupabaseLib: OK
    SupabaseLib-->>SupportForm: { success: true }
    SupportForm->>SupportSection: CustomEvent "newSupportMessage"
    SupportSection->>SupportSection: Prepend mensaje a la lista
```

## Decisiones de diseño

| Decisión | Justificación |
|----------|---------------|
| SSR completo (no static) | Los datos (contribuciones, progreso) cambian frecuentemente; no se puede prebuildear |
| Supabase Realtime en cliente | Actualizaciones instantáneas sin polling; el cliente se subscribe directamente al canal WS |
| `createContribution` con `payment_status: 'completed'` al insertar | El pago es offline (Bizum/efectivo). La contribución se registra como completada por honor |
| RPC atómica + fallback JS | `increment_project_current_amount` usa función PL/pgSQL para atomicidad; si falla, cae en read+update JS |
| `is_approved: true` por defecto en mensajes | Moderación optimista — todos los mensajes se aprueban automáticamente |
| Sin autenticación de usuario | Plataforma familiar de confianza; no se necesita login |
| Stripe instalado pero inactivo | Preparación para pagos futuros con tarjeta |
