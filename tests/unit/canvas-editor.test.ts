import { afterEach, expect, it } from 'vitest';
import { createCanvasEditor, createTaskBar } from '../../src/bookmarklet/canvas-editor';

afterEach(() => { document.body.innerHTML = ''; });

it('renders the one-line editor without a title or size fields', () => {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createCanvasEditor(root);

  expect(root.querySelector('[data-action="set-radius"]')).not.toBeNull();
  expect(root.querySelector('[data-action="set-color"]')).not.toBeNull();
  expect(root.querySelector('[data-action="edit-note"]')).not.toBeNull();
  expect(root.querySelector('[data-action="reset-element"]')).not.toBeNull();
  expect(root.querySelector('[name="width"]')).toBeNull();
  expect(root.textContent).not.toContain('编辑元件');
  editor.destroy();
});

it('updates task-bar counts and undo state', () => {
  const root = document.createElement('div');
  document.body.append(root);
  const bar = createTaskBar(root);
  bar.update({ locations: 3, diffs: 7, canUndo: true, canRedo: false });

  expect(root.querySelector('[data-change-count]')?.textContent).toBe('3 处 · 7 项变更');
  expect((root.querySelector('[data-action="undo"]') as HTMLButtonElement).disabled).toBe(false);
  expect((root.querySelector('[data-action="redo"]') as HTMLButtonElement).disabled).toBe(true);
  bar.destroy();
});
