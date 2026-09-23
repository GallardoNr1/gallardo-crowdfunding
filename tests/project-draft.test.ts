import { describe, expect, it } from 'vitest';
import {
  DraftRequest,
  RefineRequest,
  buildRefineUserMessage,
  ProjectDraft,
  buildDraftSystemPrompt,
  normalizeDraft,
  type ProjectDraftInput,
} from '../src/lib/project-draft';
import { draftToFormValues } from '../src/lib/project-draft-form';
import { THEMES, THEME_IDS } from '../src/lib/themes';

const fullDraft: ProjectDraftInput = {
  project_name: 'Bici para Máximo',
  slug: 'Bici Máximo!!',
  project_description: 'Una bici nueva para su cumpleaños.',
  campaign_mode: 'open',
  target_amount: 300,
  currency: 'EUR',
  start_date: '2026-09-22',
  end_date: '2026-10-29',
  base_amount: 100,
  base_label: 'Papá y mamá',
  allow_custom_amount: true,
  min_custom_amount: 5,
  bizum_concept: 'Bici Máximo',
  pageTitle: '🚴 La bici de Máximo',
  pageSubtitle: 'Ayúdanos a que llegue pedaleando a su cumple',
  productUrl: null,
  progressTitle: '🎯 Progreso',
  contributorsTitle: '✨ Contribuidores',
  photoSectionTitle: '📸 Fotos',
  mainMessage_message: 'Hola familia...',
  mainMessage_signature: 'La familia Gallardo',
  mainMessage_familyName: 'Los Gallardo',
  mainMessage_date: 'Septiembre 2026',
  cta_icon: '🚴',
  cta_title: '¿Nos ayudas?',
  cta_text: 'Cualquier aportación suma.',
  theme: 'aventura',
  levels: [
    {
      name: 'Rueda',
      amount: 50.456,
      emoji: '🛞',
      description: 'Una rueda',
      color: '#ff0000',
    },
    { name: 'Timbre', amount: 10, emoji: '', description: '', color: 'rojo' },
    {
      name: 'Sillín',
      amount: 25,
      emoji: '🪑',
      description: 'Cómodo',
      color: '#00FF00',
    },
  ],
  notes: ['No sé el teléfono de Bizum.', 'No sé el teléfono de Bizum.', ''],
};

describe('DraftRequest', () => {
  it('accepts a trimmed brief between 10 and 4000 characters', () => {
    const r = DraftRequest.safeParse({
      brief: '  Una bici para Máximo, cumple el 5/11  ',
    });
    expect(r.success).toBe(true);
    if (r.success)
      expect(r.data.brief).toBe('Una bici para Máximo, cumple el 5/11');
  });

  it('rejects briefs that are too short, too long or missing', () => {
    expect(DraftRequest.safeParse({ brief: 'corto' }).success).toBe(false);
    expect(DraftRequest.safeParse({ brief: 'x'.repeat(4001) }).success).toBe(
      false
    );
    expect(DraftRequest.safeParse({}).success).toBe(false);
  });
});

describe('ProjectDraft schema', () => {
  it('parses a complete draft', () => {
    expect(ProjectDraft.safeParse(fullDraft).success).toBe(true);
  });

  it('rejects an unknown theme or campaign mode', () => {
    expect(
      ProjectDraft.safeParse({ ...fullDraft, theme: 'oscuro' }).success
    ).toBe(false);
    expect(
      ProjectDraft.safeParse({ ...fullDraft, campaign_mode: 'both' }).success
    ).toBe(false);
  });
});

