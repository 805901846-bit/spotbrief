import { describe, expect, it } from 'vitest';
import { createVisualSession } from '../../src/bookmarklet/visual-session';

describe('visual session', () => {
  it('restores the exact original inline style after edits', () => {
    const element = document.createElement('div');
    element.setAttribute('style', 'transform: rotate(3deg); color: blue');
    document.body.append(element);
    const session = createVisualSession();

    session.apply(element, { transform: 'rotate(3deg) translate3d(20px, 0, 0)', borderRadius: '12px' });
    session.restoreAll();

    expect(element.getAttribute('style')).toBe('transform: rotate(3deg); color: blue');
  });

  it('removes the style attribute when the element originally had none', () => {
    const element = document.createElement('div');
    document.body.append(element);
    const session = createVisualSession();

    session.apply(element, { width: '160px', height: '80px' });
    session.reset(element);

    expect(element.hasAttribute('style')).toBe(false);
  });

  it('captures an element only once', () => {
    const element = document.createElement('div');
    element.setAttribute('style', 'border-radius: 4px');
    const session = createVisualSession();
    session.apply(element, { borderRadius: '8px' });
    session.apply(element, { borderRadius: '16px' });

    expect(session.originalStyle(element)).toBe('border-radius: 4px');
    session.reset(element);
    expect(element.getAttribute('style')).toBe('border-radius: 4px');
  });
});
