import { describe, expect, it } from 'vitest';
import { isValidCaptureRect, mapRectToVideo, normalizeRect } from '../../src/bookmarklet/screenshot';

describe('screenshot geometry', () => {
  it('normalizes a drag made from bottom-right to top-left', () => {
    expect(normalizeRect({ x: 180, y: 120 }, { x: 30, y: 20 })).toEqual({ x: 30, y: 20, width: 150, height: 100 });
  });

  it('rejects regions smaller than twenty CSS pixels', () => {
    expect(isValidCaptureRect({ x: 0, y: 0, width: 19, height: 80 })).toBe(false);
    expect(isValidCaptureRect({ x: 0, y: 0, width: 20, height: 20 })).toBe(true);
  });

  it('maps viewport coordinates to video pixels', () => {
    expect(mapRectToVideo(
      { x: 100, y: 50, width: 300, height: 200 },
      { width: 1000, height: 500 },
      { width: 2000, height: 1000 },
    )).toEqual({ x: 200, y: 100, width: 600, height: 400 });
  });
});
