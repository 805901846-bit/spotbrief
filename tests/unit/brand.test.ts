import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

  it('uses the SpotBrief identity throughout the install page', () => {
    const html = readFileSync('src/install-page/index.html', 'utf8');
    expect(html).toContain('在网页上改，让任务书自己说清楚。');
    expect(html).toContain('SpotBrief');
    expect(html).not.toContain('PatchBrief');
  });
});
