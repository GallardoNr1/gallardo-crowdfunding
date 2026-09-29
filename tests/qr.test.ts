import { describe, expect, it } from 'vitest';
import { projectQrSvg } from '../src/lib/qr';

describe('projectQrSvg', () => {
  it('renders an inline svg for the given url', async () => {
    const svg = await projectQrSvg('https://gc.example/328614/projects/bici');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox');
    expect(svg).toContain('</svg>');
  });
});
