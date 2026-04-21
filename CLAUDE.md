# CLAUDE.md — Gallardo Crowdfunding

## Contexto del proyecto

Plataforma de crowdfunding familiar. SSR con Astro 5 + React 19 + Supabase. Deploy en VPS propio con PM2. URL de producción: `https://gc.gallardcode.com`.

## 📚 Regla de documentación obligatoria

Antes de empezar cualquier tarea, LEE primero `/docs/README.md` y navega desde ahí a los documentos relevantes. NO vuelvas a escanear todo el proyecto — la documentación en `/docs` es la fuente de verdad.

Después de CADA cambio en el código (feature, fix, refactor, cambio de config, dependencia nueva, etc.):

1. Actualiza los documentos de `/docs` que se vean afectados:
   - ¿Nuevo endpoint? → `API.md`
   - ¿Nueva variable de entorno? → `INFRA.md`
   - ¿Nueva dependencia? → `STACK.md`
   - ¿Nuevo archivo o carpeta relevante? → `FILE-MAP.md`
   - ¿Cambio de modelo de datos? → `DATA-MODEL.md`
   - ¿Cambio arquitectónico? → `ARCHITECTURE.md`
   - ¿Nuevo comando? → `COMMANDS.md`

2. Añade SIEMPRE una entrada nueva en `/docs/CHANGELOG.md` con el formato:

```
## [YYYY-MM-DD] — Título breve del cambio
- **Qué cambió:** descripción concreta.
- **Por qué:** motivo.
- **Archivos tocados:** lista de paths.
- **Impacto:** módulos afectados / breaking changes / notas para el futuro.
```

Si el cambio introduce una decisión de diseño importante, añade una sección "Decisión" en `ARCHITECTURE.md`.

NUNCA marques una tarea como completada sin haber actualizado la documentación correspondiente. Considera la documentación parte del "Definition of Done".
