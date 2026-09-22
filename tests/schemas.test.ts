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
    expect(ContributionInput.safeParse({ ...valid, paymentMethod: 'paypal' }).success).toBe(false);
    expect(ContributionInput.safeParse({ ...valid, contributorEmail: 'nope' }).success).toBe(false);
  });

  it('rejects a message longer than 150 characters', () => {
    expect(ContributionInput.safeParse({ ...valid, message: 'x'.repeat(151) }).success).toBe(false);
  });
});

describe('SupportMessageInput', () => {
  it('accepts a message with optional author fields', () => {
    const r = SupportMessageInput.safeParse({ projectId: uuid, message: 'Ánimo' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.authorName).toBeUndefined();
      expect(r.data.authorEmail).toBeUndefined();
    }
  });

  it('treats an empty email string as absent', () => {
    const r = SupportMessageInput.safeParse({ projectId: uuid, message: 'Ánimo', authorEmail: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.authorEmail).toBeUndefined();
  });

  it('rejects a blank message and one over 200 characters', () => {
    expect(SupportMessageInput.safeParse({ projectId: uuid, message: '   ' }).success).toBe(false);
    expect(SupportMessageInput.safeParse({ projectId: uuid, message: 'x'.repeat(201) }).success).toBe(false);
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
    expect(ProjectFormInput.safeParse({ ...valid, target_amount: '0' }).success).toBe(false);
    expect(ProjectFormInput.safeParse({ ...valid, project_status: 'deleted' }).success).toBe(false);
  });

  it('rejects a slug with characters outside [a-z0-9-]', () => {
    expect(ProjectFormInput.safeParse({ ...valid, slug: 'ñandú!' }).success).toBe(false);
  });

  it('turns empty optional strings into null', () => {
    const r = ProjectFormInput.safeParse({ ...valid, end_date: '', project_image_url: '' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.end_date).toBeNull();
      expect(r.data.project_image_url).toBeNull();
    }
  });
});
