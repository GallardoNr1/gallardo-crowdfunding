// Panel de IA del formulario de proyecto (navegador): "Rellenar con IA" (alta) y "Ajustar"
// (alta y edición). Envía al endpoint la descripción o las instrucciones más el formulario actual
// y vuelca el borrador. No guarda nada: la persona revisa los campos (resaltados) y envía el formulario.
import type { CurrentDraft, ProjectDraft } from '../project-draft';
import { draftToFormValues } from '../project-draft-form';
import type { LevelRowsApi } from './level-rows';

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const FILLED_CLASS = 'ai-filled';
const LEVEL_FIELDS = [
  'level_name',
  'level_amount',
  'level_emoji',
  'level_description',
  'level_color',
];

function mark(el: Element | null | undefined) {
  el?.classList.add(FILLED_CLASS);
}

/** Valores actuales del formulario (para "Ajustar"): campos con nombre y filas de niveles. */
export function collectFormValues(form: HTMLFormElement): CurrentDraft {
  const fields: CurrentDraft['fields'] = {};
  form.querySelectorAll<Field>('[name]').forEach((el) => {
    const name = el.name;
    if (!name || name.startsWith('_') || LEVEL_FIELDS.includes(name)) return;
    if (el instanceof HTMLInputElement) {
      if (el.type === 'file') return;
      if (el.type === 'checkbox') {
        fields[name] = el.checked;
        return;
      }
      if (el.type === 'radio') {
        if (el.checked) fields[name] = el.value;
        return;
      }
    }
    fields[name] = el.value;
  });

  const rowNames = Array.from(
    form.querySelectorAll<HTMLInputElement>('[name="level_name"]')
  );
  let levels: CurrentDraft['levels'] = [];
  if (rowNames.length > 0) {
    const column = (n: string) =>
      Array.from(form.querySelectorAll<HTMLInputElement>(`[name="${n}"]`)).map(
        (i) => i.value
      );
    const amounts = column('level_amount');
    const emojis = column('level_emoji');
    const descriptions = column('level_description');
    const colors = column('level_color');
    levels = rowNames
      .map((input, i) => ({
        name: input.value.trim(),
        amount: Number(amounts[i]) || 0,
        emoji: emojis[i] ?? '',
        description: descriptions[i] ?? '',
        color: colors[i] ?? '',
      }))
      .filter((l) => l.name || l.amount);
  } else {
    // Edición: los niveles viven en la BD; la página los deja serializados como contexto.
    const json = form.querySelector('[data-level-json]')?.textContent?.trim();
    if (json) {
      try {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) levels = parsed as CurrentDraft['levels'];
      } catch {
        levels = [];
      }
    }
  }
  return { fields, levels };
}

const sameLevels = (a: CurrentDraft['levels'], b: ProjectDraft['levels']) =>
  JSON.stringify(
    a.map((l) => [l.name, Number(l.amount), l.emoji, l.description, l.color])
  ) ===
  JSON.stringify(
    b.map((l) => [l.name, Number(l.amount), l.emoji, l.description, l.color])
  );

export interface ApplyOptions {
  /** Valores actuales del formulario: solo se tocan los campos que difieren. */
  current?: CurrentDraft;
}

/** Vuelca el borrador en el formulario y devuelve cuántos campos ha cambiado. */
export function applyDraftToForm(
  form: HTMLFormElement,
  draft: ProjectDraft,
  levels: LevelRowsApi | null,
  { current }: ApplyOptions = {}
): number {
  form
    .querySelectorAll(`.${FILLED_CLASS}`)
    .forEach((el) => el.classList.remove(FILLED_CLASS));
  let filled = 0;
  const unchanged = (name: string, value: string | boolean) =>
    current !== undefined &&
    name in current.fields &&
    current.fields[name] === value;

  for (const [name, value] of Object.entries(draftToFormValues(draft))) {
    const fields = Array.from(form.querySelectorAll<Field>(`[name="${name}"]`));
    const first = fields[0];
    if (!first) continue;

    if (first instanceof HTMLInputElement && first.type === 'radio') {
      const radios = fields as HTMLInputElement[];
      const target = radios.find((r) => r.value === value);
      if (!target || unchanged(name, value)) continue;
      radios.forEach((r) => (r.checked = r === target));
      // campaign-form.ts escucha "change" para mostrar los campos del modo elegido.
      target.dispatchEvent(new Event('change', { bubbles: true }));
      mark(target.closest('label') ?? target);
      filled++;
      continue;
    }

    if (first instanceof HTMLInputElement && first.type === 'checkbox') {
      const checked = value === true;
      if (unchanged(name, checked)) continue;
      first.checked = checked;
      mark(first.closest('label') ?? first);
      filled++;
      continue;
    }

    if (typeof value !== 'string' || !value) continue;
    if (unchanged(name, value)) continue;
    first.value = value;
    first.dispatchEvent(new Event('input', { bubbles: true }));
    mark(first);
    filled++;
  }

  if (
    levels &&
    draft.levels.length > 0 &&
    !(current && sameLevels(current.levels, draft.levels))
  ) {
    levels.clear();
    for (const level of draft.levels) levels.add(level);
    filled += draft.levels.length;
  }

  return filled;
}

