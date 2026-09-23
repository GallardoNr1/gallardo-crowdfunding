import { describe, expect, it } from 'vitest';
import {
  ContributionInput,
  ProjectFormInput,
  SupportMessageInput,
} from '../src/lib/schemas';

const uuid = '2197928e-d41f-42f3-8c68-e1f01534fa9e';

describe('ContributionInput', () => {
  const valid = {
    projectId: uuid,
    levelId: uuid,
    contributorName: '  Ana  ',
    contributorEmail: 'Ana@Example.com',
    contributorEmoji: '💛',
    message: 'Con cariño',
    paymentMethod: 'bizum',
    isAnonymous: false,
  };

  it('accepts a valid payload, trimming the name and lowercasing the email', () => {
    const r = ContributionInput.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.contributorName).toBe('Ana');
      expect(r.data.contributorEmail).toBe('ana@example.com');
    }
  });

  it('rejects a client-supplied amount (the server derives it from the level)', () => {
    const r = ContributionInput.safeParse({ ...valid, amount: 9999 });
    expect(r.success).toBe(false);
  });

  it('rejects an unknown payment method and a bad email', () => {
    expect(
      ContributionInput.safeParse({ ...valid, paymentMethod: 'paypal' }).success
    ).toBe(false);
    expect(
      ContributionInput.safeParse({ ...valid, contributorEmail: 'nope' })
        .success
    ).toBe(false);
  });

  it('rejects a message longer than 150 characters', () => {
    expect(
      ContributionInput.safeParse({ ...valid, message: 'x'.repeat(151) })
        .success
    ).toBe(false);
  });

  it('accepts a custom amount instead of a level', () => {
    const { levelId: _omit, ...rest } = valid;
    const r = ContributionInput.safeParse({ ...rest, customAmount: 12.5 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.customAmount).toBe(12.5);
      expect(r.data.levelId).toBeUndefined();
    }
  });

  it('requires exactly one of levelId or customAmount', () => {
    const { levelId: _omit, ...rest } = valid;
    expect(ContributionInput.safeParse(rest).success).toBe(false);
    expect(
      ContributionInput.safeParse({ ...valid, customAmount: 10 }).success
    ).toBe(false);
    expect(
      ContributionInput.safeParse({ ...rest, customAmount: 0 }).success
    ).toBe(false);
  });
});

describe('SupportMessageInput', () => {
  it('accepts a message with optional author fields', () => {
    const r = SupportMessageInput.safeParse({
      projectId: uuid,
      message: 'Ánimo',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.authorName).toBeUndefined();
      expect(r.data.authorEmail).toBeUndefined();
    }
  });

  it('treats an empty email string as absent', () => {
    const r = SupportMessageInput.safeParse({
      projectId: uuid,
      message: 'Ánimo',
      authorEmail: '',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.authorEmail).toBeUndefined();
  });

  it('rejects a blank message and one over 200 characters', () => {
    expect(
      SupportMessageInput.safeParse({ projectId: uuid, message: '   ' }).success
    ).toBe(false);
    expect(
      SupportMessageInput.safeParse({
        projectId: uuid,
        message: 'x'.repeat(201),
      }).success
    ).toBe(false);
  });
});

describe('ProjectFormInput', () => {
  const valid = {
    project_name: 'Tablet',
    slug: ' Tablet Ana ',
    project_status: 'active',
    target_amount: '200.50',
    currency: 'EUR',
  };

  it('normalizes the slug and coerces the amount', () => {
    const r = ProjectFormInput.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.slug).toBe('tablet-ana');
      expect(r.data.target_amount).toBe(200.5);
    }
  });

  it('rejects a zero target and an invalid status', () => {
    expect(
      ProjectFormInput.safeParse({ ...valid, target_amount: '0' }).success
    ).toBe(false);
    expect(
      ProjectFormInput.safeParse({ ...valid, project_status: 'deleted' })
        .success
    ).toBe(false);
  });

  it('rejects a slug with characters outside [a-z0-9-]', () => {
    expect(
      ProjectFormInput.safeParse({ ...valid, slug: 'ñandú!' }).success
    ).toBe(false);
  });

  it('defaults visibility to private and only accepts public or private', () => {
    const r = ProjectFormInput.safeParse(valid);
    expect(r.success && r.data.visibility).toBe('private');
    const pub = ProjectFormInput.safeParse({ ...valid, visibility: 'public' });
    expect(pub.success && pub.data.visibility).toBe('public');
    expect(
      ProjectFormInput.safeParse({ ...valid, visibility: 'secreto' }).success
    ).toBe(false);
  });

  it('turns empty optional strings into null', () => {
    const r = ProjectFormInput.safeParse({
      ...valid,
      end_date: '',
      project_image_url: '',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.end_date).toBeNull();
      expect(r.data.project_image_url).toBeNull();
    }
  });

  it('defaults to a target campaign without base or custom amounts', () => {
    const r = ProjectFormInput.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.campaign_mode).toBe('target');
      expect(r.data.base_amount).toBe(0);
      expect(r.data.allow_custom_amount).toBe(false);
      expect(r.data.min_custom_amount).toBe(5);
    }
  });

  it('accepts an open campaign with no target, a base amount and custom amounts', () => {
    const r = ProjectFormInput.safeParse({
      ...valid,
      campaign_mode: 'open',
      target_amount: '',
      end_date: '2026-10-29',
      base_amount: '150',
      base_label: 'Papá y mamá',
      allow_custom_amount: 'on',
      min_custom_amount: '5',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.target_amount).toBe(0);
      expect(r.data.base_amount).toBe(150);
      expect(r.data.base_label).toBe('Papá y mamá');
      expect(r.data.allow_custom_amount).toBe(true);
      expect(r.data.end_date).toBe('2026-10-29');
    }
  });

  it('defaults the theme to fiesta and rejects unknown themes', () => {
    const r = ProjectFormInput.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.theme).toBe('fiesta');
    const ok = ProjectFormInput.safeParse({ ...valid, theme: 'aventura' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.theme).toBe('aventura');
    expect(
      ProjectFormInput.safeParse({ ...valid, theme: 'neon' }).success
    ).toBe(false);
  });

  it('requires an end date for open campaigns and a positive target for target campaigns', () => {
    expect(
      ProjectFormInput.safeParse({
        ...valid,
        campaign_mode: 'open',
        target_amount: '',
      }).success
    ).toBe(false);
    expect(
      ProjectFormInput.safeParse({ ...valid, target_amount: '' }).success
    ).toBe(false);
  });
});
