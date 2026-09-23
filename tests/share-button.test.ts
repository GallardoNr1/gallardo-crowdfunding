import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ShareButton from '../src/components/ShareButton.astro';

describe('ShareButton', () => {
  it('renders the share button with its data and a WhatsApp link with the prefilled text', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ShareButton, {
      props: {
        url: 'https://gc.example/328614/projects/bici-maximo',
        title: '🚴 Una bici para Máximo',
        text: 'Ayúdanos a que llegue pedaleando',
      },
    });
    expect(html).toContain(
      'data-share-url="https://gc.example/328614/projects/bici-maximo"'
    );
    expect(html).toContain('data-share-title="🚴 Una bici para Máximo"');
    expect(html).toContain('aria-label="Compartir este proyecto"');
    expect(html).toContain('https://wa.me/?text=');
    expect(html).toContain(
      encodeURIComponent('https://gc.example/328614/projects/bici-maximo')
    );
    expect(html).toContain('<circle');
  });
});
