// @vitest-environment happy-dom
// Enlaces del QR: con el JS de modales cargado abren el modal; sin él, navegan a la hoja /qr.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initQrLinks } from '../src/lib/client/qr-modal';

type W = Window & { openModal?: (id: string) => void };

function setup() {
  document.body.innerHTML = `
    <a id="qr" href="/328614/projects/bici/qr" data-qr-modal="qr-p1">QR</a>
    <a id="other" href="/otro">otro</a>`;
  initQrLinks(document);
  return {
    qr: document.getElementById('qr')!,
    other: document.getElementById('other')!,
  };
}

function click(el: Element, init: MouseEventInit = {}) {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  el.dispatchEvent(event);
  return event;
}

describe('initQrLinks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'openModal');
  });

  it('opens the modal instead of following the link', () => {
    const open = vi.fn();
    (window as W).openModal = open;
    const { qr } = setup();
    const event = click(qr);
    expect(event.defaultPrevented).toBe(true);
    expect(open).toHaveBeenCalledWith('qr-p1');
  });

  it('lets the link navigate when the modal helpers are missing', () => {
    const { qr } = setup();
    expect(click(qr).defaultPrevented).toBe(false);
  });

  it('keeps ctrl/cmd clicks and other links untouched', () => {
    const open = vi.fn();
    (window as W).openModal = open;
    const { qr, other } = setup();
    expect(click(qr, { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(click(other).defaultPrevented).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
