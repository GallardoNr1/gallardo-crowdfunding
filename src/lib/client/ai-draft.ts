// Panel "Rellenar con IA" del alta de proyecto (navegador).
// Envía la descripción a POST /admin/api/draft-project y vuelca el borrador en el formulario.
// No guarda nada: la persona revisa los campos (resaltados) y pulsa "Crear proyecto".
import type { ProjectDraft } from '../project-draft';
import { draftToFormValues } from '../project-draft-form';
import type { LevelRowsApi } from './level-rows';

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const FILLED_CLASS = 'ai-filled';

function mark(el: Element | null | undefined) {
  el?.classList.add(FILLED_CLASS);
}

/** Vuelca el borrador en el formulario. Los valores vacíos no borran lo ya escrito. */
export function applyDraftToForm(
  form: HTMLFormElement,
  draft: ProjectDraft,
  levels: LevelRowsApi | null
): number {
  form
    .querySelectorAll(`.${FILLED_CLASS}`)
    .forEach((el) => el.classList.remove(FILLED_CLASS));
  let filled = 0;

  for (const [name, value] of Object.entries(draftToFormValues(draft))) {
    const fields = Array.from(form.querySelectorAll<Field>(`[name="${name}"]`));
    const first = fields[0];
    if (!first) continue;

    if (first instanceof HTMLInputElement && first.type === 'radio') {
      const radios = fields as HTMLInputElement[];
      const target = radios.find((r) => r.value === value);
      if (!target) continue;
      radios.forEach((r) => (r.checked = r === target));
      // campaign-form.ts escucha "change" para mostrar los campos del modo elegido.
      target.dispatchEvent(new Event('change', { bubbles: true }));
      mark(target.closest('label') ?? target);
      filled++;
      continue;
    }

    if (first instanceof HTMLInputElement && first.type === 'checkbox') {
      first.checked = value === true;
      mark(first);
      filled++;
      continue;
    }

    if (typeof value !== 'string' || !value) continue;
    first.value = value;
    first.dispatchEvent(new Event('input', { bubbles: true }));
    mark(first);
    filled++;
  }

  if (levels && draft.levels.length > 0) {
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
  const button = panel.querySelector<HTMLButtonElement>('[data-ai-generate]');
  const status = panel.querySelector<HTMLElement>('[data-ai-status]');
  const notes = panel.querySelector<HTMLElement>('[data-ai-notes]');
  const notesList = notes?.querySelector<HTMLElement>('ul');
  if (!brief || !button) return;
  const endpoint = options.endpoint ?? '/admin/api/draft-project';

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

  const generate = async () => {
    const text = brief.value.trim();
    if (text.length < 10) {
      setStatus('Cuéntame un poco más (al menos 10 caracteres).', 'error');
      brief.focus();
      return;
    }
    button.disabled = true;
    brief.disabled = true;
    setStatus(
      'Pensando el borrador… suele tardar entre 20 y 60 segundos.',
      'busy'
    );
    showNotes([]);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: text }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        draft?: ProjectDraft;
        error?: string;
      };
      if (!res.ok || !body.draft) {
        setStatus(
          body.error ?? `No se pudo generar el borrador (HTTP ${res.status}).`,
          'error'
        );
        return;
      }
      const filled = applyDraftToForm(options.form, body.draft, options.levels);
      showNotes(body.draft.notes);
      setStatus(
        `Borrador aplicado: ${filled} campos rellenados (resaltados). Revísalo todo y pulsa "Crear proyecto" cuando esté bien.`,
        'ok'
      );
      options.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      setStatus(
        'No se pudo contactar con el servidor. Inténtalo de nuevo.',
        'error'
      );
    } finally {
      button.disabled = false;
      brief.disabled = false;
    }
  };

  button.addEventListener('click', generate);
  brief.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      void generate();
    }
  });
}
