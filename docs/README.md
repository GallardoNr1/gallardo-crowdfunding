# Gallardo Crowdfunding — Documentación

## Resumen ejecutivo

Plataforma web de crowdfunding familiar, diseñada para que la familia Gallardo cree campañas de recaudación para regalos colectivos. Cada proyecto tiene su propia página pública donde los contribuidores pueden ver el progreso, seleccionar un nivel de aportación y registrar su contribución (Bizum, efectivo o transferencia). Las actualizaciones aparecen en tiempo real mediante Supabase Realtime.

**URL de producción:** `https://gc.gallardcode.com`

### Arrancar en 3 comandos
```bash
npm install
cp .env.example .env   # rellenar con credenciales de Supabase
npm run dev            # http://localhost:4321
```

---

## Índice de documentos

| Documento | Contenido |
|-----------|-----------|
| [STACK.md](STACK.md) | Lenguajes, frameworks, librerías y herramientas con versiones |
| [INFRA.md](INFRA.md) | Infraestructura local y producción, CI/CD, variables de entorno |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Patrón arquitectónico, capas, diagramas de flujo |
| [FILE-MAP.md](FILE-MAP.md) | Mapa de archivos — qué tocar para cada cambio |
| [DATA-MODEL.md](DATA-MODEL.md) | Esquema de base de datos, diagrama ER, tablas y relaciones |
| [API.md](API.md) | Endpoints expuestos, métodos, payloads y respuestas |
| [COMMANDS.md](COMMANDS.md) | Comandos de desarrollo, build, deploy y utilidades |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios |
| [GLOSSARY.md](GLOSSARY.md) | Términos del dominio y conceptos clave |
