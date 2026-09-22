export interface Point { x: number; y: number }
export interface Box { x: number; y: number; width: number; height: number }
export interface MovingBox { left: number; top: number; width: number; height: number }
export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
export interface SnapReference {
  name: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
}
export interface SnapGuide { position: number; label: string }
export interface SnapResult {
  dx: number;
  dy: number;
  vertical?: SnapGuide;
  horizontal?: SnapGuide;
}

export function parseTranslate(transform: string): Point {
  const functionMatch = transform.match(/translate(?:3d)?\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px/i);
  if (functionMatch) return { x: Number(functionMatch[1]), y: Number(functionMatch[2]) };
  const individualMatch = transform.trim().match(/^(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?(?:\s+[-\d.]+px)?$/i);
  return individualMatch ? { x: Number(individualMatch[1]), y: Number(individualMatch[2] || 0) } : { x: 0, y: 0 };
}

function translateComponents(value: string): [string, string] {
  const normalized = value.trim();
  if (!normalized || normalized === 'none') return ['0px', '0px'];
  const parts: string[] = [];
  let depth = 0, start = 0;
  for (let index = 0; index <= normalized.length; index += 1) {
    const character = normalized[index];
    if (character === '(') depth += 1;
    else if (character === ')') depth -= 1;
    if ((character === undefined || /\s/.test(character)) && depth === 0) {
      if (index > start) parts.push(normalized.slice(start, index));
      while (index + 1 < normalized.length && /\s/.test(normalized[index + 1]!)) index += 1;
      start = index + 1;
    }
  }
  return [parts[0] || '0px', parts[1] || '0px'];
}

export function offsetTranslate(value: string, dx: number, dy: number): string {
  const [x, y] = translateComponents(value);
  if ((value.trim() === '' || value.trim() === 'none') && x === '0px' && y === '0px') return `${dx}px ${dy}px`;
  return `calc(${x} + ${dx}px) calc(${y} + ${dy}px)`;
}

export function calculateResize(box: Box, direction: ResizeDirection, dx: number, dy: number, lockAspect: boolean, minimum = 16): Box {
  const east = direction.includes('e');
  const west = direction.includes('w');
  const south = direction.includes('s');
  const north = direction.includes('n');
  let width = box.width + (east ? dx : west ? -dx : 0);
  let height = box.height + (south ? dy : north ? -dy : 0);

  if (lockAspect && direction.length === 2) {
    const ratio = box.width / Math.max(1, box.height);
    if (Math.abs(dx) >= Math.abs(dy)) height = width / ratio;
    else width = height * ratio;
  }

  width = Math.max(minimum, Math.round(width));
  height = Math.max(minimum, Math.round(height));
  return {
    x: west ? Math.round(box.x + box.width - width) : box.x,
    y: north ? Math.round(box.y + box.height - height) : box.y,
    width,
    height
  };
}

export function applyResizeSnap(box: Box, direction: ResizeDirection, snap: Pick<SnapResult, 'dx' | 'dy'>, minimum = 16): Box {
  let { x, y, width, height } = box;
  if (direction.includes('e')) width += snap.dx;
  if (direction.includes('w')) { x += snap.dx; width -= snap.dx; }
  if (direction.includes('s')) height += snap.dy;
  if (direction.includes('n')) { y += snap.dy; height -= snap.dy; }
  return { x, y, width: Math.max(minimum, width), height: Math.max(minimum, height) };
}

interface Candidate extends SnapGuide { delta: number; distance: number }

function closest(candidates: Candidate[], threshold: number): Candidate | undefined {
  return candidates.filter((candidate) => candidate.distance <= threshold).sort((a, b) => a.distance - b.distance)[0];
}

export function findSnap(moving: MovingBox, references: SnapReference[], threshold = 9): SnapResult {
  const movingX = [moving.left, moving.left + moving.width / 2, moving.left + moving.width];
  const movingY = [moving.top, moving.top + moving.height / 2, moving.top + moving.height];
  const xCandidates: Candidate[] = [];
  const yCandidates: Candidate[] = [];

  for (const reference of references) {
    const referenceX = [reference.left, (reference.left + reference.right) / 2, reference.right];
    const referenceY = [reference.top, (reference.top + reference.bottom) / 2, reference.bottom];
    for (const source of movingX) {
      for (const target of referenceX) {
        const delta = target - source;
        xCandidates.push({ delta, distance: Math.abs(delta), position: target, label: `与 ${reference.name} 对齐` });
      }
    }
    for (const source of movingY) {
      for (const target of referenceY) {
        const delta = target - source;
        yCandidates.push({ delta, distance: Math.abs(delta), position: target, label: `与 ${reference.name} 对齐` });
      }
    }
  }

  const x = closest(xCandidates, threshold);
  const y = closest(yCandidates, threshold);
  return {
    dx: x?.delta ?? 0,
    dy: y?.delta ?? 0,
    vertical: x && { position: x.position, label: x.label },
    horizontal: y && { position: y.position, label: y.label }
  };
}

export function findResizeSnap(box: Box, direction: ResizeDirection, references: SnapReference[], threshold = 9): SnapResult {
  const xCandidates: Candidate[] = [];
  const yCandidates: Candidate[] = [];
  const sourceX = direction.includes('w') ? box.x : direction.includes('e') ? box.x + box.width : undefined;
  const sourceY = direction.includes('n') ? box.y : direction.includes('s') ? box.y + box.height : undefined;
  for (const reference of references) {
    if (sourceX !== undefined) for (const target of [reference.left, (reference.left + reference.right) / 2, reference.right]) {
      const delta = target - sourceX;
      xCandidates.push({ delta, distance: Math.abs(delta), position: target, label: `与 ${reference.name} 对齐` });
    }
    if (sourceY !== undefined) for (const target of [reference.top, (reference.top + reference.bottom) / 2, reference.bottom]) {
      const delta = target - sourceY;
      yCandidates.push({ delta, distance: Math.abs(delta), position: target, label: `与 ${reference.name} 对齐` });
    }
  }
  const x = closest(xCandidates, threshold);
  const y = closest(yCandidates, threshold);
  return { dx: x?.delta ?? 0, dy: y?.delta ?? 0, vertical: x && { position: x.position, label: x.label }, horizontal: y && { position: y.position, label: y.label } };
}
