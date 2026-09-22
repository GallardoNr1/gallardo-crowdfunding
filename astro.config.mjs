// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  base: '/',
  security: {
    // Detrás de nginx la URL que ve Node es http://127.0.0.1:5025 y no coincide con el Origin
    // https://gc.gallardcode.com, así que el checkOrigin de Astro rechazaba todos los formularios
    // ("Cross-site POST form submissions are forbidden"). El CSRF queda cubierto por las cookies
    // SameSite=Lax de la sesión admin. Para reactivarlo, nginx debe enviar X-Forwarded-Proto y Host.
    checkOrigin: false,
  },
});