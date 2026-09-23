import { describe, expect, it } from 'vitest';
import { parseLevelRows, parseProjectForm } from '../src/lib/project-form';

function formWith(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const minimal = {
  project_name: 'Tablet para Ana',
  slug: ' Tablet Ana ',
  project_status: 'active',
  target_amount: '160',
};

describe('parseProjectForm', () => {
  it('builds the project row and page_content from a minimal form', () => {
    const r = parseProjectForm(formWith(minimal));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.slug).toBe('tablet-ana');
    expect(r.data.target_amount).toBe(160);
    expect(r.data.currency).toBe('EUR');
    expect(r.data.project_image_url).toBeNull();
    expect(r.data.campaign_mode).toBe('target');
    expect(r.data.base_amount).toBe(0);
    expect(r.data.base_label).toBeNull();
    expect(r.data.allow_custom_amount).toBe(false);
    expect(r.data.min_custom_amount).toBe(5);
    expect(r.data.page_content.progressTitle).toBe('🎯 Progreso');
    expect(r.data.page_content.cta).toEqual({
      icon: '🎁',
      title: '',
      text: '',
      stats: [],
    });
    expect(r.data.page_content.theme).toBe('fiesta');
    expect(r.data.visibility).toBe('private');
    expect(r.data.page_content.mainMessage).toEqual({
      message: '',
      signature: '',
      familyName: '',
      date: '',
    });
  });

  it('copies the page content fields when present', () => {
    const r = parseProjectForm(
      formWith({
        ...minimal,
        pageTitle: '🎁 Regalo',
        mainMessage_message: 'Hola familia',
        cta_icon: '🚀',
        bizum_phone: '612345678',
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.page_content.pageTitle).toBe('🎁 Regalo');
    expect(r.data.page_content.mainMessage.message).toBe('Hola familia');
    expect(r.data.page_content.cta.icon).toBe('🚀');
    const viaje = parseProjectForm(formWith({ ...minimal, theme: 'viaje' }));
    expect(viaje.ok).toBe(true);
    if (viaje.ok) expect(viaje.data.page_content.theme).toBe('viaje');
    expect(r.data.bizum_phone).toBe('612345678');
    expect(r.data.page_content.bizum_phone).toBe('612345678');
  });

  it('maps an open campaign form', () => {
    const r = parseProjectForm(
      formWith({
        ...minimal,
        campaign_mode: 'open',
        target_amount: '',
        end_date: '2026-10-29',
        base_amount: '150',
        base_label: 'Papá y mamá',
        allow_custom_amount: 'on',
        min_custom_amount: '10',
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.campaign_mode).toBe('open');
    expect(r.data.target_amount).toBe(0);
    expect(r.data.end_date).toBe('2026-10-29');
    expect(r.data.base_amount).toBe(150);
    expect(r.data.base_label).toBe('Papá y mamá');
    expect(r.data.allow_custom_amount).toBe(true);
    expect(r.data.min_custom_amount).toBe(10);
  });

  it('reports field errors instead of a row when the form is invalid', () => {
    const r = parseProjectForm(
      formWith({ ...minimal, project_name: '', target_amount: '0' })
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.fields)).toEqual(
      expect.arrayContaining(['project_name', 'target_amount'])
    );
  });
});

describe('parseProjectForm visibility', () => {
  it('keeps a public visibility', () => {
    const r = parseProjectForm(formWith({ ...minimal, visibility: 'public' }));
    expect(r.ok && r.data.visibility).toBe('public');
  });
});

describe('parseLevelRows', () => {
  function rows(list: Record<string, string>[]): FormData {
    const fd = new FormData();
    for (const row of list)
      for (const [k, v] of Object.entries(row)) fd.append(k, v);
    return fd;
  }

  it('returns no levels when the form has no rows', () => {
    expect(parseLevelRows(new FormData())).toEqual({ ok: true, levels: [] });
  });

  it('builds ordered levels with defaults and skips fully empty rows', () => {
    const r = parseLevelRows(
      rows([
        {
          level_name: 'Timbre',
          level_amount: '10',
          level_emoji: '',
          level_description: '',
          level_color: '',
        },
        {
          level_name: '',
          level_amount: '',
          level_emoji: '',
          level_description: '',
          level_color: '',
        },
        {
          level_name: 'Rueda',
          level_amount: '50.5',
          level_emoji: '🛞',
          level_description: 'Una rueda',
          level_color: '#ff0000',
        },
      ])
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.levels).toEqual([
      {
        name: 'Timbre',
        amount: 10,
        emoji: '⭐',
        description: '',
        color: '#6366f1',
        sort_order: 0,
      },
      {
        name: 'Rueda',
        amount: 50.5,
        emoji: '🛞',
        description: 'Una rueda',
        color: '#ff0000',
        sort_order: 1,
      },
    ]);
  });

  it('rejects a row with a name but no valid amount', () => {
    const r = parseLevelRows(
      rows([{ level_name: 'Timbre', level_amount: '0' }])
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Timbre/);
  });
});
