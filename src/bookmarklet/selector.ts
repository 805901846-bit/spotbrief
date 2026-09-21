const utility = /^(?:[mp][trblxy]?|gap|flex|grid|items|justify|text|bg|border|rounded|shadow|w|h|min|max|top|left|right|bottom|absolute|relative|fixed|block|inline|hidden)-/;
const unstable = /^(?:react-select-|:r\d+:|css-|sc-)|[a-f0-9]{12,}|[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}/i;

export function isStableToken(value: string): boolean {
  return value.length > 1 && value.length <= 64 && !unstable.test(value) && !utility.test(value) && !/^\d+$/.test(value);
}

export function cssEscape(value: string): string {
  if (typeof globalThis.CSS !== 'undefined') return CSS.escape(value);
  return value.replace(/(^-?\d)|[^a-zA-Z0-9_-]/g, (char) => `\\${char.codePointAt(0)!.toString(16)} `);
}

function unique(selector: string, root: ParentNode): boolean {
  try { return root.querySelectorAll(selector).length === 1; } catch { return false; }
}

function attrSelector(name: string, value: string): string {
  return `[${name}="${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
}

export function generateSelector(element: Element, root: ParentNode = document): string | undefined {
  for (const name of ['data-testid', 'data-test', 'data-cy', 'data-qa']) {
    const value = element.getAttribute(name);
    if (value && isStableToken(value)) { const candidate = attrSelector(name, value); if (unique(candidate, root)) return candidate; }
  }
  const id = element.id;
  if (id && isStableToken(id)) { const candidate = `#${cssEscape(id)}`; if (unique(candidate, root)) return candidate; }
  for (const name of ['aria-label', 'name', 'title']) {
    const value = element.getAttribute(name);
    if (value && value.length <= 80) { const candidate = attrSelector(name, value); if (unique(candidate, root)) return candidate; }
  }
  for (const token of element.classList) {
    if (isStableToken(token)) { const candidate = `.${cssEscape(token)}`; if (unique(candidate, root)) return candidate; }
  }
  const parts: string[] = [];
  let node: Element | null = element;
  while (node && node !== (root as Document).documentElement && parts.length < 5) {
    let part = node.tagName.toLowerCase();
    const stableClass = [...node.classList].find(isStableToken);
    if (stableClass) part += `.${cssEscape(stableClass)}`;
    else if (node.parentElement) {
      const same = [...node.parentElement.children].filter((child) => child.tagName === node!.tagName);
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
    }
    parts.unshift(part);
    const candidate = parts.join(' > ');
    if (candidate.length <= 180 && unique(candidate, root)) return candidate;
    node = node.parentElement;
  }
  return undefined;
}
