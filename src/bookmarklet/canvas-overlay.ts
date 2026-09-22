import type { SnapGuide } from './canvas-geometry';

const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;

export interface OverlayRect { left: number; top: number; width: number; height: number }
export interface CanvasOverlay {
  element: HTMLElement;
  position(rect: OverlayRect): void;
  setSelected(selected: boolean): void;
  setNumber(number?: number): void;
  showGuides(guides: { vertical?: SnapGuide; horizontal?: SnapGuide }): void;
  hideGuides(): void;
  destroy(): void;
}

function createGuide(axis: 'vertical' | 'horizontal') {
  const guide = document.createElement('div');
  guide.dataset.patchbriefUi = 'true';
  guide.dataset.guide = axis;
  Object.assign(guide.style, {
    position: 'fixed',
    display: 'none',
    pointerEvents: 'none',
    zIndex: '2147483644',
    background: '#e66f2c',
    ...(axis === 'vertical' ? { top: '0', bottom: '0', width: '1px' } : { left: '0', right: '0', height: '1px' })
  });
  const label = document.createElement('span');
  Object.assign(label.style, {
    position: 'absolute',
    padding: '3px 6px',
    borderRadius: '5px',
    background: '#2b2723',
    color: '#fff',
    font: '500 10px system-ui,sans-serif',
    whiteSpace: 'nowrap',
    ...(axis === 'vertical' ? { top: '12px', left: '4px' } : { top: '4px', left: '12px' })
  });
  guide.append(label);
  document.documentElement.append(guide);
  return { guide, label };
}

export function createCanvasOverlay(): CanvasOverlay {
  const element = document.createElement('div');
  element.dataset.patchbriefUi = 'true';
  element.className = 'patchbrief-canvas-overlay';
  Object.assign(element.style, {
    position: 'fixed',
    display: 'none',
    pointerEvents: 'none',
    zIndex: '2147483645',
    border: '2px solid #e66f2c',
    boxSizing: 'border-box',
    background: 'rgba(230,111,44,.04)'
  });

  for (const direction of ['n', 'e', 's', 'w'] as const) {
    const edge = document.createElement('div');
    edge.dataset.dragEdge = direction;
    Object.assign(edge.style, {
      position: 'absolute',
      pointerEvents: 'auto',
      ...(direction === 'n' ? { left: '8px', right: '8px', top: '-6px', height: '12px', cursor: 'grab' } : {}),
      ...(direction === 'e' ? { top: '8px', right: '-6px', bottom: '8px', width: '12px', cursor: 'grab' } : {}),
      ...(direction === 's' ? { left: '8px', right: '8px', bottom: '-6px', height: '12px', cursor: 'grab' } : {}),
      ...(direction === 'w' ? { top: '8px', left: '-6px', bottom: '8px', width: '12px', cursor: 'grab' } : {})
    });
    element.append(edge);
  }

  for (const direction of directions) {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.tabIndex = 0;
    handle.dataset.resizeDir = direction;
    handle.setAttribute('aria-label', `调整${direction}方向尺寸`);
    Object.assign(handle.style, {
      position: 'absolute',
      width: '12px',
      height: '12px',
      padding: '0',
      border: '2px solid #e66f2c',
      borderRadius: '3px',
      background: '#fff',
      pointerEvents: 'auto'
    });
    const placements: Record<string, Partial<CSSStyleDeclaration>> = {
      n: { left: 'calc(50% - 6px)', top: '-7px', cursor: 'ns-resize' },
      ne: { right: '-7px', top: '-7px', cursor: 'nesw-resize' },
      e: { right: '-7px', top: 'calc(50% - 6px)', cursor: 'ew-resize' },
      se: { right: '-7px', bottom: '-7px', cursor: 'nwse-resize' },
      s: { left: 'calc(50% - 6px)', bottom: '-7px', cursor: 'ns-resize' },
      sw: { left: '-7px', bottom: '-7px', cursor: 'nesw-resize' },
      w: { left: '-7px', top: 'calc(50% - 6px)', cursor: 'ew-resize' },
      nw: { left: '-7px', top: '-7px', cursor: 'nwse-resize' }
    };
    Object.assign(handle.style, placements[direction]);
    element.append(handle);
  }

  const marker = document.createElement('button');
  marker.type = 'button';
  marker.dataset.changeNumber = '';
  marker.setAttribute('aria-label', '定位到修改位置');
  Object.assign(marker.style, {
    position: 'absolute',
    left: '-13px',
    top: '-13px',
    width: '26px',
    height: '26px',
    padding: '0',
    border: '2px solid #fff',
    borderRadius: '50%',
    background: '#e66f2c',
    color: '#fff',
    font: '700 11px system-ui,sans-serif',
    pointerEvents: 'auto',
    display: 'none'
  });
  element.append(marker);
  document.documentElement.append(element);
  const vertical = createGuide('vertical');
  const horizontal = createGuide('horizontal');

  return {
    element,
    position(rect) {
      Object.assign(element.style, {
        display: 'block', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`
      });
    },
    setSelected(selected) { element.style.borderStyle = selected ? 'solid' : 'dashed'; },
    setNumber(number) {
      marker.style.display = number === undefined ? 'none' : 'block';
      marker.textContent = number === undefined ? '' : String(number);
    },
    showGuides(guides) {
      if (guides.vertical) {
        vertical.guide.style.display = 'block';
        vertical.guide.style.left = `${guides.vertical.position}px`;
        vertical.label.textContent = guides.vertical.label;
      } else vertical.guide.style.display = 'none';
      if (guides.horizontal) {
        horizontal.guide.style.display = 'block';
        horizontal.guide.style.top = `${guides.horizontal.position}px`;
        horizontal.label.textContent = guides.horizontal.label;
      } else horizontal.guide.style.display = 'none';
    },
    hideGuides() { vertical.guide.style.display = 'none'; horizontal.guide.style.display = 'none'; },
    destroy() { element.remove(); vertical.guide.remove(); horizontal.guide.remove(); }
  };
}
