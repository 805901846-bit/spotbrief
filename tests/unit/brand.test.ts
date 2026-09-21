import { describe, expect, it } from 'vitest';
import { BRAND_NAME, VERSION } from '../../src/bookmarklet/types';
import { loadPreferences } from '../../src/bookmarklet/storage';

describe('SpotBrief brand contract', () => {
  it('uses the SpotBrief 0.2.0 public identity', () => {
    expect(BRAND_NAME).toBe('SpotBrief');
    expect(VERSION).toBe('0.2.0');
  });

  it('continues reading the historical preference key', () => {
    localStorage.setItem('patchbrief:preferences', JSON.stringify({ collapsed: true }));
    expect(loadPreferences().collapsed).toBe(true);
  });
});