describe('normalizeDraft', () => {
  it('slugifies the slug and keeps the name', () => {
    const d = normalizeDraft(fullDraft);
    expect(d.slug).toBe('bici-maximo');
    expect(d.project_name).toBe('Bici para Máximo');
  });

  it('clears the money target in open mode and keeps it in target mode', () => {
    expect(normalizeDraft(fullDraft).target_amount).toBeNull();
    const target = normalizeDraft({
      ...fullDraft,
      campaign_mode: 'target',
      target_amount: 199.999,
    });
    expect(target.target_amount).toBe(200);
  });

  it('sorts levels by amount, rounds amounts and fixes emoji and color defaults', () => {
    const d = normalizeDraft(fullDraft);
    expect(d.levels.map((l) => l.name)).toEqual(['Timbre', 'Sillín', 'Rueda']);
    expect(d.levels[2].amount).toBe(50.46);
    expect(d.levels[0].emoji).toBe(THEMES.aventura.emojis.contributor);
    expect(d.levels[0].color).toBe('#6366f1');
    expect(d.levels[1].color).toBe('#00ff00');
  });

  it('drops levels without a name or with a non-positive amount and caps them at 8', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      name: `Nivel ${i}`,
      amount: i + 1,
      emoji: '⭐',
      description: '',
      color: '#111111',
    }));
    const d = normalizeDraft({
      ...fullDraft,
      levels: [
        ...many,
        { name: '', amount: 5, emoji: '', description: '', color: '' },
        { name: 'Cero', amount: 0, emoji: '', description: '', color: '' },
      ],
    });
    expect(d.levels).toHaveLength(8);
    expect(d.levels.every((l) => l.name && l.amount > 0)).toBe(true);
  });

  it('keeps only ISO dates and dedupes non-empty notes', () => {
    const d = normalizeDraft({
      ...fullDraft,
      start_date: '22/09/2026',
      end_date: '2026-10-29',
    });
    expect(d.start_date).toBeNull();
    expect(d.end_date).toBe('2026-10-29');
    expect(d.notes).toEqual(['No sé el teléfono de Bizum.']);
  });

  it('uses the default currency and custom-amount minimum when missing', () => {
    const d = normalizeDraft({
      ...fullDraft,
      currency: '',
      min_custom_amount: null,
    });
    expect(d.currency).toBe('EUR');
    expect(d.min_custom_amount).toBe(5);
  });
});

describe('buildDraftSystemPrompt', () => {
  it('describes today, both campaign modes and every theme', () => {
    const prompt = buildDraftSystemPrompt('2026-09-22');
    expect(prompt).toContain('2026-09-22');
    expect(prompt).toContain('"target"');
    expect(prompt).toContain('"open"');
    for (const id of THEME_IDS) expect(prompt).toContain(`"${id}"`);
    expect(prompt).toMatch(/Bizum/);
  });
});

describe('draftToFormValues', () => {
  it('maps the draft to form field values, with empty strings for nulls', () => {
    const values = draftToFormValues(normalizeDraft(fullDraft));
    expect(values.project_name).toBe('Bici para Máximo');
    expect(values.slug).toBe('bici-maximo');
    expect(values.campaign_mode).toBe('open');
    expect(values.target_amount).toBe('');
    expect(values.base_amount).toBe('100');
    expect(values.allow_custom_amount).toBe(true);
    expect(values.min_custom_amount).toBe('5');
    expect(values.end_date).toBe('2026-10-29');
    expect(values.productUrl).toBe('');
    expect(values.theme).toBe('aventura');
    expect(values).not.toHaveProperty('levels');
    expect(values).not.toHaveProperty('notes');
    expect(values).not.toHaveProperty('bizum_phone');
  });
});

describe('RefineRequest', () => {
  it('accepts instructions with the current form values and levels', () => {
    const r = RefineRequest.safeParse({
      instructions: '  Es para Hugo y cuesta 179,99 €  ',
      current: {
        fields: {
          project_name: 'Set LEGO',
          target_amount: '200',
          allow_custom_amount: true,
        },
        levels: [
          {
            name: 'Ladrillo',
            amount: 10,
            emoji: '🧱',
            description: '',
            color: '#ff0000',
          },
        ],
      },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.instructions).toBe('Es para Hugo y cuesta 179,99 €');
      expect(r.data.current.levels).toHaveLength(1);
    }
  });

  it('rejects empty instructions, a missing current form or extra keys', () => {
    expect(
      RefineRequest.safeParse({ instructions: 'ab', current: { fields: {} } })
        .success
    ).toBe(false);
    expect(
      RefineRequest.safeParse({ instructions: 'Cambia el título' }).success
    ).toBe(false);
    expect(
      RefineRequest.safeParse({
        instructions: 'Cambia el título',
        current: { fields: {} },
        extra: 1,
      }).success
    ).toBe(false);
  });
});

describe('buildRefineUserMessage', () => {
  it('embeds the current form as JSON, the instructions and the keep-the-rest rule', () => {
    const msg = buildRefineUserMessage(
      {
        fields: { project_name: 'Set LEGO', target_amount: '200' },
        levels: [],
      },
      'Es para Hugo'
    );
    expect(msg).toContain('"project_name": "Set LEGO"');
    expect(msg).toContain('Es para Hugo');
    expect(msg).toMatch(/conserva/i);
    expect(msg).toMatch(/completo/i);
  });
});
