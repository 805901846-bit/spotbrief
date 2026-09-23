import { describe, expect, it } from 'vitest';
import { createFormState, SAFE_DEFAULT_CONSTRAINTS } from '../../src/bookmarklet/form-state';

describe('form state', () => {
  it('starts with the five safe constraints selected', () => {
    expect(createFormState().constraints).toEqual(SAFE_DEFAULT_CONSTRAINTS);
  });

  it('enables AI by default only when an API bridge is configured', () => {
    expect(createFormState(undefined, true).aiOptimize).toBe(true);
    expect(createFormState(undefined, false).aiOptimize).toBe(false);
  });

  it('contains only fields used by the compact task flow', () => {
    expect(createFormState()).toEqual({
      request: '',
      code: '',
      language: 'TSX',
      constraints: [...SAFE_DEFAULT_CONSTRAINTS],
      screenshotNote: '',
      codeOpen: false,
      constraintsOpen: false,
      aiOptimize: false,
    });
  });

  it('uses explicitly saved default constraints', () => {
    expect(createFormState(['保持现有交互']).constraints).toEqual(['保持现有交互']);
  });
});
