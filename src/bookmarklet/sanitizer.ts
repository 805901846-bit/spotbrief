const sensitive = /token|cookie|authorization|secret|session|csrf|api[-_]?key|password/i;
const entropy = /^[A-Za-z0-9+/_=-]{32,}$/;

export function truncateText(value: string, max = 160): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export function compressQuery(search: string): string | undefined {
  const params = new URLSearchParams(search);
  const output = new URLSearchParams();
  for (const [key, value] of params) {
    if (!value) continue;
    output.append(key, sensitive.test(key) || entropy.test(value) ? '[redacted]' : truncateText(value, 80));
  }
  return output.toString().replaceAll('%5Bredacted%5D', '[redacted]') || undefined;
}

export function sanitizeElementHtml(element: Element, max = 1200): string {
  if (element instanceof HTMLInputElement && element.type === 'password') return '<input type="password">';
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll('script,style,noscript').forEach((node) => node.remove());
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    if (node instanceof HTMLInputElement) {
      node.removeAttribute('value');
      if (node.type === 'password') { [...node.attributes].forEach((a) => a.name !== 'type' && node.removeAttribute(a.name)); }
    }
    if (node instanceof HTMLTextAreaElement) node.textContent = '';
    for (const attr of [...node.attributes]) {
      if (/^on/i.test(attr.name) || attr.name.startsWith('data-patchbrief-') || sensitive.test(attr.name) || entropy.test(attr.value)) node.removeAttribute(attr.name);
    }
  }
  return truncateText(clone.outerHTML, max);
}
