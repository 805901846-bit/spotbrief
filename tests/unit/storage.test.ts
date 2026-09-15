import { beforeEach, describe, expect, it } from 'vitest';
import { defaultPreferences, loadPreferences, resetPanelPosition, savePreferences } from '../../src/bookmarklet/storage';

describe('preferences', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a valid panel position', () => {
    const preferences = { ...defaultPreferences(), panelPosition: { x: 120, y: 80 } };
    expect(savePreferences(preferences)).toBe(true);
    expect(loadPreferences().panelPosition).toEqual({ x: 120, y: 80 });
  });

  it('drops malformed saved coordinates', () => {
    localStorage.setItem('patchbrief:preferences', JSON.stringify({ panelPosition: { x: 'left', y: Infinity } }));
    expect(loadPreferences().panelPosition).toBeUndefined();
  });

  it('resets only the saved panel position', () => {
    savePreferences({ ...defaultPreferences(), collapsed: true, panelPosition: { x: 120, y: 80 } });
    expect(resetPanelPosition()).toBe(true);
    expect(loadPreferences().collapsed).toBe(true);
    expect(loadPreferences().panelPosition).toBeUndefined();
  });
});
