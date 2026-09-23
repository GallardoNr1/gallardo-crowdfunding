import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteTenantCompletely } from '../src/lib/tenant-delete-server';

interface Call {
  table: string;
  op: string;
  args: unknown[];
}

/** Cliente falso: registra las operaciones por tabla y simula Storage y Auth admin. */
function fakeAdmin(opts: { failOn?: string; projects?: string[] } = {}) {
  const calls: Call[] = [];
  const removed: string[][] = [];
  const projects = opts.projects ?? ['p1'];

  const chain = (table: string) => {
    const state: { op: string } = { op: 'select' };
    const result = async () => {
      if (opts.failOn === table && state.op === 'delete') {
        return { data: null, error: { message: `boom ${table}` } };
      }
      if (table === 'project_config' && state.op === 'select') {
        return { data: projects.map((id) => ({ id })), error: null };
      }
      return { data: null, error: null };
    };
    const c: Record<string, unknown> = {
      select: vi.fn(() => c),
      delete: vi.fn(() => {
        state.op = 'delete';
        return c;
      }),
      eq: vi.fn((col: string, val: unknown) => {
        calls.push({ table, op: state.op, args: ['eq', col, val] });
        return c;
      }),
      in: vi.fn((col: string, val: unknown) => {
        calls.push({ table, op: state.op, args: ['in', col, val] });
        return c;
      }),
      then: (
        resolve: (v: unknown) => unknown,
        reject?: (e: unknown) => unknown
      ) => result().then(resolve, reject),
    };
    return c;
  };

  const storageBucket = {
    list: vi.fn(async (folder: string) => ({
      data: folder.endsWith('/fotoFami')
        ? [{ name: 'foto-1.jpg' }]
        : [{ name: 'cover-1.jpg' }, { name: 'fotoFami' }],
      error: null,
    })),
    remove: vi.fn(async (paths: string[]) => {
      removed.push(paths);
      return { data: null, error: null };
    }),
  };
  const deleteUser = vi.fn(async () => ({ data: {}, error: null }));

  const admin = {
    from: vi.fn((table: string) => chain(table)),
    storage: { from: vi.fn(() => storageBucket) },
    auth: { admin: { deleteUser } },
  } as unknown as SupabaseClient;

  return { admin, calls, removed, deleteUser };
}

const tenant = {
  id: 't1',
  owner_user_id: 'u1',
  avatar_url:
    'https://x.supabase.co/storage/v1/object/public/avatars/tenants/t1/avatar-1.png',
};

describe('deleteTenantCompletely', () => {
  it('deletes children, projects, files, the tenant and finally the auth user, in that order', async () => {
    const { admin, calls, removed, deleteUser } = fakeAdmin();
    const r = await deleteTenantCompletely(admin, tenant);
    expect(r).toEqual({ ok: true, deleted: { projects: 1, files: 3 } });

    const deletes = calls.filter((c) => c.op === 'delete').map((c) => c.table);
    expect(deletes).toEqual([
      'support_messages',
      'contributions',
      'contribution_levels',
      'family_members',
      'project_config',
      'tenants',
    ]);
    expect(
      calls.find((c) => c.table === 'contributions' && c.op === 'delete')?.args
    ).toEqual(['in', 'project_id', ['p1']]);
    expect(removed.flat().sort()).toEqual([
      'projects/p1/cover-1.jpg',
      'projects/p1/fotoFami/foto-1.jpg',
      'tenants/t1/avatar-1.png',
    ]);
    expect(deleteUser).toHaveBeenCalledWith('u1');
  });

  it('works for a tenant without projects or avatar', async () => {
    const { admin, calls, removed, deleteUser } = fakeAdmin({ projects: [] });
    const r = await deleteTenantCompletely(admin, {
      ...tenant,
      avatar_url: null,
    });
    expect(r).toEqual({ ok: true, deleted: { projects: 0, files: 0 } });
    expect(calls.filter((c) => c.op === 'delete').map((c) => c.table)).toEqual([
      'tenants',
    ]);
    expect(removed).toEqual([]);
    expect(deleteUser).toHaveBeenCalledWith('u1');
  });

  it('stops and reports the error without touching the auth user when a delete fails', async () => {
    const { admin, deleteUser } = fakeAdmin({ failOn: 'contributions' });
    const r = await deleteTenantCompletely(admin, tenant);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/contributions/);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
