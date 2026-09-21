import type { PanelPosition } from '../bookmarklet/types';

interface Size { width: number; height: number }

export function clampPanelPosition(position: PanelPosition, viewport: Size, panel: Size): PanelPosition {
  const maxX=Math.max(0,viewport.width-panel.width);const maxY=Math.max(0,viewport.height-panel.height);
  return { x: Math.min(Math.max(0,position.x),maxX), y: Math.min(Math.max(0,position.y),maxY) };
}

export function defaultPanelPosition(viewport: Size, panel: Size, gap=12): PanelPosition {
  return clampPanelPosition({x:viewport.width-panel.width-gap,y:gap},viewport,panel);
}
