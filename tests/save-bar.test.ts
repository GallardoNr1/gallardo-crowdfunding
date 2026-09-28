// @vitest-environment happy-dom
// Barra de guardado fija del formulario de proyecto: avisa de cambios sin guardar
// y evita salir de la página con cambios pendientes.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  initSaveBar,
  notifyFormFilled,
  type SaveBarHandle,
} from '../src/lib/client/save-bar';

let current: SaveBarHandle | null = null;

const HTML = `
<form class="project-form">
  <input name="project_name">
  <select name="theme"><option value="a">a</option><option value="b">b</option></select>
  <div class="save-bar" id="saveBar">
    <span class="save-bar-status" data-status></span>
    <button type="submit">Guardar cambios</button>
  </div>
</form>`;

function setup() {
  document.body.innerHTML = HTML;
  const form = document.querySelector<HTMLFormElement>('form.project-form')!;
  const bar = document.getElementById('saveBar')!;
  const status = bar.querySelector<HTMLElement>('[data-status]')!;
  current = initSaveBar(form, bar);
  return { form, bar, status, handle: current };
}

function fire(el: Element, type: string) {
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
}

describe('initSaveBar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Cada init registra un listener en window: se quita para no contaminar el siguiente test.
    current?.dispose();
    current = null;
  });

  it('starts clean and marks the bar dirty when a field changes', () => {
    const { form, bar, status, handle } = setup();
    expect(handle.isDirty()).toBe(false);
    expect(bar.dataset.dirty).toBe('false');
    expect(status.textContent).toBe('');

    fire(form.querySelector('input')!, 'input');
    expect(handle.isDirty()).toBe(true);
    expect(bar.dataset.dirty).toBe('true');
    expect(status.textContent).toBe('Cambios sin guardar');
  });

  it('also reacts to change events (selects, checkboxes, files)', () => {
    const { form, handle } = setup();
    fire(form.querySelector('select')!, 'change');
    expect(handle.isDirty()).toBe(true);
  });

  it('clears the dirty state on submit and shows that it is saving', () => {
    const { form, bar, status, handle } = setup();
    fire(form.querySelector('input')!, 'input');
    form.addEventListener('submit', (e) => e.preventDefault());
    fire(form, 'submit');
    expect(handle.isDirty()).toBe(false);
    expect(bar.dataset.dirty).toBe('false');
    expect(status.textContent).toBe('Guardando…');
  });

  it('blocks leaving the page only while there are unsaved changes', () => {
    const { form } = setup();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    fire(form.querySelector('input')!, 'input');
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it('marks dirty when the form is filled programmatically', () => {
    const { form, handle } = setup();
    notifyFormFilled(form);
    expect(handle.isDirty()).toBe(true);
  });

  it('is a no-op without form or bar', () => {
    expect(() => initSaveBar(null, null)).not.toThrow();
    expect(initSaveBar(null, null).isDirty()).toBe(false);
  });
});
