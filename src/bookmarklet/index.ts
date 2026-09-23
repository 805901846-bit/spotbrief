import { VERSION, type BriefDraft, type EditableStyleProperty, type PatchBriefController, type SelectionRecord, type VisualChangeRecord } from './types';
import { createPanelHost } from '../panel/panel';
import { createOverlay, positionOverlay } from './overlay';
import { resolveTarget } from './target-resolver';
import { getAccessibleLabel, getLocator, getRegion, getVisualSummary, capturePageContext } from './context';
import { generateSelector } from './selector';
import { sanitizeElementHtml, truncateText } from './sanitizer';
import { generateBriefMarkdown, serializeBriefJson } from './prompt';
import { copyText, downloadText } from './clipboard';
import { loadPreferences, savePreferences } from './storage';
import { captureVideoRegion, prepareCaptureVideo, requestDisplayStream, selectCaptureRect } from './screenshot';
import { requestAiEnhancement } from './ai-bridge';
import { createFormState } from './form-state';
import { createVisualChangeStore } from './visual-changes';
import { createCommandHistory, type Command } from './command-history';
import { applyResizeSnap, calculateResize, findResizeSnap, findSnap, offsetTranslate, type ResizeDirection, type SnapReference } from './canvas-geometry';
import { createVisualSession } from './visual-session';
import { createCanvasOverlay, type CanvasOverlay } from './canvas-overlay';
import { createCanvasEditor, createExitDialog, createTaskBar } from './canvas-editor';

interface ScreenshotState { blob: Blob; url: string; filename: string; width: number; height: number }
interface Snapshot { element: HTMLElement; selector: string; beforeTranslate: string; translateBase: string; rect: DOMRect }
interface InlineStyleState { value: string; priority: string; attributePresent: boolean }
interface PointerSession {
  kind: 'drag' | 'resize'; pointerId: number; startX: number; startY: number; pendingX: number; pendingY: number;
  snapshots: Snapshot[]; direction?: ResizeDirection; references: SnapReference[]; snapNote: string;
  beforeSize?: { width: string; height: string }; resizeBox?: { x: number; y: number; width: number; height: number };
  altKey: boolean; shiftKey: boolean;
}

