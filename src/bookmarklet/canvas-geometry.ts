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
  const match = transform.match(/translate(?:3d)?\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px/i);
  return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 };
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
