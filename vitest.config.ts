/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig permite importar componentes .astro en los tests (Container API).
export default getViteConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
