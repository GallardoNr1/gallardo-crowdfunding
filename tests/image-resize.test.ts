// Lógica pura de la reducción de imágenes en el navegador antes de subirlas.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_SIZE,
  fitWithin,
  outputType,
  renamedFile,
  shouldResize,
} from '../src/lib/client/image-resize';

describe('fitWithin', () => {
  it('scales down keeping the ratio and never scales up', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1600, 1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it('rounds to whole pixels and keeps at least 1px', () => {
    expect(fitWithin(3001, 1000, 1600)).toEqual({ width: 1600, height: 533 });
    expect(fitWithin(5000, 1, 1600)).toEqual({ width: 1600, height: 1 });
  });
});

describe('shouldResize', () => {
  const jpeg = { type: 'image/jpeg', size: 4_000_000 };

  it('resizes big photos and re-encodes heavy ones even if they fit', () => {
    expect(shouldResize(jpeg, 4000, 3000)).toBe(true);
    expect(
      shouldResize({ type: 'image/jpeg', size: 2_500_000 }, 1500, 1000)
    ).toBe(true);
  });

  it('leaves small and light images alone', () => {
    expect(shouldResize({ type: 'image/jpeg', size: 200_000 }, 1200, 800)).toBe(
      false
    );
    expect(shouldResize({ type: 'image/png', size: 900_000 }, 1600, 900)).toBe(
      false
    );
  });

  it('never touches gifs or non-images', () => {
    expect(
      shouldResize({ type: 'image/gif', size: 9_000_000 }, 4000, 4000)
    ).toBe(false);
    expect(
      shouldResize({ type: 'application/pdf', size: 9_000_000 }, 4000, 4000)
    ).toBe(false);
  });

  it('honours a custom maximum', () => {
    expect(
      shouldResize({ type: 'image/jpeg', size: 100 }, 600, 600, {
        maxSize: 512,
      })
    ).toBe(true);
    expect(DEFAULT_MAX_SIZE).toBe(1600);
  });
});

describe('outputType / renamedFile', () => {
  it('keeps jpeg, png and webp and rejects the rest', () => {
    expect(outputType('image/jpeg')).toBe('image/jpeg');
    expect(outputType('image/png')).toBe('image/png');
    expect(outputType('image/webp')).toBe('image/webp');
    expect(outputType('image/gif')).toBeNull();
    expect(outputType('text/plain')).toBeNull();
  });

  it('fixes the extension to match the type', () => {
    expect(renamedFile('foto.JPG', 'image/jpeg')).toBe('foto.jpg');
    expect(renamedFile('captura.png', 'image/png')).toBe('captura.png');
    expect(renamedFile('sin-extension', 'image/webp')).toBe(
      'sin-extension.webp'
    );
  });
});
