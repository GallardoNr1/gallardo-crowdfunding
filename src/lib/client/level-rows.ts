// Filas de niveles de contribución en el alta de proyecto (navegador).
// Clona un <template data-level-row> dentro de [data-level-list]; el servidor lee los
// inputs repetidos con parseLevelRows(). Lo usan new.astro y el panel de IA.

export interface LevelRowValues {
  name: string;
  amount: number | string;
  emoji: string;
  description: string;
  color: string;
}

export interface LevelRowsApi {
  add(values?: Partial<LevelRowValues>): HTMLElement;
  clear(): void;
  count(): number;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function setField(
  row: HTMLElement,
  name: string,
  value: string | number | undefined
) {
  const field = row.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (!field || value === undefined) return;
  const text = String(value);
  // <input type="color"> solo acepta #rrggbb; con otra cosa se deja el color por defecto.
  if (field.type === 'color' && !HEX_COLOR.test(text)) return;
  field.value = text;
}

export function initLevelRows(
  section: HTMLElement | null
): LevelRowsApi | null {
  if (!section) return null;
  const list = section.querySelector<HTMLElement>('[data-level-list]');
  const template = section.querySelector<HTMLTemplateElement>(
    'template[data-level-row]'
  );
  const empty = section.querySelector<HTMLElement>('[data-level-empty]');
  const rowTemplate = template?.content.firstElementChild;
  if (!list || !rowTemplate) return null;

  const updateEmpty = () => {
    if (empty) empty.hidden = list.children.length > 0;
  };

  const api: LevelRowsApi = {
    add(values) {
      const row = rowTemplate.cloneNode(true) as HTMLElement;
      setField(row, 'level_name', values?.name);
      setField(row, 'level_amount', values?.amount);
      setField(row, 'level_emoji', values?.emoji);
      setField(row, 'level_description', values?.description);
      setField(row, 'level_color', values?.color);
      row
        .querySelector('[data-remove-level]')
        ?.addEventListener('click', () => {
          row.remove();
          updateEmpty();
        });
      list.appendChild(row);
      updateEmpty();
      return row;
    },
    clear() {
      list.replaceChildren();
      updateEmpty();
    },
    count() {
      return list.children.length;
    },
  };

  section.querySelector('[data-add-level]')?.addEventListener('click', () => {
    api.add().querySelector<HTMLInputElement>('input')?.focus();
  });
  updateEmpty();
  return api;
}
