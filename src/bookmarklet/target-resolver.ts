const preferred = 'button,a,input,select,textarea,label,img,video,canvas,svg,iframe,h1,h2,h3,h4,h5,h6,li,td,th,[role]';
const excluded = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TEMPLATE', 'NOSCRIPT']);

export function isMeaningfulElement(element: Element): boolean {
  if (excluded.has(element.tagName) || element.closest('[data-patchbrief-ui]')) return false;
  const style = getComputedStyle(element); const rect = element.getBoundingClientRect();
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  if (rect.width > 0 || rect.height > 0) return true;
  return Boolean(element.matches(preferred) || element.textContent?.trim());
}

export function resolveTarget(start: Element): Element | null {
  if (!isMeaningfulElement(start)) return null;
  const interactive = start.closest(preferred);
  if (interactive && isMeaningfulElement(interactive)) return interactive;
  return start;
}
