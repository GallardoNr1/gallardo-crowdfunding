import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireProjectInTenant } from '../src/lib/tenants-server';

/** Cliente falso: registra la cadena from().select().eq().eq().maybeSingle() y devuelve `row`. */
function fakeAdmin(row: unknown, error: { message: string } | null = null) {
  const calls: Record<string, unknown[]> = { eq: [] };
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((col: string, val: unknown) => {
      calls.eq!.push([col, val]);
      return chain;
    }),
    maybeSingle: vi.fn(async () => ({ data: row, error })),
  };
  const admin = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
  return { admin, calls, chain };
}

describe('requireProjectInTenant', () => {
  it('returns the project when it belongs to the tenant, filtering by both ids', async () => {
    const row = { id: 'p1', tenant_id: 't1', project_name: 'Bici' };
    const { admin, calls, chain } = fakeAdmin(row);
    const project = await requireProjectInTenant(admin, 'p1', 't1');
    expect(project).toEqual(row);
    expect(calls.eq).toEqual([
      ['id', 'p1'],
      ['tenant_id', 't1'],
    ]);
    expect(chain.select).toHaveBeenCalledWith('*');
  });

  it('returns null when the project is missing, belongs to another tenant or the query fails', async () => {
    expect(
      await requireProjectInTenant(fakeAdmin(null).admin, 'p1', 't1')
    ).toBeNull();
    expect(
      await requireProjectInTenant(
        fakeAdmin(null, { message: 'boom' }).admin,
        'p1',
        't1'
      )
    ).toBeNull();
    expect(
      await requireProjectInTenant(fakeAdmin(null).admin, '', 't1')
    ).toBeNull();
  });
});
