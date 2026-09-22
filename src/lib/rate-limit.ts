export interface RateLimiterOptions {
  /** Ventana en milisegundos. */
  windowMs: number;
  /** Peticiones permitidas por clave dentro de la ventana. */
  max: number;
  /** Inyectable para tests. */
  now?: () => number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

/**
 * Limitador en memoria (un proceso PM2, tráfico familiar). Si algún día hay varios
 * procesos o instancias, sustituir por uno respaldado por Redis/Postgres.
 */
export function createRateLimiter({ windowMs, max, now = Date.now }: RateLimiterOptions) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  function purgeExpired(t: number) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= t) buckets.delete(key);
    }
  }

  return {
    hit(key: string): RateLimitResult {
      const t = now();
      if (buckets.size > 5000) purgeExpired(t);

      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= t) {
        bucket = { count: 0, resetAt: t + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;

      if (bucket.count > max) {
        return { ok: false, retryAfterMs: bucket.resetAt - t };
      }
      return { ok: true, retryAfterMs: 0 };
    },
  };
}
