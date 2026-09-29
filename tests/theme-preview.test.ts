import { describe, expect, it } from 'vitest';
import { resolvePreviewTheme } from '../src/lib/theme-preview';

describe('resolvePreviewTheme', () => {
  it('returns the requested theme only for someone who manages the project', () => {
    expect(resolvePreviewTheme('halloween', true)).toBe('halloween');
    expect(resolvePreviewTheme('halloween', false)).toBeNull();
  });

  it('ignores unknown or missing themes', () => {
    expect(resolvePreviewTheme('nope', true)).toBeNull();
    expect(resolvePreviewTheme(null, true)).toBeNull();
    expect(resolvePreviewTheme('', true)).toBeNull();
  });
});
