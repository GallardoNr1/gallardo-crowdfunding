import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  deleteProjectPhoto,
  isSafePhotoName,
  photoStoragePath,
  uploadProjectPhotos,
} from '../src/lib/project-photos-server';

describe('photoStoragePath', () => {
  it('builds a path inside the fotoFami folder with a server-generated name', () => {
    const path = photoStoragePath('p1', 2, {
      name: 'Mi Foto.JPG',
      type: 'image/jpeg',
    });
    expect(path).toMatch(/^projects\/p1\/fotoFami\/\d+-2\.jpg$/);
    expect(
      photoStoragePath('p1', 0, { name: 'x', type: 'image/webp' })
    ).toMatch(/\.webp$/);
  });
});

describe('isSafePhotoName', () => {
  it('accepts plain file names only', () => {
    expect(isSafePhotoName('1758600000000-0.jpg')).toBe(true);
    expect(isSafePhotoName('../cover-1.jpg')).toBe(false);
    expect(isSafePhotoName('a/b.jpg')).toBe(false);
    expect(isSafePhotoName('')).toBe(false);
  });
});

function fakeAdmin() {
  const uploaded: string[] = [];
  const removed: string[][] = [];
  const bucket = {
    upload: vi.fn(async (path: string) => {
      uploaded.push(path);
      return { data: { path }, error: null };
    }),
    remove: vi.fn(async (paths: string[]) => {
      removed.push(paths);
      return { data: null, error: null };
    }),
    getPublicUrl: (path: string) => ({
      data: { publicUrl: `https://cdn.example/${path}` },
    }),
    list: vi.fn(async () => ({ data: [], error: null })),
  };
  const admin = {
    storage: { from: vi.fn(() => bucket) },
  } as unknown as SupabaseClient;
  return { admin, uploaded, removed };
}

function file(name: string, type: string, size = 1000): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('uploadProjectPhotos', () => {
  it('uploads valid images, skips empty entries and reports invalid ones', async () => {
    const { admin, uploaded } = fakeAdmin();
    const result = await uploadProjectPhotos(admin, 'p1', [
      file('a.jpg', 'image/jpeg'),
      file('b.txt', 'text/plain'),
      file('empty.png', 'image/png', 0),
      'not-a-file',
    ]);
    expect(result.uploaded).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/b\.txt/);
    expect(uploaded[0]).toMatch(/^projects\/p1\/fotoFami\/\d+-0\.jpg$/);
  });
});

describe('deleteProjectPhoto', () => {
  it('removes the file inside the project folder and rejects unsafe names', async () => {
    const { admin, removed } = fakeAdmin();
    expect(await deleteProjectPhoto(admin, 'p1', '1-0.jpg')).toEqual({
      ok: true,
    });
    expect(removed).toEqual([['projects/p1/fotoFami/1-0.jpg']]);
    const bad = await deleteProjectPhoto(admin, 'p1', '../cover.jpg');
    expect(bad.ok).toBe(false);
    expect(removed).toHaveLength(1);
  });
});
