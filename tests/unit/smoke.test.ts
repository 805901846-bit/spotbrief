import { describe, expect, it } from 'vitest';
import { VERSION } from '../../src/bookmarklet/types';

describe('project metadata', () => {
  it('exports a semantic version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
