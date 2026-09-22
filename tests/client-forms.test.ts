// @vitest-environment happy-dom
// Scripts del navegador del alta de proyecto: filas de niveles, volcado del borrador de IA
// y recuperación del formulario tras un error del servidor.
import { beforeEach, describe, expect, it } from 'vitest';
import { applyDraftToForm } from '../src/lib/client/ai-draft';
import { initCampaignForm } from '../src/lib/client/campaign-form';
import {
  restoreFormAfterError,
  saveFormOnSubmit,
} from '../src/lib/client/form-restore';
import { initLevelRows } from '../src/lib/client/level-rows';
import type { ProjectDraft } from '../src/lib/project-draft';

const FORM_HTML = `
<form class="project-form" data-has-error="false">
  <label><input type="radio" name="campaign_mode" value="target" checked></label>
  <label><input type="radio" name="campaign_mode" value="open"></label>
  <div data-mode="target"><input name="target_amount" data-required-in="target"></div>
  <div data-mode="open"><input name="end_date" type="date" data-required-in="open"></div>
  <input name="project_name">
  <input name="slug">
  <textarea name="project_description"></textarea>
  <input name="base_amount" type="number">
  <input name="base_label">
  <input type="checkbox" name="allow_custom_amount">
  <input name="min_custom_amount" type="number" value="5">
  <select name="project_status"><option value="active">a</option><option value="paused">p</option></select>
  <label><input type="radio" name="theme" value="fiesta" checked></label>
  <label><input type="radio" name="theme" value="aventura"></label>
  <input type="file" name="project_image">
  <section id="levelsSection">
    <div data-level-list></div>
    <p data-level-empty>vacío</p>
    <button type="button" data-add-level>+</button>
    <template data-level-row>
      <div class="level-row">
        <input name="level_emoji"><input name="level_name"><input name="level_amount" type="number">
        <input name="level_description"><input type="color" name="level_color" value="#6366f1">
        <button type="button" data-remove-level>x</button>
      </div>
    </template>
  </section>
</form>`;

const draft: ProjectDraft = {
  project_name: 'Bici para Máximo',
  slug: 'bici-maximo',
  project_description: '',
  campaign_mode: 'open',
  target_amount: null,
  currency: 'EUR',
  start_date: null,
  end_date: '2026-10-29',
  base_amount: 100,
  base_label: 'Papá y mamá',
  allow_custom_amount: true,
  min_custom_amount: 5,
  bizum_concept: null,
  pageTitle: '',
  pageSubtitle: '',
  productUrl: null,
  progressTitle: '🎯 Progreso',
  contributorsTitle: '✨ Contribuidores',
  photoSectionTitle: '📸 Fotos',
  mainMessage_message: '',
  mainMessage_signature: '',
  mainMessage_familyName: '',
  mainMessage_date: '',
  cta_icon: '🚴',
  cta_title: '',
  cta_text: '',
  theme: 'aventura',
  levels: [
    {
      name: 'Timbre',
      amount: 10,
      emoji: '🔔',
      description: 'Ring ring',
      color: '#ff0000',
    },
    {
      name: 'Rueda',
      amount: 50,
      emoji: '🛞',
      description: '',
      color: '#00ff00',
    },
  ],
  notes: [],
};

function mount(html = FORM_HTML) {
  document.body.innerHTML = html;
  const form = document.querySelector<HTMLFormElement>('form.project-form')!;
  initCampaignForm(form);
  const levels = initLevelRows(document.getElementById('levelsSection'))!;
  return { form, levels };
}

const field = (form: HTMLFormElement, name: string) =>
  form.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
const modeBlock = (form: HTMLFormElement, mode: string) =>
  form.querySelector<HTMLElement>(`[data-mode="${mode}"]`)!;

beforeEach(() => {
  sessionStorage.clear();
});

describe('initLevelRows', () => {
  it('adds rows from the template with the given values and toggles the empty hint', () => {
    const { form, levels } = mount();
    expect(form.querySelector<HTMLElement>('[data-level-empty]')!.hidden).toBe(
      false
    );
    levels.add({
      name: 'Timbre',
      amount: 10,
      emoji: '🔔',
      description: 'Ring',
      color: '#ff0000',
    });
    levels.add({
      name: 'Rueda',
      amount: 50,
      emoji: '',
      description: '',
      color: 'rojo',
    });
    expect(levels.count()).toBe(2);
    expect(form.querySelector<HTMLElement>('[data-level-empty]')!.hidden).toBe(
      true
    );
    const names = form.querySelectorAll<HTMLInputElement>(
      '[name="level_name"]'
    );
    expect(Array.from(names).map((i) => i.value)).toEqual(['Timbre', 'Rueda']);
    const colors = form.querySelectorAll<HTMLInputElement>(
      '[name="level_color"]'
    );
    expect(colors[0].value).toBe('#ff0000');
    expect(colors[1].value).toBe('#6366f1');
  });

  it('removes a row with its button and clears them all', () => {
    const { form, levels } = mount();
    levels.add({ name: 'A', amount: 1, emoji: '', description: '', color: '' });
    levels.add({ name: 'B', amount: 2, emoji: '', description: '', color: '' });
    form.querySelector<HTMLButtonElement>('[data-remove-level]')!.click();
    expect(levels.count()).toBe(1);
    expect(field(form, 'level_name').value).toBe('B');
    levels.clear();
    expect(levels.count()).toBe(0);
    expect(form.querySelector<HTMLElement>('[data-level-empty]')!.hidden).toBe(
      false
    );
  });

  it('adds an empty row from the add button', () => {
    const { form, levels } = mount();
    form.querySelector<HTMLButtonElement>('[data-add-level]')!.click();
    expect(levels.count()).toBe(1);
  });
});

