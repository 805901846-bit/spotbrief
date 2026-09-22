import { describe, expect, it } from 'vitest';
import { applyResizeSnap, calculateResize, findResizeSnap, findSnap, offsetTranslate, parseTranslate } from '../../src/bookmarklet/canvas-geometry';

describe('canvas geometry', () => {
  it('parses existing translate without discarding other transforms', () => {
    expect(parseTranslate('rotate(3deg) translate3d(12px, -4px, 0)')).toEqual({ x: 12, y: -4 });
    expect(parseTranslate('translate(8px, 6px) scale(1.1)')).toEqual({ x: 8, y: 6 });
    expect(parseTranslate('12px -4px')).toEqual({ x: 12, y: -4 });
    expect(parseTranslate('12px')).toEqual({ x: 12, y: 0 });
    expect(parseTranslate('none')).toEqual({ x: 0, y: 0 });
  });

  it('composes pixel offsets with percentage and calc translations', () => {
    expect(offsetTranslate('-50% -50%', 8, -4)).toBe('calc(-50% + 8px) calc(-50% + -4px)');
    expect(offsetTranslate('calc(-50% + 8px) calc(-50% - 4px)', 2, 3)).toBe('calc(calc(-50% + 8px) + 2px) calc(calc(-50% - 4px) + 3px)');
    expect(offsetTranslate('none', 2, 3)).toBe('2px 3px');
  });

  it('snaps a moving left edge to a nearby reference left edge', () => {
    const result = findSnap(
      { left: 96, top: 20, width: 50, height: 40 },
      [{ name: '.peer', left: 100, right: 180, top: 20, bottom: 60 }],
      9
    );

    expect(result.dx).toBe(4);
    expect(result.vertical?.label).toContain('.peer');
  });

  it('chooses the closest snap candidate', () => {
    const result = findSnap(
      { left: 96, top: 96, width: 50, height: 40 },
      [
        { name: '.far', left: 101, right: 181, top: 103, bottom: 143 },
        { name: '.near', left: 98, right: 178, top: 99, bottom: 139 }
      ],
      9
    );

    expect(result.dx).toBe(2);
    expect(result.dy).toBe(3);
    expect(result.vertical?.label).toContain('.near');
    expect(result.horizontal?.label).toContain('.near');
  });

  it('resizes from the south-east handle and enforces a minimum', () => {
    expect(calculateResize({ x: 10, y: 20, width: 100, height: 60 }, 'se', -95, -55, false, 16)).toEqual({
      x: 10,
      y: 20,
      width: 16,
      height: 16
    });
  });

  it('keeps aspect ratio while resizing a corner with shift', () => {
    expect(calculateResize({ x: 10, y: 20, width: 100, height: 50 }, 'se', 40, 5, true, 16)).toEqual({
      x: 10,
      y: 20,
      width: 140,
      height: 70
    });
  });
});

describe('applyResizeSnap', () => {
  it('snaps only the active resize edges', () => {
    expect(applyResizeSnap({ x: 10, y: 20, width: 100, height: 50 }, 'se', { dx: 4, dy: -3 })).toEqual({ x: 10, y: 20, width: 104, height: 47 });
    expect(applyResizeSnap({ x: 10, y: 20, width: 100, height: 50 }, 'nw', { dx: 4, dy: -3 })).toEqual({ x: 14, y: 17, width: 96, height: 53 });
    expect(applyResizeSnap({ x: 10, y: 20, width: 100, height: 50 }, 'e', { dx: 4, dy: -3 })).toEqual({ x: 10, y: 20, width: 104, height: 50 });
  });

  it('finds snaps from active edges instead of an already aligned inactive edge', () => {
    const references = [{ name: '#target', left: 114, right: 214, top: 20, bottom: 70 }];
    const snap = findResizeSnap({ x: 10, y: 20, width: 100, height: 50 }, 'e', references, 9);
    expect(snap.dx).toBe(4);
    expect(snap.vertical?.position).toBe(114);
    expect(snap.horizontal).toBeUndefined();
  });
});
