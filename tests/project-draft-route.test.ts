import { describe, expect, it } from 'vitest';
import { handleDraftRequest } from '../src/lib/project-draft-route';
import type { ProjectDraft } from '../src/lib/project-draft';

const draft: ProjectDraft = {
  project_name: 'Tablet para Ana',
  slug: 'tablet-ana',
  project_description: '',
  campaign_mode: 'target',
  target_amount: 200,
  currency: 'EUR',
  start_date: null,
  end_date: null,
  base_amount: null,
  base_label: null,
  allow_custom_amount: false,
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
  cta_icon: '🎁',
  cta_title: '',
  cta_text: '',
  theme: 'fiesta',
  levels: [],
  notes: [],
};

function post(body: unknown): Request {
  return new Request('http://x/admin/api/draft-project', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const user = { id: 'u1', email: 'admin@example.com' };
const generate = async () => draft;

describe('handleDraftRequest', () => {
  it('returns 401 without an admin user', async () => {
    const res = await handleDraftRequest(
      post({ brief: 'Una tablet para Ana' }),
      {
        user: null,
        configured: true,
        generate,
      }
    );
    expect(res.status).toBe(401);
  });

  it('returns 503 when the AI key is not configured', async () => {
    const res = await handleDraftRequest(
      post({ brief: 'Una tablet para Ana' }),
      {
        user,
        configured: false,
        generate,
      }
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it('returns 400 for an invalid or non-JSON body', async () => {
    const bad = await handleDraftRequest(post({ brief: 'x' }), {
      user,
      configured: true,
      generate,
    });
    expect(bad.status).toBe(400);
    expect((await bad.json()).fields).toHaveProperty('brief');
    const notJson = await handleDraftRequest(post('{nope'), {
      user,
      configured: true,
      generate,
    });
    expect(notJson.status).toBe(400);
  });

  it('returns the generated draft with 200', async () => {
    let received = '';
    const res = await handleDraftRequest(
      post({ brief: '  Una tablet para Ana  ' }),
      {
        user,
        configured: true,
        generate: async (input) => {
          received = input.kind === 'brief' ? input.brief : '';
          return draft;
        },
      }
    );
    expect(res.status).toBe(200);
    expect(received).toBe('Una tablet para Ana');
    expect((await res.json()).draft.slug).toBe('tablet-ana');
  });

  it('returns 502 with the message when generation fails', async () => {
    const res = await handleDraftRequest(
      post({ brief: 'Una tablet para Ana' }),
      {
        user,
        configured: true,
        generate: async () => {
          throw new Error('La IA no devolvió un borrador válido.');
        },
      }
    );
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe(
      'La IA no devolvió un borrador válido.'
    );
  });

  it('accepts a refine body and passes instructions and the current form to generate', async () => {
    let received: unknown = null;
    const res = await handleDraftRequest(
      post({
        instructions: 'Ponle el nombre de Hugo',
        current: { fields: { project_name: 'Set LEGO' }, levels: [] },
      }),
      {
        user,
        configured: true,
        generate: async (input) => {
          received = input;
          return draft;
        },
      }
    );
    expect(res.status).toBe(200);
    expect(received).toEqual({
      kind: 'refine',
      instructions: 'Ponle el nombre de Hugo',
      current: { fields: { project_name: 'Set LEGO' }, levels: [] },
    });
  });

  it('rejects a body that is neither a brief nor a refine request', async () => {
    const res = await handleDraftRequest(post({ instructions: 'x' }), {
      user,
      configured: true,
      generate,
    });
    expect(res.status).toBe(400);
  });
});
