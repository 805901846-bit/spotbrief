import { describe, expect, it } from 'vitest';
import { clampPanelPosition, defaultPanelPosition } from '../../src/panel/position';

describe('panel position', () => {
  const viewport = { width: 1200, height: 800 };
  const panel = { width: 380, height: 600 };

  it('places the default panel at the top-right gap', () => {
    expect(defaultPanelPosition(viewport, panel)).toEqual({ x: 808, y: 12 });
  });

  it('keeps a dragged panel inside the viewport', () => {
    expect(clampPanelPosition({ x: -50, y: 900 }, viewport, panel)).toEqual({ x: 0, y: 200 });
    expect(clampPanelPosition({ x: 300, y: 100 }, viewport, panel)).toEqual({ x: 300, y: 100 });
  });
});
