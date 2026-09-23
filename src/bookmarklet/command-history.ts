export interface Command {
  redo(): void;
  undo(): void;
}

export interface CommandHistory {
  execute(command: Command): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

export function createCommandHistory(limit = 100): CommandHistory {
  const max = Math.max(1, Math.floor(limit));
  const undoStack: Command[] = [];
  const redoStack: Command[] = [];

  return {
    execute(command) {
      command.redo();
      undoStack.push(command);
      if (undoStack.length > max) undoStack.splice(0, undoStack.length - max);
      redoStack.length = 0;
    },
    undo() {
      const command = undoStack.pop();
      if (!command) return false;
      command.undo();
      redoStack.push(command);
      return true;
    },
    redo() {
      const command = redoStack.pop();
      if (!command) return false;
      command.redo();
      undoStack.push(command);
      return true;
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
    }
  };
}
