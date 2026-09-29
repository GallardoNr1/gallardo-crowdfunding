import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ProjectsList from '../src/components/ProjectsList.astro';
import type { ProjectConfig } from '../src/lib/supabase';

const project = {
  id: 'p1',
  tenant_id: 't1',
  project_name: 'Bici para Máximo',
  project_description: 'Una bici para el cumple',
  slug: 'bici-maximo',
  target_amount: 300,
  current_amount: 120,
  currency: 'EUR',
  project_status: 'active',
  start_date: '2026-01-01',
  redirect_url: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  campaign_mode: 'target',
  page_content: { theme: 'aventura' },
} as unknown as ProjectConfig;

describe('ProjectsList', () => {
  it('shows the share icon and the QR icon linking to the printable page', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProjectsList, {
      props: {
        items: [{ project, href: '/328614/projects/bici-maximo' }],
      },
    });
    expect(html).toContain('data-share-url="/328614/projects/bici-maximo"');
    expect(html).toContain('share--icon');
    expect(html).toContain('href="/328614/projects/bici-maximo/qr"');
    expect(html).toContain('class="card-qr');
    expect(html).toContain('aria-label="Código QR de Bici para Máximo"');
    // El enlace abre el modal con el QR (y sin JS sigue llevando a /qr).
    expect(html).toContain('data-qr-modal="qr-p1"');
    expect(html).toContain('id="qr-p1-overlay"');
    expect(html).toContain('<svg');
  });
});
