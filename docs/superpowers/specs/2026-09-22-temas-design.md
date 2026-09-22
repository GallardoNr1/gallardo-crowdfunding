# Temas por proyecto — diseño

**Fecha:** 2026-09-22 · **Estado:** aprobado (temas y alcance elegidos por el usuario).

## Qué

Cada proyecto elige un **tema** que cambia los colores de su página y el juego de emojis decorativos
(títulos de sección, chispas de botones, celebración y confeti). No afecta a los emojis que el administrador
escribe a mano (títulos de `page_content`, niveles, opciones del modal) ni a la home, salvo un toque de color
en cada tarjeta.

## Temas

| id | Nombre | Colores (principal / acción / fondo) | Emojis |
|----|--------|--------------------------------------|--------|
| `fiesta` | 🎉 Fiesta (por defecto, look actual) | rojo #d32f2f / naranja #ff6b35 / gris cálido | 🏰 💝 💬 🌸 🧡 ✨ 🎉🎊🎁⭐ |
| `aventura` | 🚴 Aventura | verde bosque #1b5e20 / verde #388e3c / verde-beige | 🧭 🏕️ 🌲 🌞 🚴 🌿 🏔️⛰️🍃 |
| `navidad` | 🎄 Navidad | rojo #b71c1c / rojo #c62828 / blanco nieve | 🎄 🎁 ❄️ 🦌 🎅 ⭐ 🔔🎉 |
| `fantasia` | 🐉 Fantasía | morado #4a148c / morado #6a1b9a / lila | 🏰 📜 🔮 🛡️ 🐉 ✨ ⚔️🔥🌟 |
| `viaje` | ✈️ Viaje | teal #00838f / coral #ff7043 / arena | 🧳 🗺️ 🌍 ☀️ ✈️ 🌴 🎉 |
| `tecnologia` | 💻 Tecnología | índigo #283593 / índigo #3949ab / gris azulado | 💻 💌 💬 ⚡ 🚀 ⚡ 📱🛰️ |

## Cómo

- **Registro en código** `src/lib/themes.ts`: `THEMES`, `THEME_IDS`, `DEFAULT_THEME_ID = 'fiesta'`, `getTheme(id)` (fallback al defecto), `themeCss()` (genera `html[data-theme="x"] { --token: valor }` para todos los temas).
- **Persistencia** en `page_content.theme` (JSONB existente): sin migración. `normalizeProjectPageContent` devuelve `theme` normalizado. `ProjectFormInput.theme` valida contra `THEME_IDS`.
- **Aplicación**: `[slug].astro` obtiene `theme = getTheme(content.theme)` y lo pasa a `BaseLayout` (`data-theme` en `<html>` + `<style>` con `themeCss()`, icono del modal) y a los componentes que muestran emojis decorativos (`ContributionLevels`, `MessageSection`, `SupportMessageSection`, hero de cierre y confeti de `[slug]`).
- **Colores**: los temas sobrescriben los tokens de marca (`--color-brand-*`, `--color-header-*`, `--color-body-bg-*`, `--color-section-*`). Los componentes públicos que aún usan hex de la paleta actual pasan a esos tokens para que el cambio se vea.
- **Backoffice**: sección "Aspecto" con una tarjeta por tema (nombre, muestra de 3 colores y emojis) en crear y editar.
- **Home**: `--card-accent` con el color principal del tema en cada tarjeta.

## Fuera de alcance

Fuentes por tema, modo oscuro, temas editables desde el backoffice (se añaden en código).

## Pruebas

`tests/themes.test.ts`: todos los temas tienen los mismos tokens y claves de emoji; `getTheme` hace fallback; `themeCss` contiene cada id. Tests de esquema y `project-form` para `theme`. Comprobación manual en dev cambiando el tema de un proyecto.
