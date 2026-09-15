import { describe, expect, it } from 'vitest';
import { compressQuery, sanitizeElementHtml, truncateText } from '../../src/bookmarklet/sanitizer';

describe('privacy helpers', () => {
  it('normalizes and truncates text', () => expect(truncateText('  one\n two  ', 6)).toBe('one tw…'));
  it('compresses query values', () => expect(compressQuery('?q=hello&token=secret&empty=')).toBe('q=hello&token=[redacted]'));
  it('removes executable and sensitive content without mutating source', () => {
    const host = document.createElement('div');
    host.innerHTML = '<input type="text" value="private" oninput="steal()"><script>x()</script><span data-patchbrief-id="1" title="ok">Hello</span>';
    const result = sanitizeElementHtml(host);
    expect(result).not.toContain('private');
    expect(result).not.toContain('script');
    expect(result).not.toContain('oninput');
    expect(result).not.toContain('patchbrief');
    expect(host.querySelector('input')?.getAttribute('value')).toBe('private');
  });
  it('reduces password inputs', () => {
    const input = document.createElement('input'); input.type = 'password'; input.value = 'secret'; input.setAttribute('name', 'password');
    expect(sanitizeElementHtml(input)).toBe('<input type="password">');
  });
});
