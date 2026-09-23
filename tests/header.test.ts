import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Header from '../src/layouts/Header.astro';

const tenant = {
  id: 't1',
  number: 123456,
  name: 'Familia Gallardo',
  avatar_url: null,
  created_at: '2026-09-23T00:00:00Z',
};
const user = {
  id: 'u1',
  email: 'ana@example.com',
  app_metadata: {},
  user_metadata: {},
};

describe('Header user menu', () => {
  it('offers login and signup without a session', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
      locals: {
        user: null,
        tenant: null,
        isSuperAdmin: false,
        adminTenantOverride: false,
      },
    });
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/registro"');
    expect(html).not.toContain('action="/logout"');
  });

  it('shows the avatar menu with the space, admin, account and logout entries', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
      locals: { user, tenant, isSuperAdmin: false, adminTenantOverride: false },
    });
    expect(html).toContain('href="/123456"');
    expect(html).toContain('href="/admin"');
    expect(html).toContain('href="/cuenta"');
    expect(html).toContain('action="/logout"');
    expect(html).toContain('FG'); // iniciales como avatar de respaldo
    expect(html).not.toContain('href="/registro"');
  });

  it('uses the avatar photo when the space has one', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
      locals: {
        user,
        tenant: { ...tenant, avatar_url: 'https://cdn.example/avatars/x.jpg' },
        isSuperAdmin: false,
        adminTenantOverride: false,
      },
    });
    expect(html).toContain('src="https://cdn.example/avatars/x.jpg"');
  });
});
