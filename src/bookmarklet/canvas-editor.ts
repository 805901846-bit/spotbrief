export interface CanvasEditorState {
  visible: boolean;
  radius?: number;
  color?: string;
  note?: string;
  mixedRadius?: boolean;
  mixedColor?: boolean;
}

export interface CanvasEditor {
  element: HTMLElement;
  update(state: CanvasEditorState): void;
  destroy(): void;
}

export interface TaskBarState {
  locations: number;
  diffs: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface TaskBar {
  element: HTMLElement;
  update(state: TaskBarState): void;
  destroy(): void;
}

export interface ExitDialog {
  element: HTMLElement;
  open(returnFocus?: HTMLElement): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export function createCanvasEditor(root: HTMLElement | ShadowRoot): CanvasEditor {
  const element = document.createElement('section');
  element.className = 'canvas-editor';
  element.dataset.patchbriefUi = 'true';
  element.innerHTML = `
    <label class="radius-control">
      <span>圆角</span>
      <input data-action="set-radius" type="range" min="0" max="64" step="1" value="0" aria-label="圆角">
      <output data-radius-value>0px</output>
    </label>
    <button class="color-button" data-action="set-color" type="button" aria-label="填充颜色"><span data-color-swatch></span></button>
    <button data-action="edit-note" type="button">说明</button>
    <button class="reset-button" data-action="reset-element" type="button">重置</button>
    <button class="icon-button" data-action="close-editor" type="button" aria-label="关闭编辑器">×</button>
    <div class="color-popover" data-color-popover hidden>
      <input data-color-input type="color" aria-label="选择填充颜色">
      <button type="button" data-color="#ffffff" aria-label="白色"></button>
      <button type="button" data-color="#f4c66b" aria-label="金黄色"></button>
      <button type="button" data-color="#75a79d" aria-label="青绿色"></button>
      <button type="button" data-color="#e66f2c" aria-label="橙色"></button>
    </div>
    <div class="note-popover" data-note-popover hidden>
      <textarea data-note-input placeholder="说明希望如何修改…"></textarea>
      <div><button type="button" data-action="cancel-note">取消</button><button type="button" data-action="save-note">完成</button></div>
    </div>`;
  root.append(element);
  const radius = element.querySelector<HTMLInputElement>('[data-action="set-radius"]')!;
  const radiusValue = element.querySelector<HTMLOutputElement>('[data-radius-value]')!;
  const swatch = element.querySelector<HTMLElement>('[data-color-swatch]')!;
  const colorInput = element.querySelector<HTMLInputElement>('[data-color-input]')!;
  const noteInput = element.querySelector<HTMLTextAreaElement>('[data-note-input]')!;

  return {
    element,
    update(state) {
      element.hidden = !state.visible;
      radius.value = String(state.radius ?? 0);
      radiusValue.value = state.mixedRadius ? '多值' : `${state.radius ?? 0}px`;
      const color = state.color || '#ffffff';
      swatch.style.background = state.mixedColor ? 'linear-gradient(135deg,#fff 0 45%,#ddd 45% 55%,#fff 55%)' : color;
      colorInput.value = /^#[\da-f]{6}$/i.test(color) ? color : '#ffffff';
      noteInput.value = state.note || '';
    },
    destroy() { element.remove(); }
  };
}

export function createTaskBar(root: HTMLElement | ShadowRoot): TaskBar {
  const element = document.createElement('nav');
  element.className = 'canvas-taskbar';
  element.dataset.patchbriefUi = 'true';
  element.innerHTML = `
    <span data-change-count>0 处 · 0 项变更</span>
    <button class="icon-button" data-action="undo" type="button" aria-label="撤销" title="撤销">↶</button>
    <button class="icon-button" data-action="redo" type="button" aria-label="重做" title="重做">↷</button>
    <button data-action="settings" type="button">设置</button>
    <button class="generate-button" data-action="generate" type="button">生成任务书</button>
    <button class="exit-button" data-action="request-exit" type="button" aria-label="关闭 SpotBrief" title="关闭 SpotBrief">×</button>`;
  root.append(element);
  const count = element.querySelector<HTMLElement>('[data-change-count]')!;
  const undo = element.querySelector<HTMLButtonElement>('[data-action="undo"]')!;
  const redo = element.querySelector<HTMLButtonElement>('[data-action="redo"]')!;

  return {
    element,
    update(state) {
      count.textContent = `${state.locations} 处 · ${state.diffs} 项变更`;
      undo.disabled = !state.canUndo;
      redo.disabled = !state.canRedo;
    },
    destroy() { element.remove(); }
  };
}

export function createExitDialog(root: HTMLElement | ShadowRoot): ExitDialog {
  const element = document.createElement('section');
  element.className = 'exit-dialog-layer';
  element.dataset.patchbriefUi = 'true';
  element.hidden = true;
  element.innerHTML = `<div class="exit-dialog" role="dialog" aria-modal="true" aria-labelledby="spotbrief-exit-title" aria-describedby="spotbrief-exit-description">
    <h2 id="spotbrief-exit-title">退出 SpotBrief？</h2>
    <p id="spotbrief-exit-description">本次所有修改将恢复到打开前的状态。</p>
    <div class="exit-dialog-actions"><button data-action="cancel-exit" type="button">取消</button><button class="confirm-exit" data-action="confirm-exit" type="button">退出并恢复</button></div>
  </div>`;
  root.append(element);
  const cancel = element.querySelector<HTMLButtonElement>('[data-action="cancel-exit"]')!;
  const actions = [...element.querySelectorAll<HTMLButtonElement>('button')];
  let returnFocus: HTMLElement | undefined;

  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const active = root instanceof ShadowRoot ? root.activeElement : document.activeElement;
    const index = actions.indexOf(active as HTMLButtonElement);
    const next = event.shiftKey ? (index <= 0 ? actions.length - 1 : index - 1) : (index >= actions.length - 1 ? 0 : index + 1);
    event.preventDefault();
    actions[next]!.focus();
  });

  return {
    element,
    open(target) { returnFocus = target; element.hidden = false; cancel.focus(); },
    close() { element.hidden = true; returnFocus?.focus(); },
    isOpen: () => !element.hidden,
    destroy() { element.remove(); }
  };
}
