import { describe, expect, it } from 'vitest';
import { authGate, safeNext } from '../src/lib/auth-gate';

const anon = { hasUser: false, isSuperAdmin: false };
const user = { hasUser: true, isSuperAdmin: false };
const admin = { hasUser: true, isSuperAdmin: true };

describe('authGate', () => {
  it('lets everyone into public pages and the account entry points', () => {
    for (const pathname of [
      '/',
      '/123456',
      '/123456/projects/bici',
      '/projects/bici',
      '/privacidad',
    ]) {
      expect(authGate({ pathname, method: 'GET', ...anon })).toBe('allow');
    }
    for (const pathname of [
      '/login',
      '/registro',
      '/recuperar',
      '/auth/confirm',
    ]) {
      expect(authGate({ pathname, method: 'GET', ...anon })).toBe('allow');
      expect(authGate({ pathname, method: 'POST', ...anon })).toBe('allow');
    }
    expect(
      authGate({ pathname: '/api/contributions', method: 'POST', ...anon })
    ).toBe('allow');
  });

  it('asks for login on the backoffice, the account pages and logout without a session', () => {
    for (const pathname of [
      '/admin',
      '/admin/projects/new',
      '/admin/api/draft-project',
      '/cuenta',
      '/cuenta/contrasena',
    ]) {
      expect(authGate({ pathname, method: 'GET', ...anon })).toBe('login');
      expect(authGate({ pathname, method: 'GET', ...user })).toBe('allow');
    }
    expect(authGate({ pathname: '/logout', method: 'POST', ...anon })).toBe(
      'login'
    );
    expect(authGate({ pathname: '/logout', method: 'POST', ...user })).toBe(
      'allow'
    );
    expect(authGate({ pathname: '/logout', method: 'GET', ...anon })).toBe(
      'allow'
    );
  });

  it('reserves the spaces management for superadmins', () => {
    expect(
      authGate({ pathname: '/admin/espacios', method: 'GET', ...anon })
    ).toBe('login');
    expect(
      authGate({ pathname: '/admin/espacios', method: 'GET', ...user })
    ).toBe('forbidden');
    expect(
      authGate({ pathname: '/admin/espacios/salir', method: 'POST', ...user })
    ).toBe('forbidden');
    expect(
      authGate({ pathname: '/admin/espacios', method: 'GET', ...admin })
    ).toBe('allow');
  });
});

describe('safeNext', () => {
  it('accepts internal relative paths only', () => {
    expect(safeNext('/admin/projects/new')).toBe('/admin/projects/new');
    expect(safeNext('/cuenta?x=1')).toBe('/cuenta?x=1');
  });

  it('falls back to /admin for anything that could leave the site', () => {
    expect(safeNext(null)).toBe('/admin');
    expect(safeNext('')).toBe('/admin');
    expect(safeNext('https://evil.example')).toBe('/admin');
    expect(safeNext('//evil.example')).toBe('/admin');
    expect(safeNext('/\\evil.example')).toBe('/admin');
    expect(safeNext('admin')).toBe('/admin');
    expect(safeNext('/login')).toBe('/admin');
  });
});
