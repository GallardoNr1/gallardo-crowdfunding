import { describe, expect, it } from 'vitest';
import {
  copyName,
  duplicateFamilyMemberPayload,
  duplicateLevelPayload,
  duplicatePayload,
  nextSlug,
  rewriteImageUrl,
  storagePathFromUrl,
} from '../src/lib/project-duplicate';

describe('copyName / nextSlug', () => {
  it('marks the copy in the name', () => {
    expect(copyName('Bici para Máximo')).toBe('Bici para Máximo (copia)');
    expect(copyName('Bici (copia)')).toBe('Bici (copia 2)');
    expect(copyName('Bici (copia 2)')).toBe('Bici (copia 3)');
  });

  it('picks the first free slug', () => {
    const taken = new Set(['bici', 'bici-copia', 'bici-copia-2']);
    expect(nextSlug('bici', (s) => taken.has(s))).toBe('bici-copia-3');
    expect(nextSlug('patines', (s) => taken.has(s))).toBe('patines-copia');
    expect(nextSlug('bici-copia', (s) => taken.has(s))).toBe('bici-copia-3');
  });
});

describe('duplicatePayload', () => {
  const row = {
    id: 'p1',
    tenant_id: 't1',
    tenants: { number: 1, name: 'x' },
    project_name: 'Bici',
    slug: 'bici',
    target_amount: 300,
    current_amount: 120,
    currency: 'EUR',
    project_status: 'completed',
    visibility: 'public',
    project_description: 'desc',
    project_image_url:
      'https://x/storage/v1/object/public/project-assets/projects/p1/cover-1.jpg',
    start_date: '2025-01-01',
    end_date: '2025-02-01',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-05T00:00:00Z',
    page_content: { theme: 'fiesta', pageTitle: 'Hola' },
    emoji_options: [{ value: '🙂', label: 'Amigo' }],
    campaign_mode: 'target',
  };

  it('copies the content and resets ids, amounts, status, dates and visibility', () => {
    const payload = duplicatePayload(row, {
      name: 'Bici (copia)',
      slug: 'bici-copia',
      today: '2026-09-29',
    });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('created_at');
    expect(payload).not.toHaveProperty('updated_at');
    expect(payload).not.toHaveProperty('tenants');
    expect(payload).toMatchObject({
      tenant_id: 't1',
      project_name: 'Bici (copia)',
      slug: 'bici-copia',
      target_amount: 300,
      current_amount: 0,
      project_status: 'paused',
      visibility: 'private',
      start_date: '2026-09-29',
      end_date: null,
      page_content: { theme: 'fiesta', pageTitle: 'Hola' },
      emoji_options: [{ value: '🙂', label: 'Amigo' }],
      campaign_mode: 'target',
    });
  });

  it('strips the level and family member ids and points them to the new project', () => {
    expect(
      duplicateLevelPayload(
        {
          id: 'l1',
          project_id: 'p1',
          name: 'Casco',
          amount: 25,
          created_at: 'x',
          updated_at: 'y',
        },
        'p2'
      )
    ).toEqual({ project_id: 'p2', name: 'Casco', amount: 25 });
    expect(
      duplicateFamilyMemberPayload(
        { id: 'f1', project_id: 'p1', name: 'Ana', created_at: 'x' },
        'p2'
      )
    ).toEqual({ project_id: 'p2', name: 'Ana' });
  });
});

describe('storagePathFromUrl / rewriteImageUrl', () => {
  const url =
    'https://x.supabase.co/storage/v1/object/public/project-assets/projects/p1/cover-1.jpg';

  it('extracts the object path of a public storage url', () => {
    expect(storagePathFromUrl(url, 'project-assets')).toBe(
      'projects/p1/cover-1.jpg'
    );
    expect(
      storagePathFromUrl('https://example.com/foto.jpg', 'project-assets')
    ).toBeNull();
  });

  it('rewrites the project folder only for storage urls of that project', () => {
    expect(rewriteImageUrl(url, 'p1', 'p2')).toBe(
      'https://x.supabase.co/storage/v1/object/public/project-assets/projects/p2/cover-1.jpg'
    );
    expect(
      rewriteImageUrl('https://example.com/foto.jpg', 'p1', 'p2')
    ).toBeNull();
    expect(rewriteImageUrl(url, 'other', 'p2')).toBeNull();
  });
});