export interface AiDraftPanelOptions {
  form: HTMLFormElement;
  levels: LevelRowsApi | null;
  endpoint?: string;
}

export function initAiDraftPanel(
  panel: HTMLElement | null,
  options: AiDraftPanelOptions
) {
  if (!panel) return;
  const brief = panel.querySelector<HTMLTextAreaElement>('[data-ai-brief]');
  const generateButton =
    panel.querySelector<HTMLButtonElement>('[data-ai-generate]');
  const instructions = panel.querySelector<HTMLTextAreaElement>(
    '[data-ai-instructions]'
  );
  const refineButton =
    panel.querySelector<HTMLButtonElement>('[data-ai-refine]');
  const refineBlock = panel.querySelector<HTMLElement>(
    '[data-ai-refine-block]'
  );
  const status = panel.querySelector<HTMLElement>('[data-ai-status]');
  const notes = panel.querySelector<HTMLElement>('[data-ai-notes]');
  const notesList = notes?.querySelector<HTMLElement>('ul');
  const endpoint = options.endpoint ?? '/admin/api/draft-project';
  const controls = [brief, generateButton, instructions, refineButton].filter(
    (el): el is HTMLTextAreaElement | HTMLButtonElement => !!el
  );

  const setStatus = (text: string, kind: 'idle' | 'busy' | 'ok' | 'error') => {
    if (!status) return;
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const showNotes = (items: string[]) => {
    if (!notes || !notesList) return;
    notesList.replaceChildren(
      ...items.map((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        return li;
      })
    );
    notes.hidden = items.length === 0;
  };

  const request = async (
    body: Record<string, unknown>,
    current?: CurrentDraft
  ) => {
    controls.forEach((el) => (el.disabled = true));
    setStatus(
      current
        ? 'Ajustando el borrador… suele tardar entre 15 y 40 segundos.'
        : 'Pensando el borrador… suele tardar entre 20 y 60 segundos.',
      'busy'
    );
    showNotes([]);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        draft?: ProjectDraft;
        error?: string;
      };
      if (!res.ok || !data.draft) {
        setStatus(
          data.error ?? `No se pudo generar el borrador (HTTP ${res.status}).`,
          'error'
        );
        return;
      }
      const filled = applyDraftToForm(
        options.form,
        data.draft,
        options.levels,
        { current }
      );
      showNotes(data.draft.notes);
      setStatus(
        current
          ? filled === 0
            ? 'La IA no ha cambiado nada: el formulario ya recogía lo que pedías.'
            : `Ajuste aplicado: ${filled} ${filled === 1 ? 'campo cambiado' : 'campos cambiados'} (resaltados). Revísalos y guarda cuando estén bien.`
          : `Borrador aplicado: ${filled} campos rellenados (resaltados). Revísalo todo y guarda cuando esté bien.`,
        'ok'
      );
      if (refineBlock) refineBlock.hidden = false;
      if (instructions && current) instructions.value = '';
      if (!current)
        options.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      setStatus(
        'No se pudo contactar con el servidor. Inténtalo de nuevo.',
        'error'
      );
    } finally {
      controls.forEach((el) => (el.disabled = false));
    }
  };

  const generate = () => {
    const text = brief?.value.trim() ?? '';
    if (text.length < 10) {
      setStatus('Cuéntame un poco más (al menos 10 caracteres).', 'error');
      brief?.focus();
      return;
    }
    void request({ brief: text });
  };

  const refine = () => {
    const text = instructions?.value.trim() ?? '';
    if (text.length < 3) {
      setStatus('Dime qué quieres cambiar (al menos 3 caracteres).', 'error');
      instructions?.focus();
      return;
    }
    void request(
      { instructions: text, current: collectFormValues(options.form) },
      collectFormValues(options.form)
    );
  };

  generateButton?.addEventListener('click', generate);
  refineButton?.addEventListener('click', refine);
  const submitOnCtrlEnter = (
    el: HTMLTextAreaElement | null,
    action: () => void
  ) =>
    el?.addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
        ev.preventDefault();
        action();
      }
    });
  submitOnCtrlEnter(brief, generate);
  submitOnCtrlEnter(instructions, refine);
}
