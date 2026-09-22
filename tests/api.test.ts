import { describe, expect, it } from 'vitest';
import { clientIp, json, readJson } from '../src/lib/api';

describe('clientIp', () => {
  it('takes the first address of X-Forwarded-For (nginx delante)', () => {
    const req = new Request('http://x', {
      headers: { 'x-forwarded-for': ' 203.0.113.9 , 10.0.0.1' },
    });
    expect(clientIp(req, '127.0.0.1')).toBe('203.0.113.9');
  });

  it('falls back to the socket address when the header is missing', () => {
    expect(clientIp(new Request('http://x'), '127.0.0.1')).toBe('127.0.0.1');
  });
});

describe('json', () => {
  it('serializes with the JSON content type and the given status', async () => {
    const res = json({ ok: true }, { status: 201, headers: { 'Retry-After': '5' } });
    expect(res.status).toBe(201);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.headers.get('retry-after')).toBe('5');
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('readJson', () => {
  it('returns undefined for a body that is not JSON', async () => {
    const req = new Request('http://x', { method: 'POST', body: '{nope' });
    expect(await readJson(req)).toBeUndefined();
  });

  it('parses a JSON body', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
      headers: { 'content-type': 'application/json' },
    });
    expect(await readJson(req)).toEqual({ a: 1 });
  });
});
