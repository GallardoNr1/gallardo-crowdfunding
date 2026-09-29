import { describe, expect, it } from 'vitest';
import { countByProject, pendingSummary } from '../src/lib/pending';

describe('countByProject', () => {
  it('counts rows per project and tolerates null', () => {
    expect(
      countByProject([
        { project_id: 'a' },
        { project_id: 'b' },
        { project_id: 'a' },
      ])
    ).toEqual({ a: 2, b: 1 });
    expect(countByProject(null)).toEqual({});
  });
});

describe('pendingSummary', () => {
  it('is null when nothing is pending', () => {
    expect(pendingSummary(0, 0)).toBeNull();
  });

  it('describes contributions and messages with the right plurals', () => {
    expect(pendingSummary(1, 0)).toBe('1 aportación por confirmar');
    expect(pendingSummary(3, 0)).toBe('3 aportaciones por confirmar');
    expect(pendingSummary(0, 1)).toBe('1 mensaje por moderar');
    expect(pendingSummary(2, 4)).toBe(
      '2 aportaciones por confirmar y 4 mensajes por moderar'
    );
  });
});
