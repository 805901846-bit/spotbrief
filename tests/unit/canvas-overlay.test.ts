import { afterEach, expect, it } from 'vitest';
import { createCanvasOverlay } from '../../src/bookmarklet/canvas-overlay';

afterEach(() => { document.body.innerHTML = ''; });

it('renders eight keyboard-focusable resize handles and a change marker', () => {
  const overlay = createCanvasOverlay();
  overlay.setNumber(3);

  expect(overlay.element.querySelectorAll('[data-resize-dir]')).toHaveLength(8);
  expect(overlay.element.querySelectorAll('[data-resize-dir][tabindex="0"]')).toHaveLength(8);
  expect(overlay.element.querySelector('[data-change-number]')?.textContent).toBe('3');

  overlay.destroy();
});

it('positions the overlay and guide lines in viewport coordinates', () => {
  const overlay = createCanvasOverlay();
  overlay.position({ left: 12, top: 24, width: 120, height: 60 });
  overlay.showGuides({ vertical: { position: 80, label: '水平居中' }, horizontal: { position: 44, label: '顶部对齐' } });

  expect(overlay.element.style.left).toBe('12px');
  expect(overlay.element.style.width).toBe('120px');
  expect(document.querySelector<HTMLElement>('[data-guide="vertical"]')?.style.left).toBe('80px');
  expect(document.querySelector<HTMLElement>('[data-guide="horizontal"]')?.style.top).toBe('44px');

  overlay.destroy();
});
