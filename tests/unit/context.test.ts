import { describe, expect, it } from 'vitest';
import { getAccessibleLabel, getLocator, getRegion } from '../../src/bookmarklet/context';
import { resolveTarget } from '../../src/bookmarklet/target-resolver';

describe('element context', () => {
  it('uses accessible label priority and semantic role', () => {
    document.body.innerHTML = '<button aria-label="删除订单">ignored</button>';
    const button = document.querySelector('button')!;
    expect(getAccessibleLabel(button)).toBe('删除订单');
    expect(getLocator(button)).toBe('button "删除订单"');
  });
  it('describes the nearest region', () => {
    document.body.innerHTML = '<dialog aria-label="删除订单"><button>确认</button></dialog>';
    expect(getRegion(document.querySelector('button')!)).toBe('inside: dialog "删除订单"');
  });
  it('promotes icons to interactive parents', () => {
    document.body.innerHTML = '<button><span id="icon">×</span> Delete</button>';
    expect(resolveTarget(document.querySelector('#icon')!)).toBe(document.querySelector('button'));
  });
});