describe('applyDraftToForm', () => {
  it('fills text, radio and checkbox fields, switches the campaign mode and adds the levels', () => {
    const { form, levels } = mount();
    expect(modeBlock(form, 'open').hidden).toBe(true);

    const filled = applyDraftToForm(form, draft, levels);

    expect(field(form, 'project_name').value).toBe('Bici para Máximo');
    expect(field(form, 'slug').value).toBe('bici-maximo');
    expect(field(form, 'base_amount').value).toBe('100');
    expect(field(form, 'end_date').value).toBe('2026-10-29');
    expect(field(form, 'allow_custom_amount').checked).toBe(true);
    expect(
      form.querySelector<HTMLInputElement>(
        '[name="campaign_mode"][value="open"]'
      )!.checked
    ).toBe(true);
    expect(
      form.querySelector<HTMLInputElement>('[name="theme"][value="aventura"]')!
        .checked
    ).toBe(true);
    // campaign-form.ts ha reaccionado al cambio de modo.
    expect(modeBlock(form, 'open').hidden).toBe(false);
    expect(modeBlock(form, 'target').hidden).toBe(true);
    expect(field(form, 'end_date').required).toBe(true);
    expect(levels.count()).toBe(2);
    expect(field(form, 'project_name').classList.contains('ai-filled')).toBe(
      true
    );
    expect(filled).toBeGreaterThan(5);
  });

  it('does not erase what the person already typed when the draft leaves a field empty', () => {
    const { form, levels } = mount();
    field(form, 'project_description').value = 'Mi descripción';
    applyDraftToForm(form, draft, levels);
    expect(field(form, 'project_description').value).toBe('Mi descripción');
    expect(
      field(form, 'project_description').classList.contains('ai-filled')
    ).toBe(false);
  });

  it('replaces the existing level rows instead of appending to them', () => {
    const { form, levels } = mount();
    levels.add({
      name: 'Viejo',
      amount: 3,
      emoji: '',
      description: '',
      color: '',
    });
    applyDraftToForm(form, draft, levels);
    const names = Array.from(
      form.querySelectorAll<HTMLInputElement>('[name="level_name"]')
    ).map((i) => i.value);
    expect(names).toEqual(['Timbre', 'Rueda']);
  });
});

describe('form restore after a server error', () => {
  it('saves the values on submit and restores them (levels included) when the page reports an error', () => {
    const first = mount();
    saveFormOnSubmit(first.form);
    field(first.form, 'project_name').value = 'Tablet para Ana';
    field(first.form, 'allow_custom_amount').checked = true;
    first.form.querySelector<HTMLInputElement>(
      '[name="campaign_mode"][value="open"]'
    )!.checked = true;
    first.levels.add({
      name: 'Funda',
      amount: 15,
      emoji: '🧥',
      description: 'Suave',
      color: '#123456',
    });
    first.form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(sessionStorage.getItem('gc:new-project-form')).toContain(
      'Tablet para Ana'
    );

    const second = mount(
      FORM_HTML.replace('data-has-error="false"', 'data-has-error="true"')
    );
    restoreFormAfterError(second.form, second.levels);

    expect(field(second.form, 'project_name').value).toBe('Tablet para Ana');
    expect(field(second.form, 'allow_custom_amount').checked).toBe(true);
    expect(
      second.form.querySelector<HTMLInputElement>(
        '[name="campaign_mode"][value="open"]'
      )!.checked
    ).toBe(true);
    expect(modeBlock(second.form, 'open').hidden).toBe(false);
    expect(second.levels.count()).toBe(1);
    expect(field(second.form, 'level_name').value).toBe('Funda');
    expect(field(second.form, 'level_amount').value).toBe('15');
    expect(sessionStorage.getItem('gc:new-project-form')).toBeNull();
  });

  it('discards the saved values when the page has no error', () => {
    const first = mount();
    saveFormOnSubmit(first.form);
    field(first.form, 'project_name').value = 'Tablet para Ana';
    first.form.dispatchEvent(new Event('submit', { cancelable: true }));

    const second = mount();
    restoreFormAfterError(second.form, second.levels);
    expect(field(second.form, 'project_name').value).toBe('');
    expect(sessionStorage.getItem('gc:new-project-form')).toBeNull();
  });
});
