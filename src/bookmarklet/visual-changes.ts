import type { EditableStyleProperty, StyleDiff, VisualChangeRecord } from './types';

interface InternalRecord {
  element: Element;
  selector: string;
  note: string;
  styles: Partial<Record<EditableStyleProperty, StyleDiff>>;
  snapNote?: string;
  order: number;
}

export interface VisualChangeStore {
  setStyle(element: Element, selector: string, property: EditableStyleProperty, before: string, after: string, delta?: number): void;
  setNote(element: Element, selector: string, note: string): void;
  setSnapNote(element: Element, selector: string, snapNote: string): void;
  reset(element: Element): void;
  get(element: Element): VisualChangeRecord | undefined;
  list(): VisualChangeRecord[];
  countDiffs(): number;
}

function isEmpty(record: InternalRecord): boolean {
  return !record.note.trim() && !record.snapNote?.trim() && Object.keys(record.styles).length === 0;
}

export function createVisualChangeStore(): VisualChangeStore {
  const records = new Map<Element, InternalRecord>();
  let nextOrder = 0;

  const ensure = (element: Element, selector: string) => {
    const current = records.get(element);
    if (current) {
      if (selector) current.selector = selector;
      return current;
    }
    const created: InternalRecord = { element, selector, note: '', styles: {}, order: nextOrder++ };
    records.set(element, created);
    return created;
  };

  const active = () => [...records.values()].filter((record) => !isEmpty(record)).sort((a, b) => a.order - b.order);
  const toPublic = (record: InternalRecord, number: number): VisualChangeRecord => ({
    number,
    element: record.element,
    selector: record.selector,
    note: record.note,
    styles: { ...record.styles },
    snapNote: record.snapNote
  });

  return {
    setStyle(element, selector, property, before, after, delta) {
      const record = ensure(element, selector);
      const originalBefore = record.styles[property]?.before ?? before;
      if (after === originalBefore) delete record.styles[property];
      else record.styles[property] = { before: originalBefore, after, ...(delta === undefined ? {} : { delta }) };
      if (isEmpty(record)) records.delete(element);
    },
    setNote(element, selector, note) {
      const record = ensure(element, selector);
      record.note = note;
      if (isEmpty(record)) records.delete(element);
    },
    setSnapNote(element, selector, snapNote) {
      const record = ensure(element, selector);
      record.snapNote = snapNote || undefined;
      if (isEmpty(record)) records.delete(element);
    },
    reset(element) { records.delete(element); },
    get(element) {
      const list = active();
      const index = list.findIndex((record) => record.element === element);
      return index < 0 ? undefined : toPublic(list[index]!, index + 1);
    },
    list() { return active().map((record, index) => toPublic(record, index + 1)); },
    countDiffs() {
      return active().reduce((sum, record) => sum + Object.keys(record.styles).length + (record.note.trim() ? 1 : 0), 0);
    }
  };
}