(() => {
  if (window.__PATCHBRIEF__) { window.__PATCHBRIEF__.open(); return; }
  const bridge = window.__PATCHBRIEF_AI_BRIDGE__; delete window.__PATCHBRIEF_AI_BRIDGE__;
  const preferences = loadPreferences();
  const { host, root } = createPanelHost();
  const hover = createOverlay('hover');
  const editor = createCanvasEditor(root);
  const taskBar = createTaskBar(root);
  const exitDialog = createExitDialog(root);
  const form = createFormState(preferences.defaultConstraints, Boolean(bridge?.url && bridge?.token));
  const changes = createVisualChangeStore();
  const history = createCommandHistory(100);
  const session = createVisualSession();
  const overlays = new Map<Element, CanvasOverlay>();
  const owners = new WeakMap<HTMLElement, HTMLElement>();
  const constraints = ['不修改共享组件', '不要安装新依赖', '不修改无关文件', '保持响应式兼容', '保持现有交互', '保持可访问性', '先展示修改方案', '修改后运行检查'];

  let selections: SelectionRecord[] = [];
  let id = 0, hoverRaf = 0, canvasRaf = 0;
  let paused = false, editorVisible = false, settingsOpen = false, capturing = false;
  let lastHovered: Element | null = null, pointer: PointerSession | null = null;
  let parentPath: Element[] = [];
  let preview = '', aiMessage = '', screenshotMessage = '';
  let screenshot: ScreenshotState | undefined, captureStream: MediaStream | undefined;
  let activeCapture: ReturnType<typeof selectCaptureRect> | null = null;
  let aiAbort: AbortController | undefined;
  let destroyed = false;
  let controller: PatchBriefController;

  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const selectedElements = () => selections.map((s) => s.element).filter((el): el is HTMLElement => el instanceof HTMLElement);
  const selectorFor = (element: Element) => selections.find((s) => s.element === element)?.selector || generateSelector(element) || element.tagName.toLowerCase();

  function hasSessionWork() {
    return selections.length > 0 || changes.list().length > 0 || Boolean(form.request.trim() || form.code.trim() || form.screenshotNote.trim() || screenshot);
  }

  function requestExit(trigger?: HTMLElement) {
    if (hasSessionWork()) exitDialog.open(trigger);
    else controller.destroy();
  }

  function record(element: Element): SelectionRecord {
    const rect = element.getBoundingClientRect();
    return { id: `pb-${++id}`, element, label: getAccessibleLabel(element), tag: element.tagName.toLowerCase(), text: truncateText(element.textContent || ''), selector: generateSelector(element), locator: getLocator(element), region: getRegion(element), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, visual: getVisualSummary(element), html: sanitizeElementHtml(element), note: '' };
  }

  function draft(): BriefDraft {
    return { version: VERSION, page: capturePageContext(), selections: selections.map((s, index) => ({ index: index + 1, label: s.label, tag: s.tag, text: s.text, selector: s.selector, locator: s.locator, region: s.region, visual: preferences.includeVisual ? s.visual : undefined, html: preferences.includeHtml ? s.html : undefined, note: s.note, invalid: !s.element.isConnected })), request: form.request, relatedCode: form.code ? { language: form.language, content: form.code } : undefined, constraints: [...form.constraints], screenshot: screenshot ? { filename: screenshot.filename, description: form.screenshotNote.trim() || `用户手动框选的页面区域（${screenshot.width} × ${screenshot.height}）` } : undefined, visualChanges: changes.list().map(({ element: _element, ...item }) => item) };
  }

  function styleValue(element: HTMLElement, property: EditableStyleProperty) {
    return property === 'translate' ? element.style.translate : (getComputedStyle(element)[property] || '');
  }
  function applyStyle(element: HTMLElement, property: EditableStyleProperty, value: string) {
    if (property === 'backgroundColor') {
      session.capture(element);
      element.style.setProperty('background-color', value, 'important');
      return;
    }
    session.apply(element, { [property]: value });
  }
  const cssName = (property: EditableStyleProperty) => property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  function inlineState(element: HTMLElement, property: EditableStyleProperty): InlineStyleState {
    const name = cssName(property);
    return { value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name), attributePresent: element.hasAttribute('style') };
  }
  function applyInlineState(element: HTMLElement, property: EditableStyleProperty, state: InlineStyleState) {
    session.capture(element);
    const name = cssName(property);
    if (!state.value) element.style.removeProperty(name);
    else element.style.setProperty(name, state.value, state.priority);
    if (!state.attributePresent && !element.style.cssText) element.removeAttribute('style');
  }
  function makeStyleCommand(element: HTMLElement, selector: string, property: EditableStyleProperty, before: string, after: string, snapNote = '', restoreBefore: InlineStyleState = { value: before, priority: '', attributePresent: before !== '' }): Command {
    return { redo() { applyStyle(element, property, after); changes.setStyle(element, selector, property, before, after); if (snapNote) changes.setSnapNote(element, selector, snapNote); }, undo() { applyInlineState(element, property, restoreBefore); changes.setStyle(element, selector, property, before, before); if (snapNote) changes.setSnapNote(element, selector, ''); } };
  }
  function compound(commands: Command[]): Command { return { redo() { commands.forEach((c) => c.redo()); refresh(); }, undo() { [...commands].reverse().forEach((c) => c.undo()); refresh(); } }; }
  function commitStyle(property: EditableStyleProperty, rows: Array<{ element: HTMLElement; selector: string; before: string; after: string; restoreBefore?: InlineStyleState }>, snapNote = '') {
    const commands = rows.filter((row) => row.before !== row.after).map((row) => makeStyleCommand(row.element, row.selector, property, row.before, row.after, snapNote, row.restoreBefore));
    if (commands.length) history.execute(compound(commands));
  }

  function normalizeColor(value: string) {
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return match ? `#${[match[1], match[2], match[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('')}` : value;
  }
  function editorState() {
    const elements = selectedElements();
    if (!elements.length) return { visible: false };
    const radii = elements.map((el) => Math.round(parseFloat(getComputedStyle(el).borderRadius) || 0));
    const colors = elements.map((el) => getComputedStyle(el).backgroundColor);
    const notes = elements.map((el) => changes.get(el)?.note || '');
    return { visible: editorVisible, radius: radii[0], color: normalizeColor(colors[0] || ''), note: notes.every((x) => x === notes[0]) ? notes[0] : '', mixedRadius: !radii.every((x) => x === radii[0]), mixedColor: !colors.every((x) => x === colors[0]) };
  }

  function ensureOverlay(element: HTMLElement) {
    let overlay = overlays.get(element);
    if (!overlay) { overlay = createCanvasOverlay(); overlays.set(element, overlay); owners.set(overlay.element, element); }
    return overlay;
  }
  function refresh() {
    const visible = new Set<Element>([...selections.map((s) => s.element), ...changes.list().map((c) => c.element)]);
    for (const [element, overlay] of overlays) if (!visible.has(element) || !element.isConnected) { overlay.destroy(); overlays.delete(element); }
    for (const element of visible) if (element instanceof HTMLElement && element.isConnected) {
      const rect = element.getBoundingClientRect(), overlay = ensureOverlay(element);
      overlay.position({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
      overlay.setSelected(selections.some((s) => s.element === element)); overlay.setNumber(changes.get(element)?.number);
    }
    editor.update(editorState());
    taskBar.update({ locations: changes.list().length, diffs: changes.countDiffs(), canUndo: history.canUndo(), canRedo: history.canRedo() });
  }

  function collectReferences(active: HTMLElement): SnapReference[] {
    const candidates = new Set<Element>();
    if (active.parentElement) [...active.parentElement.children].forEach((el) => candidates.add(el));
    document.querySelectorAll('main,section,header,footer,article,button,[class*="card"]').forEach((el) => candidates.add(el));
    return [...candidates].filter((el) => el !== active && !selectedElements().includes(el as HTMLElement) && !host.contains(el)).slice(0, 40).map((el) => { const r = el.getBoundingClientRect(); return { name: generateSelector(el) || el.tagName.toLowerCase(), left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
  }

  function startPointer(event: PointerEvent) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement, overlayElement = target.closest<HTMLElement>('.patchbrief-canvas-overlay');
    if (!overlayElement) return;
    const owner = owners.get(overlayElement); if (!owner) return;
    if (!selections.some((s) => s.element === owner)) selections = [record(owner)];
    const elements = selectedElements(), direction = target.dataset.resizeDir as ResizeDirection | undefined;
    if (direction && elements.length > 1) return;
    const snapshots = elements.map((element) => ({ element, selector: selectorFor(element), beforeTranslate: element.style.translate, translateBase: getComputedStyle(element).translate || 'none', rect: element.getBoundingClientRect() }));
    pointer = { kind: direction ? 'resize' : 'drag', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, pendingX: event.clientX, pendingY: event.clientY, snapshots, direction, references: collectReferences(owner), snapNote: '', altKey: event.altKey, shiftKey: event.shiftKey, beforeSize: direction ? { width: elements[0]!.style.width, height: elements[0]!.style.height } : undefined, resizeBox: direction ? { x: snapshots[0]!.rect.left, y: snapshots[0]!.rect.top, width: snapshots[0]!.rect.width, height: snapshots[0]!.rect.height } : undefined };
    target.setPointerCapture?.(event.pointerId); event.preventDefault(); event.stopPropagation();
  }
  function renderPointer() {
    canvasRaf = 0; if (!pointer) return;
    const dx = pointer.pendingX - pointer.startX, dy = pointer.pendingY - pointer.startY, first = pointer.snapshots[0]!;
    if (pointer.kind === 'drag') {
      const snap = pointer.altKey ? { dx: 0, dy: 0 } : findSnap({ left: first.rect.left + dx, top: first.rect.top + dy, width: first.rect.width, height: first.rect.height }, pointer.references, 9);
      pointer.snapNote = [snap.vertical?.label, snap.horizontal?.label].filter(Boolean).join(' / ');
      for (const item of pointer.snapshots) applyStyle(item.element, 'translate', offsetTranslate(item.translateBase, Math.round(dx + snap.dx), Math.round(dy + snap.dy)));
      ensureOverlay(first.element).showGuides(snap);
    } else if (pointer.direction && pointer.resizeBox) {
      const rawBox = calculateResize(pointer.resizeBox, pointer.direction, dx, dy, pointer.shiftKey, 16);
      const snap = pointer.altKey ? { dx: 0, dy: 0 } : findResizeSnap(rawBox, pointer.direction, pointer.references, 9);
      const box = applyResizeSnap(rawBox, pointer.direction, snap, 16);
      pointer.snapNote = [snap.vertical?.label, snap.horizontal?.label].filter(Boolean).join(' / ');
      applyStyle(first.element, 'width', `${box.width}px`); applyStyle(first.element, 'height', `${box.height}px`);
      applyStyle(first.element, 'translate', offsetTranslate(first.translateBase, Math.round(box.x - pointer.resizeBox.x), Math.round(box.y - pointer.resizeBox.y)));
      ensureOverlay(first.element).showGuides(snap);
    }
    refresh();
  }
  function movePointer(event: PointerEvent) { if (!pointer || event.pointerId !== pointer.pointerId) return; pointer.pendingX = event.clientX; pointer.pendingY = event.clientY; pointer.altKey = event.altKey; pointer.shiftKey = event.shiftKey; if (!canvasRaf) canvasRaf = requestAnimationFrame(renderPointer); }
  function endPointer(event: PointerEvent) {
    const current = pointer; if (!current || event.pointerId !== current.pointerId) return;
    if (canvasRaf) { cancelAnimationFrame(canvasRaf); canvasRaf = 0; renderPointer(); } pointer = null;
    overlays.forEach((overlay) => overlay.hideGuides());
    if (current.kind === 'drag') {
      const rows = current.snapshots.map((s) => ({ element: s.element, selector: s.selector, before: s.beforeTranslate, after: s.element.style.translate }));
      rows.forEach((row) => applyStyle(row.element, 'translate', row.before)); commitStyle('translate', rows, current.snapNote);
    } else if (current.beforeSize) {
      const s = current.snapshots[0]!, afterWidth = s.element.style.width, afterHeight = s.element.style.height, afterTranslate = s.element.style.translate;
      applyStyle(s.element, 'width', current.beforeSize.width); applyStyle(s.element, 'height', current.beforeSize.height); applyStyle(s.element, 'translate', s.beforeTranslate);
      history.execute(compound([makeStyleCommand(s.element, s.selector, 'width', current.beforeSize.width, afterWidth), makeStyleCommand(s.element, s.selector, 'height', current.beforeSize.height, afterHeight), makeStyleCommand(s.element, s.selector, 'translate', s.beforeTranslate, afterTranslate, current.snapNote)]));
    }
    refresh();
  }

  function restoreRecord(element: HTMLElement, item: VisualChangeRecord) {
    for (const [property, diff] of Object.entries(item.styles) as Array<[EditableStyleProperty, { before: string; after: string; delta?: number }]>) changes.setStyle(element, item.selector, property, diff.before, diff.after, diff.delta);
    if (item.note) changes.setNote(element, item.selector, item.note); if (item.snapNote) changes.setSnapNote(element, item.selector, item.snapNote);
  }
  function resetSelected() {
    const rows = selectedElements().map((element) => ({ element, item: changes.get(element), current: element.getAttribute('style') })).filter((row) => row.item);
    if (!rows.length) return;
    history.execute({ redo() { rows.forEach(({ element }) => { session.reset(element); changes.reset(element); }); refresh(); }, undo() { rows.forEach(({ element, item, current }) => { session.capture(element); if (current === null) element.removeAttribute('style'); else element.setAttribute('style', current); restoreRecord(element, item!); }); refresh(); } });
  }

  function renderScreenshot() {
    const slot = root.querySelector<HTMLElement>('.screenshot-slot'); if (!slot) return;
    slot.innerHTML = screenshot ? `<img class="screenshot-preview" src="${screenshot.url}" alt="页面区域截图"><div class="screenshot-meta">${screenshot.width} × ${screenshot.height} · PNG</div><div class="screenshot-actions"><button class="secondary" data-action="copy-png">复制 PNG</button><button class="secondary" data-action="download-png">下载 PNG</button><button class="secondary danger" data-action="delete-screenshot">删除</button></div><textarea name="screenshot-note">${escapeHtml(form.screenshotNote)}</textarea>` : `<div class="screenshot-empty">${escapeHtml(screenshotMessage || '截图仅保存在当前页面内存中。')}</div>`;
  }
  function renderSettings() {
    root.querySelector('.panel')?.remove(); if (!settingsOpen) return;
    const panel = document.createElement('section'); panel.className = 'panel settings-panel';
    const configured = Boolean(bridge?.url && bridge?.token);
    const settings = `<section class="settings-view"><section class="screenshot-tool"><div class="screenshot-heading"><b>页面截图</b><button class="secondary" data-action="capture">截取页面区域</button></div><div class="screenshot-slot"></div></section><label>全局修改目标</label><textarea name="request">${escapeHtml(form.request)}</textarea><details class="form-section" data-section="code"${form.codeOpen ? ' open' : ''}><summary>相关代码</summary><div class="section-content"><select name="language">${['TSX','JSX','TypeScript','JavaScript','Vue','HTML','CSS','SCSS','Other'].map((x) => `<option${x === form.language ? ' selected' : ''}>${x}</option>`).join('')}</select><textarea class="code" name="code">${escapeHtml(form.code)}</textarea></div></details><details class="form-section" data-section="constraints"${form.constraintsOpen ? ' open' : ''}><summary>修改约束</summary><div class="section-content checks">${constraints.map((x) => `<label><input type="checkbox" name="constraint" value="${x}"${form.constraints.includes(x) ? ' checked' : ''}> ${x}</label>`).join('')}</div></details><div class="settings-group"><label class="ai-option"><input type="checkbox" name="ai-optimize"${form.aiOptimize ? ' checked' : ''}> 使用 AI 优化任务书</label><div class="api-status" data-role="api-status">${configured ? 'API 已配置' : '未配置 API'}</div><label class="compact-row"><span>包含视觉摘要</span><input type="checkbox" name="include-visual"${preferences.includeVisual ? ' checked' : ''}></label><label class="compact-row"><span>包含局部 HTML</span><input type="checkbox" name="include-html"${preferences.includeHtml ? ' checked' : ''}></label></div></section>`;
    panel.innerHTML = `<header class="top"><span class="brand">SpotBrief</span><span class="status">任务设置</span><button class="icon" data-action="close-settings">×</button></header><main class="body">${preview ? `${aiMessage ? `<div class="ai-message">${escapeHtml(aiMessage)}</div>` : ''}<div class="preview">${escapeHtml(preview)}</div>` : settings}</main><footer class="actions">${preview ? '<button class="secondary" data-action="back">返回</button><button class="secondary" data-action="json">复制 JSON</button><button class="secondary" data-action="download">下载 MD</button><button class="primary" data-action="copy">复制任务书</button>' : '<button class="primary" data-action="generate">生成任务书</button>'}</footer>`;
    root.append(panel); renderScreenshot();
  }
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  async function startCapture() {
    if (capturing) return; capturing = true; let video: HTMLVideoElement | undefined;
    try { captureStream = await requestDisplayStream(); if (destroyed) return; video = await prepareCaptureVideo(captureStream); if (destroyed) return; host.style.display = 'none'; activeCapture = selectCaptureRect(); const rect = await activeCapture.promise; activeCapture = null; if (!rect || destroyed) return; await nextFrame(); if (destroyed) return; await nextFrame(); if (destroyed) return; const blob = await captureVideoRegion(video, rect); if (destroyed) return; if (screenshot) URL.revokeObjectURL(screenshot.url); form.screenshotNote = ''; screenshot = { blob, url: URL.createObjectURL(blob), filename: `spotbrief-${Date.now()}.png`, width: Math.round(rect.width), height: Math.round(rect.height) }; }
    catch (error) { screenshotMessage = error instanceof Error ? error.message : '截图失败'; }
    finally { captureStream?.getTracks().forEach((track) => track.stop()); captureStream = undefined; video?.remove(); capturing = false; if (!destroyed) { host.style.display = ''; refresh(); renderScreenshot(); } }
  }
  async function generate() {
    const local = generateBriefMarkdown(draft()); aiMessage = '';
    if (!form.aiOptimize) preview = local;
    else {
      aiAbort?.abort(); const currentAbort = new AbortController(); aiAbort = currentAbort;
      try { const result = await requestAiEnhancement(local, bridge, currentAbort.signal); if (destroyed || currentAbort.signal.aborted) return; preview = result; aiMessage = '✓ 已使用 AI 优化'; }
      catch (error) { if (destroyed || currentAbort.signal.aborted) return; preview = local; aiMessage = `AI 优化失败：${error instanceof Error ? error.message : '未知错误'}`; }
      finally { if (aiAbort === currentAbort) aiAbort = undefined; }
    }
    if (destroyed) return; settingsOpen = true; renderSettings();
  }

  function onHover(event: PointerEvent) { if (capturing || paused || pointer || event.composedPath().includes(host)) return; lastHovered = (event.composedPath().find((x) => x instanceof Element && !x.closest?.('[data-patchbrief-ui]')) as Element) || null; if (!hoverRaf) hoverRaf = requestAnimationFrame(() => { hoverRaf = 0; positionOverlay(hover, lastHovered); }); }
  function onPageClick(event: MouseEvent) {
    if (capturing || paused || event.composedPath().includes(host) || (event.target as Element).closest?.('[data-patchbrief-ui]')) return;
    const element = resolveTarget(event.composedPath().find((x) => x instanceof Element && !x.closest?.('[data-patchbrief-ui]')) as Element); if (!element || element === document.body || element === document.documentElement) return;
    event.preventDefault(); event.stopImmediatePropagation(); const index = selections.findIndex((s) => s.element === element);
    if (event.shiftKey) { if (index >= 0) selections.splice(index, 1); else selections.push(record(element)); } else selections = [record(element)];
    parentPath = []; editorVisible = selections.length > 0; refresh();
  }
  function onMarkerClick(event: MouseEvent) { const marker = (event.target as Element).closest<HTMLElement>('[data-change-number]'); if (!marker) return; const owner = owners.get(marker.closest<HTMLElement>('.patchbrief-canvas-overlay')!); if (!owner) return; owner.scrollIntoView({ block: 'center', inline: 'center' }); selections = [record(owner)]; editorVisible = true; refresh(); }
  function onKey(event: KeyboardEvent) {
    const keyTarget = event.target as HTMLElement;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (exitDialog.isOpen()) exitDialog.close();
      else requestExit(keyTarget);
      return;
    }
    const resizeDirection = keyTarget.dataset?.resizeDir as ResizeDirection | undefined;
    if (resizeDirection && event.key.startsWith('Arrow')) {
      const owner = owners.get(keyTarget.closest<HTMLElement>('.patchbrief-canvas-overlay')!);
      if (!owner) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
      const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
      const rect = owner.getBoundingClientRect();
      const box = calculateResize({ x: rect.left, y: rect.top, width: rect.width, height: rect.height }, resizeDirection, dx, dy, false, 16);
      const beforeWidth = owner.style.width, beforeHeight = owner.style.height;
      const beforeTranslate = owner.style.translate, translateBase = getComputedStyle(owner).translate || 'none';
      history.execute(compound([
        makeStyleCommand(owner, selectorFor(owner), 'width', beforeWidth, `${box.width}px`),
        makeStyleCommand(owner, selectorFor(owner), 'height', beforeHeight, `${box.height}px`),
        makeStyleCommand(owner, selectorFor(owner), 'translate', beforeTranslate, offsetTranslate(translateBase, Math.round(box.x - rect.left), Math.round(box.y - rect.top)))
      ]));
      return;
    }
    if (event.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && selections.length) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
      const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
      commitStyle('translate', selectedElements().map((element) => { const before = element.style.translate; return { element, selector: selectorFor(element), before, after: offsetTranslate(getComputedStyle(element).translate || 'none', dx, dy) }; }));
      return;
    }
    if (keyTarget.matches?.('input,textarea,select,[contenteditable=true]')) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? history.redo() : history.undo(); refresh(); return; }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); history.redo(); refresh(); return; }
    if (event.key === 'ArrowUp' && selections.length === 1) { const current = selections[0]!.element, parent = current.parentElement; if (parent && parent !== document.body && parent !== document.documentElement) { event.preventDefault(); parentPath.push(current); selections = [record(parent)]; editorVisible = true; refresh(); } }
    else if (event.key === 'ArrowDown' && parentPath.length) { const child = parentPath.pop()!; if (child.isConnected) { event.preventDefault(); selections = [record(child)]; refresh(); } }
  }

  root.addEventListener('pointerdown', (event) => { const target = event.target as HTMLInputElement; if (target.dataset.action === 'set-radius') target.dataset.beforeValues = JSON.stringify(selectedElements().map((el) => ({ visual: styleValue(el, 'borderRadius'), restore: inlineState(el, 'borderRadius') }))); });
  root.addEventListener('input', (event) => { const input = event.target as HTMLInputElement | HTMLTextAreaElement; if (input.dataset.action === 'set-radius') { if (!input.dataset.beforeValues) input.dataset.beforeValues = JSON.stringify(selectedElements().map((el) => ({ visual: styleValue(el, 'borderRadius'), restore: inlineState(el, 'borderRadius') }))); selectedElements().forEach((el) => applyStyle(el, 'borderRadius', `${input.value}px`)); } if (input.name === 'request') form.request = input.value; if (input.name === 'code') form.code = input.value; if (input.name === 'screenshot-note') form.screenshotNote = input.value; refresh(); });
  root.addEventListener('change', (event) => { const input = event.target as HTMLInputElement | HTMLSelectElement; if (input.dataset.action === 'set-radius') { const before: Array<{ visual: string; restore: InlineStyleState }> = JSON.parse(input.dataset.beforeValues || '[]'); const rows = selectedElements().map((element, i) => ({ element, selector: selectorFor(element), before: before[i]?.visual || '0px', restoreBefore: before[i]?.restore || { value: '', priority: '', attributePresent: false }, after: `${input.value}px` })); rows.forEach((row) => applyInlineState(row.element, 'borderRadius', row.restoreBefore)); commitStyle('borderRadius', rows); delete input.dataset.beforeValues; } if (input.dataset.colorInput !== undefined) commitStyle('backgroundColor', selectedElements().map((element) => ({ element, selector: selectorFor(element), before: styleValue(element, 'backgroundColor'), restoreBefore: inlineState(element, 'backgroundColor'), after: input.value }))); if (input.name === 'language') form.language = input.value; if (input.name === 'constraint') form.constraints = [...root.querySelectorAll<HTMLInputElement>('[name=constraint]:checked')].map((x) => x.value); if (input.name === 'ai-optimize') form.aiOptimize = (input as HTMLInputElement).checked; if (input.name === 'include-visual') preferences.includeVisual = (input as HTMLInputElement).checked; if (input.name === 'include-html') preferences.includeHtml = (input as HTMLInputElement).checked; if (['include-visual', 'include-html'].includes(input.name)) savePreferences(preferences); });
  root.addEventListener('toggle', (event) => { const details = event.target as HTMLDetailsElement; if (details.dataset.section === 'code') form.codeOpen = details.open; if (details.dataset.section === 'constraints') form.constraintsOpen = details.open; }, true);
  root.addEventListener('click', async (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-action],[data-color]'); if (!target) return;
    if (target.dataset.color) { commitStyle('backgroundColor', selectedElements().map((element) => ({ element, selector: selectorFor(element), before: styleValue(element, 'backgroundColor'), restoreBefore: inlineState(element, 'backgroundColor'), after: target.dataset.color! }))); root.querySelector<HTMLElement>('[data-color-popover]')!.hidden = true; return; }
    switch (target.dataset.action) {
      case 'set-color': { const popover = root.querySelector<HTMLElement>('[data-color-popover]')!; popover.hidden = !popover.hidden; break; }
      case 'edit-note': root.querySelector<HTMLElement>('[data-note-popover]')!.hidden = false; break;
      case 'cancel-note': root.querySelector<HTMLElement>('[data-note-popover]')!.hidden = true; break;
      case 'save-note': { const note = root.querySelector<HTMLTextAreaElement>('[data-note-input]')!.value.trim(), rows = selectedElements().map((element) => ({ element, selector: selectorFor(element), before: changes.get(element)?.note || '' })); history.execute({ redo() { rows.forEach((r) => changes.setNote(r.element, r.selector, note)); refresh(); }, undo() { rows.forEach((r) => changes.setNote(r.element, r.selector, r.before)); refresh(); } }); root.querySelector<HTMLElement>('[data-note-popover]')!.hidden = true; break; }
      case 'reset-element': resetSelected(); break; case 'close-editor': editorVisible = false; refresh(); break;
      case 'undo': history.undo(); refresh(); break; case 'redo': history.redo(); refresh(); break;
      case 'settings': settingsOpen = !settingsOpen; renderSettings(); break; case 'close-settings': settingsOpen = false; preview = ''; renderSettings(); break;
      case 'request-exit': requestExit(target); break; case 'cancel-exit': exitDialog.close(); break; case 'confirm-exit': controller.destroy(); break;
      case 'capture': await startCapture(); break; case 'generate': await generate(); break; case 'back': preview = ''; renderSettings(); break;
      case 'copy': await copyText(preview); break; case 'json': await copyText(serializeBriefJson(draft())); break; case 'download': downloadText(preview, `spotbrief-${Date.now()}.md`); break;
      case 'copy-png': if (screenshot && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') await navigator.clipboard.write([new ClipboardItem({ 'image/png': screenshot.blob })]); break;
      case 'download-png': if (screenshot) { const a = document.createElement('a'); a.href = screenshot.url; a.download = screenshot.filename; a.click(); } break;
      case 'delete-screenshot': if (screenshot) URL.revokeObjectURL(screenshot.url); screenshot = undefined; renderScreenshot(); break;
    }
  });

  document.addEventListener('pointermove', onHover, true); document.addEventListener('click', onPageClick, true); document.addEventListener('click', onMarkerClick, true); document.addEventListener('keydown', onKey, true);
  window.addEventListener('pointerdown', startPointer, true); window.addEventListener('pointermove', movePointer, true); window.addEventListener('pointerup', endPointer, true); window.addEventListener('pointercancel', endPointer, true);
  const reposition = () => refresh(); window.addEventListener('scroll', reposition, true); window.addEventListener('resize', reposition);

  controller = { version: VERSION, open() { host.style.display = ''; refresh(); }, pause() { paused = true; hover.style.display = 'none'; }, resume() { paused = false; }, destroy() {
    destroyed = true; aiAbort?.abort(); activeCapture?.cancel(); captureStream?.getTracks().forEach((track) => track.stop()); if (screenshot) URL.revokeObjectURL(screenshot.url); if (hoverRaf) cancelAnimationFrame(hoverRaf); if (canvasRaf) cancelAnimationFrame(canvasRaf); pointer = null; session.restoreAll();
    document.removeEventListener('pointermove', onHover, true); document.removeEventListener('click', onPageClick, true); document.removeEventListener('click', onMarkerClick, true); document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('pointerdown', startPointer, true); window.removeEventListener('pointermove', movePointer, true); window.removeEventListener('pointerup', endPointer, true); window.removeEventListener('pointercancel', endPointer, true); window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition);
    hover.remove(); overlays.forEach((overlay) => overlay.destroy()); editor.destroy(); taskBar.destroy(); exitDialog.destroy(); document.querySelector('.patchbrief-capture-layer')?.remove(); host.remove(); delete window.__PATCHBRIEF__;
  } };
  window.__PATCHBRIEF__ = controller; refresh();
})();
