# Glosario

## Términos del dominio

| Término | Definición |
|---------|------------|
| **Proyecto** | Una campaña de crowdfunding. Tiene una meta monetaria, un producto objetivo, niveles de contribución y una página pública. Ejemplo: "Tablet para el cumpleaños de Ana". |
| **Contribución** | Aportación económica registrada por un contribuidor a un proyecto. Tiene un nivel, un importe y un método de pago. |
| **Nivel de contribución** | Escalón de aportación con nombre, importe, emoji y color. Ejemplo: "Paladín" = 55€. |
| **Contribuidor** | Persona que realiza una aportación. Puede ser anónima o pública. |
| **Meta / Target** | Cantidad monetaria total que se quiere recaudar para el proyecto. |
| **Progreso** | Porcentaje de la meta ya recaudado (`current_amount / target_amount * 100`). |
| **Método de pago** | Forma de pagar la contribución. Actualmente: Bizum, efectivo (cash) o transferencia bancaria. No hay pagos online automáticos. |
| **Mensaje de apoyo** | Texto público que deja un contribuidor o visitante en la página del proyecto. |
| **Miembro de familia** | Persona de la familia Gallardo que aparece en la sección "La Tribu" de la página del proyecto. |
| **Bizum** | Sistema de pago móvil español. El contribuidor envía dinero al número registrado en el proyecto. |
| **Concept (Bizum)** | Texto que el contribuidor debe escribir en el concepto del Bizum para identificar la aportación. |
| **Foto familiar** | Imagen subida a Supabase Storage que se muestra en la galería de la página del proyecto. |
| **Island** | Componente React hidratado en el cliente dentro de una página Astro. Solo los Islands tienen interactividad real. |
| **SSR** | Server-Side Rendering. Cada página se genera en el servidor en cada petición. |
| **Realtime** | Funcionalidad de Supabase que envía actualizaciones de la base de datos al cliente vía WebSocket. Usado para mostrar nuevas contribuciones sin recargar la página. |
| **RPC** | Remote Procedure Call. Función SQL ejecutada en Supabase. Se usa `increment_project_current_amount` para incrementar el total de forma atómica. |
| **Slug** | Identificador legible en la URL del proyecto. Ejemplo: `/projects/tablet-ana`. |
| **page_content** | Campo JSONB en `project_config` que contiene toda la configuración del contenido de la página (textos, CTA, títulos de secciones). |
| **CTA** | Call To Action. Sección al final de la página que invita a contribuir, con estadísticas destacadas. |
| **PM2** | Process Manager 2. Gestor de procesos Node.js usado en producción para mantener el servidor activo. |
| **VPS** | Virtual Private Server. Servidor propio donde se despliega la aplicación. |
| **Anónimo** | Contribuidor que elige no mostrar su nombre en la lista pública. |
| **is_test** | Flag en las contribuciones para marcar aportaciones de prueba y excluirlas de estadísticas. |
| **Campaña con objetivo** | `campaign_mode = 'target'`: meta fija, barra de porcentaje, "faltan X €". |
| **Campaña por tiempo** | `campaign_mode = 'open'`: sin objetivo; se recauda hasta `end_date` (incluido) y se muestra recaudado + aportación base = total, con cuenta atrás. |
| **Aportación base** | Cantidad que pone la familia de entrada (`base_amount`, etiqueta `base_label`). Se suma al total mostrado pero no es una contribución. |
| **Otra cantidad / aportación libre** | Contribución sin nivel: el contribuidor elige el importe (≥ `min_custom_amount`) si el proyecto lo permite. |
| **Cierre por fecha** | Pasado `end_date`, la campaña deja de admitir aportaciones aunque siga `active`; la página muestra el total final. |

## Acrónimos

| Acrónimo | Significado |
|----------|-------------|
| BaaS | Backend as a Service (Supabase) |
| SSR | Server-Side Rendering |
| WS | WebSocket |
| RPC | Remote Procedure Call |
| RLS | Row Level Security (seguridad a nivel de fila en PostgreSQL/Supabase) |
| PM2 | Process Manager 2 |
| VPS | Virtual Private Server |
| CI/CD | Continuous Integration / Continuous Deployment |
| SCP | Secure Copy Protocol (para transferir archivos al servidor en el pipeline) |
| CTA | Call to Action |
| JSONB | JSON Binary (tipo de columna en PostgreSQL para JSON indexable) |
