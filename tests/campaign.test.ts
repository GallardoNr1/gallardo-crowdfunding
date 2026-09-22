import { describe, expect, it } from 'vitest';
import {
  campaignTimeline,
  campaignTotals,
  daysLeft,
  formatEndDate,
  isCampaignOpen,
} from '../src/lib/campaign';

const sep22 = new Date('2026-09-22T10:00:00Z');

describe('isCampaignOpen', () => {
  it('is open while active and without end date', () => {
    expect(isCampaignOpen({ project_status: 'active', end_date: null }, sep22)).toBe(true);
  });

  it('stays open during the whole end date and closes the day after', () => {
    const p = { project_status: 'active', end_date: '2026-10-29' };
    expect(isCampaignOpen(p, new Date('2026-10-29T23:59:00Z'))).toBe(true);
    expect(isCampaignOpen(p, new Date('2026-10-30T00:00:01Z'))).toBe(false);
  });

  it('accepts a timestamptz end date', () => {
    const p = { project_status: 'active', end_date: '2026-10-29T00:00:00+00:00' };
    expect(isCampaignOpen(p, sep22)).toBe(true);
  });

  it('is closed when the project is not active', () => {
    expect(isCampaignOpen({ project_status: 'paused', end_date: null }, sep22)).toBe(false);
    expect(isCampaignOpen({ project_status: 'completed', end_date: null }, sep22)).toBe(false);
  });
});

describe('daysLeft', () => {
  it('counts whole days until the end date, the end date itself being day 0', () => {
    expect(daysLeft('2026-10-29', sep22)).toBe(37);
    expect(daysLeft('2026-10-29', new Date('2026-10-29T10:00:00Z'))).toBe(0);
  });

  it('never goes negative and is null without end date', () => {
    expect(daysLeft('2026-10-29', new Date('2026-11-05T00:00:00Z'))).toBe(0);
    expect(daysLeft(null, sep22)).toBeNull();
  });
});

describe('campaignTotals', () => {
  it('adds the family base to what was raised', () => {
    expect(campaignTotals({ current_amount: '130.5', base_amount: 150 })).toEqual({
      raised: 130.5,
      base: 150,
      total: 280.5,
    });
  });

  it('treats a missing base as 0', () => {
    expect(campaignTotals({ current_amount: 40 })).toEqual({ raised: 40, base: 0, total: 40 });
  });
});

describe('formatEndDate', () => {
  it('formats the day and month in Spanish', () => {
    expect(formatEndDate('2026-10-29')).toBe('29 de octubre');
    expect(formatEndDate('2026-10-29T00:00:00+00:00')).toBe('29 de octubre');
  });

  it('returns an empty string without end date', () => {
    expect(formatEndDate(null)).toBe('');
  });
});

describe('campaignTimeline', () => {
  const start = '2026-09-22';
  const end = '2026-10-29';

  it('counts the campaign days inclusively and starts at day 1', () => {
    const t = campaignTimeline(start, end, new Date('2026-09-22T10:00:00Z'));
    expect(t).not.toBeNull();
    expect(t!.totalDays).toBe(38);
    expect(t!.dayNumber).toBe(1);
    expect(Math.round(t!.percent)).toBe(1);
  });

  it('reaches the last day and 100% after the deadline, never beyond', () => {
    const lastDay = campaignTimeline(start, end, new Date('2026-10-29T10:00:00Z'));
    expect(lastDay!.dayNumber).toBe(38);
    expect(lastDay!.percent).toBeGreaterThan(95);
    expect(lastDay!.percent).toBeLessThan(100);
    const after = campaignTimeline(start, end, new Date('2026-11-05T00:00:00Z'));
    expect(after!.dayNumber).toBe(38);
    expect(after!.percent).toBe(100);
  });

  it('clamps to day 1 and 0% before the start date', () => {
    const before = campaignTimeline(start, end, new Date('2026-09-20T00:00:00Z'));
    expect(before!.dayNumber).toBe(1);
    expect(before!.percent).toBe(0);
  });

  it('returns null without dates or with an end before the start', () => {
    expect(campaignTimeline(null, end, new Date())).toBeNull();
    expect(campaignTimeline(start, null, new Date())).toBeNull();
    expect(campaignTimeline('2026-11-01', end, new Date())).toBeNull();
  });
});
