// @vitest-environment happy-dom
// Selector de tema compacto: rejilla de fichas + panel con el detalle del tema elegido.
import { beforeEach, describe, expect, it } from 'vitest';
import { initThemePicker } from '../src/lib/client/theme-picker';

const HTML = `
<div id="themePicker">
  <label><input type="radio" name="theme" value="fiesta" checked></label>
  <label><input type="radio" name="theme" value="princesas"></label>
  <div data-theme-detail="fiesta">Fiesta</div>
  <div data-theme-detail="princesas" hidden>Princesas</div>
</div>`;

function setup() {
  document.body.innerHTML = HTML;
  const root = document.getElementById('themePicker')!;
  initThemePicker(root);
  const detail = (id: string) =>
    root.querySelector<HTMLElement>(`[data-theme-detail="${id}"]`)!;
  const radio = (id: string) =>
    root.querySelector<HTMLInputElement>(`input[value="${id}"]`)!;
  return { root, detail, radio };
}

describe('initThemePicker', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('shows only the detail of the checked theme on init', () => {
    const { detail } = setup();
    expect(detail('fiesta').hidden).toBe(false);
    expect(detail('princesas').hidden).toBe(true);
  });

  it('switches the detail when another theme is chosen', () => {
    const { detail, radio } = setup();
    radio('princesas').checked = true;
    radio('princesas').dispatchEvent(new Event('change', { bubbles: true }));
    expect(detail('princesas').hidden).toBe(false);
    expect(detail('fiesta').hidden).toBe(true);
  });

  it('ignores changes of other fields and a missing root', () => {
    const { root, detail } = setup();
    const other = document.createElement('input');
    other.name = 'project_name';
    root.append(other);
    other.dispatchEvent(new Event('change', { bubbles: true }));
    expect(detail('fiesta').hidden).toBe(false);
    expect(() => initThemePicker(null)).not.toThrow();
  });
});
