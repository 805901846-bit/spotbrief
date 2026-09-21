import { beforeEach, describe, expect, it } from 'vitest';
import { loadAiSettings, saveAiSettings } from '../../src/install-page/ai-settings';

describe('AI settings', () => {
  beforeEach(() => localStorage.clear());

  it('stores API credentials only in the settings origin local storage', () => {
    saveAiSettings({ apiKey: 'sk-example', baseUrl: 'https://api.example.com/v1', model: 'small-model' });

    expect(loadAiSettings()).toEqual({ apiKey: 'sk-example', baseUrl: 'https://api.example.com/v1', model: 'small-model' });
    expect(JSON.stringify(loadAiSettings())).not.toContain('patchbrief:preferences');
  });

  it('normalizes a trailing slash from the API base URL', () => {
    saveAiSettings({ apiKey: 'key', baseUrl: 'https://api.example.com/v1/', model: 'model' });
    expect(loadAiSettings().baseUrl).toBe('https://api.example.com/v1');
  });
});
