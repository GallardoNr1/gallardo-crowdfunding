// Lectura y validación de los formularios "al momento" de la edición de proyecto:
// niveles de contribución (alta y edición) y emojis del modal. Puro: sin Supabase.
import type { EmojiOption } from './supabase';

export interface LevelInput {
  name: string;
  amount: number;
  emoji: string;
  description: string;
  color: string;
  sort_order: number;
}

export type LevelFormResult =
  { ok: true; level: LevelInput } | { ok: false; error: string };

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? '').trim();

/** Campos `level_*` del formulario. `fallbackSortOrder` se usa si no llega orden. */
export function parseLevelForm(
  form: FormData,
  fallbackSortOrder = 0
): LevelFormResult {
  const name = text(form, 'level_name');
  const amount = parseFloat(text(form, 'level_amount'));
  if (!name || !Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      error: 'El nivel necesita un nombre y un importe mayor que 0.',
    };
  }
  const sortOrder = parseInt(text(form, 'level_sort_order'), 10);
  return {
    ok: true,
    level: {
      name,
      amount,
      emoji: text(form, 'level_emoji') || '⭐',
      description: text(form, 'level_description'),
      color: text(form, 'level_color') || '#6366f1',
      sort_order: Number.isFinite(sortOrder) ? sortOrder : fallbackSortOrder,
    },
  };
}

export type EmojiFormResult =
  { ok: true; option: EmojiOption } | { ok: false; error: string };

/** Campos `emoji_value` y `emoji_label`. */
export function parseEmojiForm(form: FormData): EmojiFormResult {
  const value = text(form, 'emoji_value');
  const label = text(form, 'emoji_label');
  if (!value || !label) {
    return { ok: false, error: 'El emoji necesita el símbolo y una etiqueta.' };
  }
  return { ok: true, option: { value, label } };
}

/** Sustituye la opción `index`; null si el índice no existe. No muta la lista. */
export function replaceEmojiOption(
  options: EmojiOption[],
  index: number,
  option: EmojiOption
): EmojiOption[] | null {
  if (!Number.isInteger(index) || index < 0 || index >= options.length)
    return null;
  return options.map((o, i) => (i === index ? option : o));
}
