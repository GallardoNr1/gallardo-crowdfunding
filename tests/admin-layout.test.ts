import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import AdminLayout from '../src/layouts/AdminLayout.astro';

describe('AdminLayout', () => {
  it('renders the mobile hamburger, the drawer and its backdrop with matching ids', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(AdminLayout, {
      props: { title: 'Proyectos' },
      slots: { default: '<p>contenido</p>' },
    });
    expect(html).toContain('id="adminMenuToggle"');
    expect(html).toContain('aria-controls="adminSidebar"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('id="adminSidebar"');
    expect(html).toContain('id="adminSidebarClose"');
    expect(html).toContain('id="adminSidebarBackdrop"');
    expect(html).toContain('contenido');
  });
});
