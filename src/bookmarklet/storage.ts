import { detectLanguage } from './i18n'; import type { Preferences } from './types';
const key = 'patchbrief:preferences';
export const defaultPreferences = (): Preferences => ({ language: detectLanguage(), collapsed: false, includeHtml: false, includeVisual: true, screenshotHint: true, defaultConstraints: [], rememberDraft: false });
function validPosition(value: unknown): value is { x: number; y: number } { const candidate=value as {x?:unknown;y?:unknown}|null;return Boolean(candidate&&Number.isFinite(candidate.x)&&Number.isFinite(candidate.y)); }
export function loadPreferences(): Preferences { try { const saved=JSON.parse(localStorage.getItem(key) || '{}');const result={ ...defaultPreferences(), ...saved };if(!validPosition(saved.panelPosition))delete result.panelPosition;return result; } catch { return defaultPreferences(); } }
export function savePreferences(value: Preferences): boolean { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
export function resetPanelPosition(): boolean { const preferences=loadPreferences();delete preferences.panelPosition;return savePreferences(preferences); }
