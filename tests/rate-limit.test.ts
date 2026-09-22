import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../src/lib/rate-limit';

describe('createRateLimiter', () => {
  it('allows up to max hits within the window and then blocks', () => {
    let now = 1_000;
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, now: () => now });
    expect(limiter.hit('ip-1').ok).toBe(true);
    expect(limiter.hit('ip-1').ok).toBe(true);
    expect(limiter.hit('ip-1').ok).toBe(true);
    const blocked = limiter.hit('ip-1');
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(60_000);
    now += 60_001;
    expect(limiter.hit('ip-1').ok).toBe(true);
  });

  it('tracks keys independently', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, now: () => 0 });
    expect(limiter.hit('a').ok).toBe(true);
    expect(limiter.hit('b').ok).toBe(true);
    expect(limiter.hit('a').ok).toBe(false);
  });
});
