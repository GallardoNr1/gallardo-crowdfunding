import { describe, expect, it, vi } from 'vitest';
import {
  buildContributionEmail,
  buildSupportMessageEmail,
  notifyContribution,
  notifySupportMessage,
  type OrganizerMail,
} from '../src/lib/notifications';

describe('buildContributionEmail', () => {
  it('describes the contribution and links to the confirmation page', () => {
    const mail = buildContributionEmail({
      projectName: 'Bici para Máximo',
      contributorName: 'Tía Carmen',
      amount: 25,
      currency: 'EUR',
      levelName: 'Casco',
      paymentMethod: 'bizum',
      message: '¡Que lo disfrute!',
      adminUrl: 'https://gc.example/admin/projects/p1/contributions',
    });
    expect(mail.subject).toBe(
      '💛 Nueva aportación de Tía Carmen a "Bici para Máximo" (25,00 €)'
    );
    expect(mail.text).toContain('Bizum');
    expect(mail.text).toContain('Casco');
    expect(mail.text).toContain('¡Que lo disfrute!');
    expect(mail.text).toContain(
      'https://gc.example/admin/projects/p1/contributions'
    );
    expect(mail.html).toContain(
      'href="https://gc.example/admin/projects/p1/contributions"'
    );
    expect(mail.html).not.toContain('<script');
  });

  it('escapes html in names and messages', () => {
    const mail = buildContributionEmail({
      projectName: 'P',
      contributorName: '<b>Eva</b>',
      amount: 5,
      currency: 'EUR',
      levelName: 'Aportación libre',
      paymentMethod: 'cash',
      message: null,
      adminUrl: 'https://gc.example/admin',
    });
    expect(mail.html).toContain('&lt;b&gt;Eva&lt;/b&gt;');
    expect(mail.text).toContain('Efectivo');
  });
});

describe('buildSupportMessageEmail', () => {
  it('quotes the message and links to the moderation page', () => {
    const mail = buildSupportMessageEmail({
      projectName: 'Bici para Máximo',
      authorName: 'Vecina Rosa',
      message: 'Qué mayor está ya…',
      adminUrl: 'https://gc.example/admin/projects/p1/messages',
    });
    expect(mail.subject).toBe(
      '💬 Mensaje de apoyo pendiente de Vecina Rosa en "Bici para Máximo"'
    );
    expect(mail.text).toContain('Qué mayor está ya…');
    expect(mail.text).toContain('/admin/projects/p1/messages');
  });
});

describe('notifyContribution / notifySupportMessage', () => {
  const owner = {
    email: 'ana@example.com',
    projectName: 'Bici',
    currency: 'EUR',
  };

  it('sends the email to the project owner', async () => {
    const send = vi.fn<(mail: OrganizerMail) => Promise<void>>(async () => {});
    const ok = await notifyContribution(
      'p1',
      {
        contributor_name: 'Tía Carmen',
        amount: 25,
        level_name: 'Casco',
        payment_method: 'bizum',
        message: null,
      },
      {
        send,
        getOwnerEmail: async () => owner,
        siteOrigin: 'https://gc.example',
      }
    );
    expect(ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0]![0];
    expect(mail.to).toBe('ana@example.com');
    expect(mail.subject).toContain('Tía Carmen');
    expect(mail.text).toContain(
      'https://gc.example/admin/projects/p1/contributions'
    );
  });

  it('does nothing without an owner email and never throws when sending fails', async () => {
    const send = vi.fn(async () => {
      throw new Error('smtp down');
    });
    expect(
      await notifySupportMessage(
        'p1',
        { author_name: 'Rosa', message: 'Hola' },
        {
          send,
          getOwnerEmail: async () => null,
          siteOrigin: 'https://gc.example',
        }
      )
    ).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(
      await notifySupportMessage(
        'p1',
        { author_name: 'Rosa', message: 'Hola' },
        {
          send,
          getOwnerEmail: async () => owner,
          siteOrigin: 'https://gc.example',
        }
      )
    ).toBe(false);
  });
});
