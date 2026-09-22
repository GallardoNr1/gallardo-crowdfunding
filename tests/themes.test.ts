import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, THEMES, THEME_IDS, getTheme, themeCss } from '../src/lib/themes';

describe('themes registry', () => {
  it('has the six agreed themes with fiesta as default', () => {
    expect([...THEME_IDS].sort()).toEqual(
      ['aventura', 'fantasia', 'fiesta', 'navidad', 'tecnologia', 'viaje'].sort()
    );
    expect(DEFAULT_THEME_ID).toBe('fiesta');
  });

  it('gives every theme the same color tokens and emoji keys', () => {
    const reference = THEMES.fiesta;
    for (const id of THEME_IDS) {
      const t = THEMES[id];
      expect(Object.keys(t.colors).sort()).toEqual(Object.keys(reference.colors).sort());
      expect(Object.keys(t.emojis).sort()).toEqual(Object.keys(reference.emojis).sort());
      expect(t.emojis.hero.length).toBeGreaterThanOrEqual(5);
      expect(t.emojis.confetti.length).toBeGreaterThanOrEqual(5);
      expect(t.swatch).toHaveLength(3);
    }
  });

  it('only uses CSS custom property names as color tokens', () => {
    for (const key of Object.keys(THEMES.fiesta.colors)) expect(key.startsWith('--')).toBe(true);
  });
});

describe('getTheme', () => {
  it('returns the requested theme and falls back to the default', () => {
    expect(getTheme('aventura').id).toBe('aventura');
    expect(getTheme('nope').id).toBe('fiesta');
    expect(getTheme(undefined).id).toBe('fiesta');
    expect(getTheme(null).id).toBe('fiesta');
  });
});

describe('themeCss', () => {
  it('emits an html[data-theme] block per theme with its tokens', () => {
    const css = themeCss();
    for (const id of THEME_IDS) expect(css).toContain(`html[data-theme="${id}"]`);
    expect(css).toContain('--color-brand-primary:');
  });
});
