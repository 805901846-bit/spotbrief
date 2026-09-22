export const BRAND_NAME = 'SpotBrief';
export const VERSION = '0.2.0';
export type Language = 'zh-CN' | 'en';
export interface RectSnapshot { x: number; y: number; width: number; height: number }
export interface PanelPosition { x: number; y: number }
export type EditableStyleProperty = 'translate' | 'width' | 'height' | 'borderRadius' | 'backgroundColor';
export interface StyleDiff { before: string; after: string; delta?: number }
export interface VisualChangeRecord {
  number: number;
  element: Element;
  selector: string;
  note: string;
  styles: Partial<Record<EditableStyleProperty, StyleDiff>>;
  snapNote?: string;
}
export interface BriefVisualChange extends Omit<VisualChangeRecord, 'element'> {}
export interface SelectionRecord {
  id: string; element: Element; label: string; tag: string; text?: string;
  selector?: string; locator?: string; region?: string; rect: RectSnapshot;
  visual?: string; html?: string; note?: string; invalid?: boolean;
}
export interface BriefSelection extends Omit<SelectionRecord, 'element' | 'id' | 'rect'> { index: number; rect?: RectSnapshot }
export interface BriefDraft {
  version: string;
  page: { url: string; route: string; query?: string; title?: string; viewport: { width: number; height: number; devicePixelRatio: number } };
  selections: BriefSelection[];
  request: string;
  relatedCode?: { language: string; content: string };
  constraints: string[];
  expectedResult?: string;
  screenshot?: { filename?: string; description?: string };
  visualChanges?: BriefVisualChange[];
}
export interface Preferences {
  language: Language; collapsed: boolean; includeHtml: boolean; includeVisual: boolean;
  screenshotHint: boolean; defaultConstraints: string[]; rememberDraft: boolean;
  panelPosition?: PanelPosition;
}
export interface PatchBriefController {
  readonly version: string; open(): void; pause(): void; resume(): void; destroy(): void;
}
declare global { interface Window { __PATCHBRIEF__?: PatchBriefController; __PATCHBRIEF_AI_BRIDGE__?: { url: string; token: string } } }
