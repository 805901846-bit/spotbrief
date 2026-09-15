import { beforeEach, describe, expect, it } from 'vitest';
import { generateSelector, isStableToken } from '../../src/bookmarklet/selector';

describe('selector generation', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  it('prefers a unique test id', () => {
    document.body.innerHTML = '<button data-testid="delete-order">Delete</button>';
    expect(generateSelector(document.querySelector('button')!)).toBe('[data-testid="delete-order"]');
  });
  it('verifies uniqueness and falls back', () => {
    document.body.innerHTML = '<div><button data-test="action" id="save-order">A</button><button data-test="action">B</button></div>';
    expect(generateSelector(document.querySelector('button')!)).toBe('#save-order');
  });
  it('filters unstable tokens and utility classes', () => {
    expect(isStableToken('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    expect(isStableToken('css-1a2b3c4d')).toBe(false);
    expect(isStableToken('mt-4')).toBe(false);
    expect(isStableToken('danger-button')).toBe(true);
  });
  it('uses a semantic class or nth-of-type path', () => {
    document.body.innerHTML = '<main><button class="px-4 danger-button">A</button><button>B</button></main>';
    expect(generateSelector(document.querySelector('button')!)).toBe('.danger-button');
    expect(generateSelector(document.querySelectorAll('button')[1]!)).toContain('nth-of-type');
  });
});
