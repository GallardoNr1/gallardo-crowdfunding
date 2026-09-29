import { describe, expect, it } from 'vitest';
import {
  buildSupporterNetwork,
  supporterBadge,
  supporterBadges,
  supporterFromSession,
  supporterTenantIds,
  supporterTenantToStore,
} from '../src/lib/supporters';

describe('supporterFromSession / supporterTenantToStore', () => {
  it('uses the session space only when asked and not while a superadmin manages another space', () => {
    expect(supporterFromSession({ tenant: { id: 'tA' } }, true)).toBe('tA');
    expect(supporterFromSession({ tenant: { id: 'tA' } }, false)).toBeNull();
    expect(supporterFromSession({ tenant: null }, true)).toBeNull();
    expect(
      supporterFromSession(
        { tenant: { id: 'tA' }, adminTenantOverride: true },
        true
      )
    ).toBeNull();
  });

  it('never stores the project own space as supporter', () => {
    expect(supporterTenantToStore('tA', 'tB')).toBe('tA');
    expect(supporterTenantToStore('tA', 'tA')).toBeNull();
    expect(supporterTenantToStore(null, 'tA')).toBeNull();
  });
});

const rows = [
  {
    id: 'p1',
    project_name: 'Bici',
    slug: 'bici',
    project_image_url: 'https://x/bici.jpg',
    current_amount: 120,
    target_amount: 300,
    campaign_mode: 'target',
    created_at: '2026-09-01T00:00:00Z',
    tenant_id: 'tA',
    project_status: 'active',
    visibility: 'public',
    tenants: { number: 111111, name: 'Familia A', avatar_url: null },
  },
  {
    id: 'p2',
    project_name: 'Patines',
    slug: 'patines',
    project_image_url: null,
    current_amount: 0,
    target_amount: 100,
    campaign_mode: 'open',
    created_at: '2026-09-10T00:00:00Z',
    tenant_id: 'tA',
    project_status: 'active',
    visibility: 'public',
    tenants: { number: 111111, name: 'Familia A', avatar_url: null },
  },
  {
    id: 'p3',
    project_name: 'Privado',
    slug: 'privado',
    project_image_url: null,
    current_amount: 0,
    target_amount: 100,
    campaign_mode: 'target',
    created_at: '2026-09-11T00:00:00Z',
    tenant_id: 'tB',
    project_status: 'active',
    visibility: 'private',
    tenants: {
      number: 222222,
      name: 'Familia B',
      avatar_url: 'https://x/b.png',
    },
  },
  {
    id: 'p4',
    project_name: 'Terminado',
    slug: 'terminado',
    project_image_url: null,
    current_amount: 100,
    target_amount: 100,
    campaign_mode: 'target',
    created_at: '2026-09-12T00:00:00Z',
    tenant_id: 'tB',
    project_status: 'completed',
    visibility: 'public',
    tenants: { number: 222222, name: 'Familia B', avatar_url: null },
  },
  {
    id: 'p5',
    project_name: 'Propio',
    slug: 'propio',
    project_image_url: null,
    current_amount: 0,
    target_amount: 50,
    campaign_mode: 'target',
    created_at: '2026-09-13T00:00:00Z',
    tenant_id: 'tSelf',
    project_status: 'active',
    visibility: 'public',
    tenants: { number: 333333, name: 'Yo mismo', avatar_url: null },
  },
];

describe('supporterTenantIds', () => {
  it('returns distinct ids, skipping nulls and the excluded space', () => {
    expect(
      supporterTenantIds(
        [
          { supporter_tenant_id: 'tA' },
          { supporter_tenant_id: null },
          {},
          { supporter_tenant_id: 'tA' },
          { supporter_tenant_id: 'tSelf' },
          { supporter_tenant_id: 'tB' },
        ],
        'tSelf'
      )
    ).toEqual(['tA', 'tB']);
  });
});

describe('buildSupporterNetwork', () => {
  it('keeps only active public projects of other spaces, newest first, grouped by space', () => {
    const network = buildSupporterNetwork(rows, { excludeTenantId: 'tSelf' });
    expect(network.projects.map((p) => p.id)).toEqual(['p2', 'p1']);
    expect(network.projects[0]).toMatchObject({
      name: 'Patines',
      href: '/111111/projects/patines',
      spaceName: 'Familia A',
      spaceHref: '/111111',
      campaignMode: 'open',
    });
    expect([...network.spaces.keys()]).toEqual(['tA']);
    expect(network.spaces.get('tA')).toMatchObject({
      number: 111111,
      name: 'Familia A',
      href: '/111111',
    });
    expect(network.spaces.get('tA')!.projects).toHaveLength(2);
  });

  it('caps the number of projects and ignores rows without space', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      ...rows[0]!,
      id: `q${i}`,
      created_at: `2026-08-${String(10 + i).padStart(2, '0')}T00:00:00Z`,
    }));
    const network = buildSupporterNetwork(
      [...many, { ...rows[0]!, id: 'sin', tenants: null }],
      { maxProjects: 3 }
    );
    expect(network.projects).toHaveLength(3);
    expect(network.projects[0]!.id).toBe('q9');
  });
});

describe('supporterBadge', () => {
  it('gives the badge only for spaces with active public projects', () => {
    const { spaces } = buildSupporterNetwork(rows, {
      excludeTenantId: 'tSelf',
    });
    expect(supporterBadge(spaces, 'tA')).toEqual({
      name: 'Familia A',
      href: '/111111',
    });
    expect(supporterBadge(spaces, 'tB')).toBeNull();
    expect(supporterBadge(spaces, null)).toBeNull();
    expect(supporterBadge(spaces, undefined)).toBeNull();
  });

  it('serializes the badges for client components', () => {
    const { spaces } = buildSupporterNetwork(rows, {
      excludeTenantId: 'tSelf',
    });
    expect(supporterBadges(spaces)).toEqual({
      tA: { name: 'Familia A', href: '/111111' },
    });
  });
});
