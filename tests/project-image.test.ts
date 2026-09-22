import { describe, expect, it } from 'vitest';
import { imageStoragePath, validateImageFile } from '../src/lib/project-image-server';

describe('validateImageFile', () => {
  it('accepts jpeg, png, webp and gif under 5 MB', () => {
    expect(validateImageFile({ name: 'a.png', type: 'image/png', size: 1000 })).toEqual({ ok: true });
    expect(validateImageFile({ name: 'a.webp', type: 'image/webp', size: 4 * 1024 * 1024 })).toEqual({
      ok: true,
    });
  });

  it('rejects other types and files over 5 MB, naming the problem', () => {
    const pdf = validateImageFile({ name: 'a.pdf', type: 'application/pdf', size: 10 });
    expect(pdf.ok).toBe(false);
    if (!pdf.ok) expect(pdf.error).toMatch(/JPG, PNG, WEBP o GIF/);

    const big = validateImageFile({ name: 'a.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024 });
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error).toMatch(/5 MB/);
  });

  it('rejects an empty file (no file chosen)', () => {
    expect(validateImageFile({ name: '', type: '', size: 0 }).ok).toBe(false);
  });
});

describe('imageStoragePath', () => {
  it('stores the cover under the project folder with a normalized extension', () => {
    const path = imageStoragePath('2197928e-d41f-42f3-8c68-e1f01534fa9e', {
      name: 'Foto Bici.JPG',
      type: 'image/jpeg',
    });
    expect(path).toMatch(/^projects\/2197928e-d41f-42f3-8c68-e1f01534fa9e\/cover-\d+\.jpg$/);
  });

  it('derives the extension from the MIME type when the name has none', () => {
    const path = imageStoragePath('abc', { name: 'blob', type: 'image/png' });
    expect(path).toMatch(/\.png$/);
  });
});
