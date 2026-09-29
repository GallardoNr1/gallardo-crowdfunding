import { describe, expect, it, vi } from 'vitest';
import {
  buildThankYouEmail,
  notifyContributorThanks,
  type ContributorInfo,
  type OrganizerMail,
} from '../src/lib/notifications';

const info: ContributorInfo = {
  email: 'carmen@example.com',
  contributorName: 'Tía Carmen',
  amount: 25,
  currency: 'EUR',
  levelName: 'Casco',
  projectName: 'Bici para Máximo',
  projectUrl: 'https://gc.example/328614/projects/bici-maximo',
};

describe('buildThankYouEmail', () => {
  it('thanks the contributor, confirms the amount and links to the project', () => {
    const mail = buildThankYouEmail(info);
    expect(mail.subject).toBe(
      '💛 ¡Gracias, Tía Carmen! Tu aportación a "Bici para Máximo" está confirmada'
    );
    expect(mail.text).toContain('25,00 €');
    expect(mail.text).toContain('Casco');
    expect(mail.text).toContain(info.projectUrl);
    expect(mail.html).toContain(`href="${info.projectUrl}"`);
    expect(mail.html).toContain('Ver el proyecto');
  });

  it('works without a level and escapes html', () => {
    const mail = buildThankYouEmail({
      ...info,
      levelName: null,
      contributorName: '<b>Eva</b>',
    });
    expect(mail.text).not.toContain('Nivel');
    expect(mail.html).toContain('&lt;b&gt;Eva&lt;/b&gt;');
  });
});

describe('notifyContributorThanks', () => {
  it('sends the email to the contributor', async () => {
    const send = vi.fn<(mail: OrganizerMail) => Promise<void>>(async () => {});
    const ok = await notifyContributorThanks('c1', {
      send,
      getContributor: async () => info,
    });
    expect(ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0].to).toBe('carmen@example.com');
    expect(send.mock.calls[0]![0].subject).toContain('Tía Carmen');
  });

  it('does nothing without an email and never throws when sending fails', async () => {
    const send = vi.fn(async () => {
      throw new Error('smtp down');
    });
    expect(
      await notifyContributorThanks('c1', {
        send,
        getContributor: async () => null,
      })
    ).toBe(false);
    expect(
      await notifyContributorThanks('c1', {
        send,
        getContributor: async () => ({ ...info, email: '' }),
      })
    ).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(
      await notifyContributorThanks('c1', {
        send,
        getContributor: async () => info,
      })
    ).toBe(false);
  });
});
