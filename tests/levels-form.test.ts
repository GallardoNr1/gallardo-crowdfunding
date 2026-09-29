import { describe, expect, it } from 'vitest';
import {
  parseEmojiForm,
  parseLevelForm,
  replaceEmojiOption,
} from '../src/lib/levels-form';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

describe('parseLevelForm', () => {
  it('reads a complete level with defaults for the optional fields', () => {
    const result = parseLevelForm(
      form({ level_name: ' Casco ', level_amount: '25' }),
      3
    );
    expect(result).toEqual({
      ok: true,
      level: {
        name: 'Casco',
        amount: 25,
        emoji: '⭐',
        description: '',
        color: '#6366f1',
        sort_order: 3,
      },
    });
  });

  it('keeps the values given', () => {
    const result = parseLevelForm(
      form({
        level_name: 'Ruedas',
        level_amount: '12.5',
        level_emoji: '🛞',
        level_description: 'Un par',
        level_color: '#ff0000',
        level_sort_order: '7',
      })
    );
    expect(result.ok && result.level).toEqual({
      name: 'Ruedas',
      amount: 12.5,
      emoji: '🛞',
      description: 'Un par',
      color: '#ff0000',
      sort_order: 7,
    });
  });

  it('rejects a missing name or a non-positive amount', () => {
    expect(
      parseLevelForm(form({ level_name: '', level_amount: '10' })).ok
    ).toBe(false);
    expect(
      parseLevelForm(form({ level_name: 'X', level_amount: '0' })).ok
    ).toBe(false);
    expect(
      parseLevelForm(form({ level_name: 'X', level_amount: 'abc' })).ok
    ).toBe(false);
  });
});

describe('parseEmojiForm / replaceEmojiOption', () => {
  it('reads a trimmed emoji option and rejects incomplete ones', () => {
    expect(
      parseEmojiForm(form({ emoji_value: ' 🙂 ', emoji_label: ' Amigo ' }))
    ).toEqual({
      ok: true,
      option: { value: '🙂', label: 'Amigo' },
    });
    expect(
      parseEmojiForm(form({ emoji_value: '🙂', emoji_label: '' })).ok
    ).toBe(false);
  });

  it('replaces the option at the index without mutating the original list', () => {
    const options = [
      { value: '🙂', label: 'Amigo' },
      { value: '👵', label: 'Abuela' },
    ];
    const updated = replaceEmojiOption(options, 1, {
      value: '👴',
      label: 'Abuelo',
    });
    expect(updated).toEqual([
      { value: '🙂', label: 'Amigo' },
      { value: '👴', label: 'Abuelo' },
    ]);
    expect(options[1]).toEqual({ value: '👵', label: 'Abuela' });
  });

  it('returns null for an index out of range', () => {
    expect(replaceEmojiOption([], 0, { value: '🙂', label: 'x' })).toBeNull();
    expect(
      replaceEmojiOption([{ value: 'a', label: 'a' }], -1, {
        value: 'b',
        label: 'b',
      })
    ).toBeNull();
  });
});
