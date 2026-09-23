import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Breadcrumbs from '../src/components/Breadcrumbs.astro';

describe('Breadcrumbs', () => {
  it('links every item but the last, which is the current page', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Breadcrumbs, {
      props: {
        items: [
          { label: 'Inicio', href: '/' },
          { label: 'Familia Gallardo', href: '/123456' },
          { label: 'Bici para Máximo', href: '/123456/projects/bici-maximo' },
        ],
      },
    });
    expect(html).toContain('aria-label="Migas"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/123456"');
    expect(html).not.toContain('href="/123456/projects/bici-maximo"');
    expect(html).toMatch(/aria-current="page"[^>]*>Bici para Máximo</);
  });

  it('escapes the labels', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Breadcrumbs, {
      props: { items: [{ label: '<b>x</b>' }] },
    });
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>x</b>');
  });
});
