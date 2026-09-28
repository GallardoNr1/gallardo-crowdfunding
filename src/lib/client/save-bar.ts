// Barra de guardado fija del formulario de proyecto (alta y edición).
// Marca la barra como "con cambios" en cuanto se toca un campo (o se rellena por
// programa con el evento `form:filled`), lo anuncia en el texto de estado y evita
// abandonar la página con cambios pendientes. Al enviar, vuelve a limpio.

export const DIRTY_TEXT = 'Cambios sin guardar';
export const SAVING_TEXT = 'Guardando…';
/** Evento que disparan los rellenos por programa (borrador de IA, restauración) sobre el formulario. */
export const FORM_FILLED_EVENT = 'form:filled';

export interface SaveBarHandle {
  isDirty(): boolean;
  /** Quita los listeners (window incluido); útil en tests. */
  dispose(): void;
}

export function initSaveBar(
  form: HTMLFormElement | null,
  bar: HTMLElement | null
): SaveBarHandle {
  let dirty = false;
  const controller = new AbortController();
  const handle: SaveBarHandle = {
    isDirty: () => dirty,
    dispose: () => controller.abort(),
  };
  if (!form || !bar) return handle;

  const { signal } = controller;
  const status = bar.querySelector<HTMLElement>('[data-status]');
  const render = (text: string) => {
    bar.dataset.dirty = String(dirty);
    if (status) status.textContent = text;
  };

  const markDirty = () => {
    if (dirty) return;
    dirty = true;
    render(DIRTY_TEXT);
  };

  form.addEventListener('input', markDirty, { signal });
  form.addEventListener('change', markDirty, { signal });
  form.addEventListener(FORM_FILLED_EVENT, markDirty, { signal });
  form.addEventListener(
    'submit',
    () => {
      dirty = false;
      render(SAVING_TEXT);
    },
    { signal }
  );
  window.addEventListener(
    'beforeunload',
    (event) => {
      if (!dirty) return;
      event.preventDefault();
      // Navegadores antiguos: hace falta returnValue para mostrar el aviso.
      event.returnValue = '';
    },
    { signal }
  );

  render('');
  return handle;
}

/** Avisa a la barra de que el formulario se ha rellenado por programa. */
export function notifyFormFilled(form: HTMLFormElement) {
  form.dispatchEvent(new CustomEvent(FORM_FILLED_EVENT, { bubbles: true }));
}
