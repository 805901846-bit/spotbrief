import { describe, expect, it } from 'vitest';
import { createCommandHistory } from '../../src/bookmarklet/command-history';

describe('command history', () => {
  it('undoes and redoes one committed interaction', () => {
    let value = 0;
    const history = createCommandHistory(30);

    history.execute({ redo: () => { value = 12; }, undo: () => { value = 0; } });

    expect(value).toBe(12);
    expect(history.undo()).toBe(true);
    expect(value).toBe(0);
    expect(history.redo()).toBe(true);
    expect(value).toBe(12);
  });

  it('clears redo after a new command', () => {
    const history = createCommandHistory(30);
    let value = 0;
    history.execute({ redo: () => { value = 1; }, undo: () => { value = 0; } });
    history.undo();
    history.execute({ redo: () => { value = 2; }, undo: () => { value = 0; } });

    expect(value).toBe(2);
    expect(history.canRedo()).toBe(false);
  });

  it('bounds retained undo commands', () => {
    const history = createCommandHistory(2);
    let value = 0;
    for (const next of [1, 2, 3]) {
      const previous = value;
      history.execute({ redo: () => { value = next; }, undo: () => { value = previous; } });
    }

    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(false);
    expect(value).toBe(1);
  });
});
