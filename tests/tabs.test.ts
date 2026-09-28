// @vitest-environment happy-dom
// Pestañas de la edición de proyecto: "Datos del proyecto" (formulario + barra de guardado)
// y "Fotos, niveles y emojis" (formularios que se guardan al momento).
import { beforeEach, describe, expect, it } from 'vitest';
import { initTabs } from '../src/lib/client/tabs';

const HTML = `
<div role="tablist" id="tabs">
  <button type="button" role="tab" id="tab-datos" data-tab="datos" aria-controls="panel-datos" aria-selected="true">Datos</button>
  <button type="button" role="tab" id="tab-extras" data-tab="extras" aria-controls="panel-extras" aria-selected="false">Extras</button>
</div>
<div id="panel-datos" role="tabpanel">datos</div>
<div id="panel-extras" role="tabpanel" hidden>
  <p data-dirty-note hidden>Tienes cambios sin guardar</p>
  extras
</div>`;

function setup(isDirty = () => false) {
  document.body.innerHTML = HTML;
  history.replaceState(null, '', '/admin/projects/p1/edit');
  const root = document.getElementById('tabs')!;
  const api = initTabs(root, { isDirty });
  const tab = (id: string) => document.getElementById(`tab-${id}`)!;
  const panel = (id: string) => document.getElementById(`panel-${id}`)!;
  return { root, api, tab, panel };
}

describe('initTabs', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('shows the panel of the clicked tab and hides the rest', () => {
    const { tab, panel, api } = setup();
    tab('extras').click();
    expect(panel('extras').hidden).toBe(false);
    expect(panel('datos').hidden).toBe(true);
    expect(tab('extras').getAttribute('aria-selected')).toBe('true');
    expect(tab('datos').getAttribute('aria-selected')).toBe('false');
    expect(tab('datos').tabIndex).toBe(-1);
    expect(api.current()).toBe('extras');
  });

  it('keeps the tab in the URL so a reload or a POST comes back to it', () => {
    const { tab } = setup();
    tab('extras').click();
    expect(location.search).toBe('?tab=extras');
    tab('datos').click();
    expect(location.search).toBe('');
  });

  it('warns in the instant panel when the main form has unsaved changes', () => {
    let dirty = false;
    const { tab, panel } = setup(() => dirty);
    const note =
      panel('extras').querySelector<HTMLElement>('[data-dirty-note]')!;
    tab('extras').click();
    expect(note.hidden).toBe(true);
    tab('datos').click();
    dirty = true;
    tab('extras').click();
    expect(note.hidden).toBe(false);
  });

  it('moves between tabs with the arrow keys', () => {
    const { tab, panel } = setup();
    tab('datos').focus();
    tab('datos').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );
    expect(panel('extras').hidden).toBe(false);
    expect(document.activeElement).toBe(tab('extras'));
    tab('extras').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );
    expect(panel('datos').hidden).toBe(false);
  });

  it('can select a tab from code and is a no-op without root', () => {
    const { api, panel } = setup();
    api.select('extras');
    expect(panel('extras').hidden).toBe(false);
    expect(() => initTabs(null)).not.toThrow();
  });
});
