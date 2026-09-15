import { describe, expect, it } from 'vitest';
import { createFormState, SAFE_DEFAULT_CONSTRAINTS } from '../../src/bookmarklet/form-state';

describe('form state', () => {
  it('starts with the five safe constraints selected', () => {
    expect(createFormState().constraints).toEqual(SAFE_DEFAULT_CONSTRAINTS);
  });

  it('keeps optional sections collapsed initially', () => {
    expect(createFormState()).toMatchObject({ codeOpen: false, constraintsOpen: false });
  });

  it('uses explicitly saved default constraints', () => {
    expect(createFormState(['保持现有交互']).constraints).toEqual(['保持现有交互']);
  });
});
