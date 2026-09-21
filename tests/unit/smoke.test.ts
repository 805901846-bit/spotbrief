import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { VERSION } from '../../src/bookmarklet/types';

describe('project metadata', () => {
  it('exports a semantic version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('publishes SpotBrief 0.2.0 while retaining the compatible runtime filename', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const buildScript = readFileSync('scripts/build.mjs', 'utf8');
    expect(packageJson.name).toBe('spotbrief');
    expect(packageJson.version).toBe('0.2.0');
    expect(buildScript).toContain('spotbrief-bookmarklet.txt');
    expect(buildScript).toContain('patchbrief.runtime.js');
  });
});
