import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ShareButton from '../src/components/ShareButton.astro';

describe('ShareButton', () => {
  it('renders the share button with its data and label', async () => {
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
    expect(html).toContain('aria-label="Compartir 🚴 Una bici para Máximo"');
    expect(html).toContain('>Compartir</span>');
    expect(html).toContain('<circle');
  });

  it('renders only the icon when iconOnly is set, with a relative url', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ShareButton, {
      props: {
        url: '/328614/projects/bici-maximo',
        title: 'Bici',
        iconOnly: true,
      },
    });
    expect(html).toContain('data-share-url="/328614/projects/bici-maximo"');
    expect(html).toContain('share--icon');
    expect(html).not.toContain('>Compartir</span>');
    expect(html).not.toContain('wa.me');
  });
});
