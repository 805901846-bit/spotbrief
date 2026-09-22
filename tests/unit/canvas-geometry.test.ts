import { describe, expect, it } from 'vitest';
import { calculateResize, findSnap, parseTranslate } from '../../src/bookmarklet/canvas-geometry';

describe('canvas geometry', () => {
  it('parses existing translate without discarding other transforms', () => {
    expect(parseTranslate('rotate(3deg) translate3d(12px, -4px, 0)')).toEqual({ x: 12, y: -4 });
    expect(parseTranslate('translate(8px, 6px) scale(1.1)')).toEqual({ x: 8, y: 6 });
    expect(parseTranslate('none')).toEqual({ x: 0, y: 0 });
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
