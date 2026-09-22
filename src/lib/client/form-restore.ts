// Conserva lo escrito en el alta de proyecto si el servidor devuelve un error de validación
// (slug repetido, nivel sin importe...). Sin esto, un formulario largo (o rellenado por la
// IA) se perdía entero al reenviarlo. Usa sessionStorage: solo esta pestaña, solo un envío.
import type { LevelRowsApi } from './level-rows';

const STORAGE_KEY = 'gc:new-project-form';

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type Saved = Record<string, string[]>;

/** Al enviar, guarda todos los valores de texto (los archivos no se pueden guardar). */
export function saveFormOnSubmit(form: HTMLFormElement) {
  form.addEventListener('submit', () => {
    const data: Saved = {};
    for (const [name, value] of new FormData(form).entries()) {
      if (typeof value !== 'string') continue;
      (data[name] ??= []).push(value);
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Sin almacenamiento (modo privado estricto): simplemente no se restaura.
    }
  });
}

/**
 * Si la página se ha renderizado con error (`data-has-error="true"` en el form) y hay
 * valores guardados, los vuelve a poner. Los valores guardados se consumen siempre.
 */
export function restoreFormAfterError(
  form: HTMLFormElement,
  levels: LevelRowsApi | null
) {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw || form.dataset.hasError !== 'true') return;

  let data: Saved;
  try {
    data = JSON.parse(raw) as Saved;
  } catch {
    return;
  }

  const names = data.level_name ?? [];
  if (levels && names.length > 0) {
    levels.clear();
    names.forEach((name, i) =>
      levels.add({
        name,
        amount: data.level_amount?.[i] ?? '',
        emoji: data.level_emoji?.[i] ?? '',
        description: data.level_description?.[i] ?? '',
        color: data.level_color?.[i] ?? '',
      })
    );
  }

  form
    .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    .forEach((box) => {
      box.checked = box.name in data;
    });

  for (const [name, values] of Object.entries(data)) {
    if (name.startsWith('level_')) continue;
    const fields = Array.from(form.querySelectorAll<Field>(`[name="${name}"]`));
    const first = fields[0];
    if (!first) continue;
    if (
      first instanceof HTMLInputElement &&
      (first.type === 'file' || first.type === 'checkbox')
    ) {
      continue;
    }
    if (first instanceof HTMLInputElement && first.type === 'radio') {
      const radios = fields as HTMLInputElement[];
      radios.forEach((r) => (r.checked = r.value === values[0]));
      radios
        .find((r) => r.checked)
        ?.dispatchEvent(new Event('change', { bubbles: true }));
      continue;
    }
    first.value = values[0] ?? '';
  }
}
