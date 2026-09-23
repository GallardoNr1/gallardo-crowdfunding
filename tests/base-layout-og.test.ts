import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import BaseLayout from '../src/layouts/BaseLayout.astro';

const locals = {
  user: null,
  tenant: null,
  isSuperAdmin: false,
  adminTenantOverride: false,
};

describe('BaseLayout Open Graph tags', () => {
  it('emits title, description, absolute url and image for sharing', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
      props: {
        title: 'Bici para Máximo',
        description: 'Ayúdanos a que llegue pedaleando.',
        image: 'https://cdn.example/projects/bici.jpg',
      },
      request: new Request('https://gc.example/328614/projects/bici-maximo', {
        headers: { host: 'gc.example' },
      }),
      locals,
      slots: { default: '<p>contenido</p>' },
    });
    expect(html).toContain('property="og:title" content="Bici para Máximo"');
    expect(html).toContain(
      'property="og:description" content="Ayúdanos a que llegue pedaleando."'
    );
    expect(html).toContain(
      'property="og:url" content="https://gc.example/328614/projects/bici-maximo"'
    );
    expect(html).toContain(
      'property="og:image" content="https://cdn.example/projects/bici.jpg"'
    );
    expect(html).toContain('property="og:type" content="website"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it('falls back to the default image and keeps relative images absolute', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
      props: { title: 'Gallardo Crowdfunding', image: '/img/foto.jpg' },
      request: new Request('https://gc.example/', {
        headers: { host: 'gc.example' },
      }),
      locals,
    });
    expect(html).toContain(
      'property="og:image" content="https://gc.example/img/foto.jpg"'
    );

    const noImage = await container.renderToString(BaseLayout, {
      props: { title: 'Gallardo Crowdfunding' },
      request: new Request('https://gc.example/', {
        headers: { host: 'gc.example' },
      }),
      locals,
    });
    expect(noImage).toContain(
      'property="og:image" content="https://gc.example/og-default.png"'
    );
  });
});
