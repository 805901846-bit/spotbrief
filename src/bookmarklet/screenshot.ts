import type { RectSnapshot } from './types';

interface Point { x: number; y: number }
interface Size { width: number; height: number }

export function normalizeRect(start: Point, end: Point): RectSnapshot {
  return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

export function isValidCaptureRect(rect: RectSnapshot, minimum = 20): boolean {
  return rect.width >= minimum && rect.height >= minimum;
}

export function mapRectToVideo(rect: RectSnapshot, viewport: Size, video: Size): RectSnapshot {
  const scaleX = video.width / viewport.width; const scaleY = video.height / viewport.height;
  return { x: rect.x * scaleX, y: rect.y * scaleY, width: rect.width * scaleX, height: rect.height * scaleY };
}

export function unionRects(rects: RectSnapshot[]): RectSnapshot | undefined {
  if (!rects.length) return;
  const x = Math.min(...rects.map(r => r.x)); const y = Math.min(...rects.map(r => r.y));
  const right = Math.max(...rects.map(r => r.x + r.width)); const bottom = Math.max(...rects.map(r => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
}

export async function requestDisplayStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('当前浏览器不支持页面截图，请使用 Chrome、Edge 等现代浏览器。');
  return navigator.mediaDevices.getDisplayMedia({ video: true });
}

export async function prepareCaptureVideo(stream: MediaStream): Promise<HTMLVideoElement> {
  const video = document.createElement('video'); video.muted = true; video.srcObject = stream; await video.play(); return video;
}

export async function captureVideoRegion(video: HTMLVideoElement, rect: RectSnapshot): Promise<Blob> {
  const source = mapRectToVideo(rect, { width: innerWidth, height: innerHeight }, { width: video.videoWidth, height: video.videoHeight });
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(source.width)); canvas.height = Math.max(1, Math.round(source.height));
  const context = canvas.getContext('2d'); if (!context) throw new Error('浏览器无法创建截图画布。');
  context.drawImage(video, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('截图生成失败，请重试。'); return blob;
}

export function selectCaptureRect(): { promise: Promise<RectSnapshot | undefined>; cancel: () => void } {
  const layer = document.createElement('div'); layer.className = 'patchbrief-capture-layer'; layer.dataset.patchbriefUi = 'capture';
  layer.innerHTML = '<div class="patchbrief-capture-hint">拖动鼠标选择截图区域 · Esc 取消</div><div class="patchbrief-capture-box"></div>';
  Object.assign(layer.style, { position: 'fixed', inset: '0', zIndex: '2147483647', cursor: 'crosshair', background: 'rgba(32,26,18,.24)', userSelect: 'none' });
  const box = layer.lastElementChild as HTMLElement; Object.assign(box.style, { position: 'fixed', display: 'none', border: '2px solid #e07822', background: 'rgba(255,250,240,.12)', boxShadow: '0 0 0 9999px rgba(32,26,18,.32)', pointerEvents: 'none' });
  const hint = layer.firstElementChild as HTMLElement; Object.assign(hint.style, { position: 'fixed', left: '50%', top: '20px', transform: 'translateX(-50%)', padding: '8px 14px', borderRadius: '999px', background: '#fffaf0', color: '#27231d', font: '600 13px system-ui,sans-serif', boxShadow: '0 4px 18px rgba(0,0,0,.2)', pointerEvents: 'none' });
  const previousOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; document.documentElement.append(layer);
  let start: Point | undefined; let settled = false; let finish!: (rect?: RectSnapshot) => void;
  const cleanup = () => { layer.removeEventListener('pointerdown', down); layer.removeEventListener('pointermove', move); layer.removeEventListener('pointerup', up); document.removeEventListener('keydown', key, true); layer.remove(); document.documentElement.style.overflow = previousOverflow; };
  const done = (rect?: RectSnapshot) => { if (settled) return; settled = true; cleanup(); finish(rect); };
  const paint = (rect: RectSnapshot) => { box.style.display = 'block'; box.style.left = `${rect.x}px`; box.style.top = `${rect.y}px`; box.style.width = `${rect.width}px`; box.style.height = `${rect.height}px`; };
  const down = (event: PointerEvent) => { if (event.button !== 0) return; start = { x: event.clientX, y: event.clientY }; layer.setPointerCapture?.(event.pointerId); paint(normalizeRect(start, start)); event.preventDefault(); };
  const move = (event: PointerEvent) => { if (start) paint(normalizeRect(start, { x: event.clientX, y: event.clientY })); };
  const up = (event: PointerEvent) => { if (!start) return; const rect = normalizeRect(start, { x: event.clientX, y: event.clientY }); done(isValidCaptureRect(rect) ? rect : undefined); };
  const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); done(); } };
  layer.addEventListener('pointerdown', down); layer.addEventListener('pointermove', move); layer.addEventListener('pointerup', up); document.addEventListener('keydown', key, true);
  return { promise: new Promise(resolve => { finish = resolve; }), cancel: () => done() };
}

export async function captureSelection(rects: RectSnapshot[]): Promise<Blob | undefined> {
  const rect = unionRects(rects); if (!rect) return;
  let stream: MediaStream | undefined;
  try { stream = await requestDisplayStream(); const video = await prepareCaptureVideo(stream); return await captureVideoRegion(video, rect); }
  finally { stream?.getTracks().forEach(track => track.stop()); }
}
