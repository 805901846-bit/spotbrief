import { describe, expect, it } from 'vitest';
import { createVisualChangeStore } from '../../src/bookmarklet/visual-changes';

describe('visual change store', () => {
  it('numbers changed elements once and compacts numbers after reset', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const store = createVisualChangeStore();

    store.setStyle(a, '.a', 'borderRadius', '0px', '12px');
    store.setStyle(a, '.a', 'backgroundColor', 'white', 'red');
    store.setStyle(b, '.b', 'borderRadius', '0px', '8px');

    expect(store.list().map((item) => item.number)).toEqual([1, 2]);
    store.reset(a);
    expect(store.list().map((item) => [item.selector, item.number])).toEqual([['.b', 1]]);
  });

  it('removes a property diff when after returns to before', () => {
    const element = document.createElement('div');
    const store = createVisualChangeStore();

    store.setStyle(element, '#card', 'borderRadius', '0px', '12px');
    store.setStyle(element, '#card', 'borderRadius', '0px', '0px');

    expect(store.list()).toEqual([]);
  });

  it('counts a note as one change location and preserves first-change order', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const store = createVisualChangeStore();

    store.setNote(b, '.b', '调整文案层级');
    store.setStyle(a, '.a', 'width', '120px', '180px', 60);

    expect(store.list().map((item) => [item.selector, item.number])).toEqual([
      ['.b', 1],
      ['.a', 2]
    ]);
    expect(store.countDiffs()).toBe(2);
  });

  it('keeps the first before value across repeated edits', () => {
    const element = document.createElement('div');
    const store = createVisualChangeStore();
    store.setStyle(element, '#card', 'translate', '', '10px 0px');
    store.setStyle(element, '#card', 'translate', '10px 0px', '30px 0px');

    expect(store.get(element)?.styles.translate).toEqual({ before: '', after: '30px 0px' });
  });
});
