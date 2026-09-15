import { compressQuery, truncateText } from './sanitizer';

export function getAccessibleLabel(element: Element): string {
  const aria = element.getAttribute('aria-label'); if (aria) return truncateText(aria, 100);
  if (element instanceof HTMLElement && element.id) {
    const label = element.ownerDocument.querySelector(`label[for="${element.id.replace(/"/g, '\\"')}"]`);
    if (label?.textContent) return truncateText(label.textContent, 100);
  }
  const wrapped = element.closest('label'); if (wrapped?.textContent) return truncateText(wrapped.textContent, 100);
  for (const name of ['title', 'placeholder', 'alt']) { const value = element.getAttribute(name); if (value) return truncateText(value, 100); }
  const text = truncateText(element.textContent || '', 100); if (text) return text;
  return element.getAttribute('name') || element.tagName.toLowerCase();
}

export function getSemanticRole(element: Element): string {
  const role = element.getAttribute('role'); if (role) return role;
  const tag = element.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tag)) return 'heading';
  const map: Record<string, string> = { a: 'link', button: 'button', textarea: 'textbox', select: 'combobox', img: 'img' };
  if (tag === 'input') return (element as HTMLInputElement).type === 'checkbox' ? 'checkbox' : 'textbox';
  return map[tag] || tag;
}

export function getLocator(element: Element): string { return `${getSemanticRole(element)} "${getAccessibleLabel(element)}"`; }

export function getRegion(element: Element): string | undefined {
  const region = element.closest('dialog,form,nav,main,section,article,aside,header,footer,td,th,li');
  if (!region) return undefined;
  const role = getSemanticRole(region);
  const label = getAccessibleLabel(region);
  return `inside: ${role}${label && label !== role ? ` "${label}"` : ''}`;
}

export function getVisualSummary(element: Element): string {
  const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); const bits = [`${Math.round(rect.width)}×${Math.round(rect.height)}`];
  if (style.display && style.display !== 'block') bits.push(style.display);
  if (style.borderRadius !== '0px') bits.push(`radius ${style.borderRadius}`);
  if (style.borderStyle !== 'none') bits.push(`${style.borderWidth} border`);
  if (style.position !== 'static') bits.push(style.position);
  return bits.join(', ');
}

export function capturePageContext() {
  return { url: location.href, route: location.pathname, query: compressQuery(location.search), title: document.title || undefined, viewport: { width: innerWidth, height: innerHeight, devicePixelRatio } };
}
