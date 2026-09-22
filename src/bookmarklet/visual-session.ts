export type PreviewStyles = Partial<Pick<CSSStyleDeclaration,
  'transform' | 'width' | 'height' | 'borderRadius' | 'backgroundColor' | 'willChange'
>>;

export interface VisualSession {
  capture(element: HTMLElement): void;
  apply(element: HTMLElement, styles: PreviewStyles): void;
  reset(element: HTMLElement): void;
  restoreAll(): void;
  originalStyle(element: HTMLElement): string | null | undefined;
}

export function createVisualSession(): VisualSession {
  const originals = new Map<HTMLElement, string | null>();

  const capture = (element: HTMLElement) => {
    if (!originals.has(element)) originals.set(element, element.getAttribute('style'));
  };

  const restore = (element: HTMLElement, original: string | null) => {
    if (original === null) element.removeAttribute('style');
    else element.setAttribute('style', original);
  };

  return {
    capture,
    apply(element, styles) {
      capture(element);
      Object.assign(element.style, styles);
    },
    reset(element) {
      if (!originals.has(element)) return;
      restore(element, originals.get(element)!);
      originals.delete(element);
    },
    restoreAll() {
      for (const [element, original] of originals) restore(element, original);
      originals.clear();
    },
    originalStyle(element) { return originals.get(element); }
  };
}
