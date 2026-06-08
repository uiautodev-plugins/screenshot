/// <reference path="./plugin-runtime.d.ts" />
import { render } from 'preact';
import { useState, useCallback, useRef, useEffect } from 'preact/hooks';

interface ScreenshotItem {
  id: number;
  dataUrl: string;
  originalDataUrl: string;
  timestamp: Date;
  cropped: boolean;
}

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
}: {
  children: preact.ComponentChildren;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger';
}) {
  const base = 'inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium disabled:pointer-events-none disabled:opacity-50 cursor-pointer';
  const color = variant === 'danger'
    ? 'bg-red-600 text-white hover:bg-red-500'
    : 'bg-slate-900 text-white hover:bg-slate-800';
  return (
    <button class={`${base} ${color}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function cropImage(dataUrl: string, rect: SelectionRect, displayWidth: number, displayHeight: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scaleX = img.naturalWidth / displayWidth;
      const scaleY = img.naturalHeight / displayHeight;
      const x = Math.min(rect.startX, rect.endX) * scaleX;
      const y = Math.min(rect.startY, rect.endY) * scaleY;
      const w = Math.abs(rect.endX - rect.startX) * scaleX;
      const h = Math.abs(rect.endY - rect.startY) * scaleY;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w));
      canvas.height = Math.max(1, Math.round(h));
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

function ScreenshotCard({ item, onUpdate, onRemove }: {
  item: ScreenshotItem;
  onUpdate: (id: number, dataUrl: string, cropped: boolean) => void;
  onRemove: (id: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const exitCropMode = useCallback(() => {
    setCropMode(false);
    setSelecting(false);
    setSelection(null);
  }, []);

  const getImgRect = useCallback(() => {
    if (!imgRef.current) return null;
    const r = imgRef.current.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }, []);

  const getRelativePos = useCallback((e: MouseEvent) => {
    const r = getImgRect();
    if (!r) return null;
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, [getImgRect]);

  useEffect(() => {
    if (!selecting) return;
    const onMouseMove = (e: MouseEvent) => {
      const pos = getRelativePos(e);
      if (!pos) return;
      setSelection(prev => prev ? { ...prev, endX: pos.x, endY: pos.y } : null);
    };
    const onMouseUp = async (e: MouseEvent) => {
      const pos = getRelativePos(e);
      if (pos && selection) {
        const finalRect = { ...selection, endX: pos.x, endY: pos.y };
        const w = Math.abs(finalRect.endX - finalRect.startX);
        const h = Math.abs(finalRect.endY - finalRect.startY);
        if (w > 5 && h > 5) {
          const img = imgRef.current!;
          const cropped = await cropImage(
            item.dataUrl,
            finalRect,
            img.clientWidth,
            img.clientHeight,
          );
          onUpdate(item.id, cropped, true);
        }
      }
      setSelecting(false);
      setSelection(null);
      setCropMode(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [selecting, selection, item.id, item.originalDataUrl, onUpdate, getRelativePos]);

  const onMouseDown = useCallback((e: MouseEvent) => {
    const pos = getRelativePos(e);
    if (!pos) return;
    e.preventDefault();
    setSelection({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
    setSelecting(true);
  }, [getRelativePos]);

  const restore = useCallback(() => {
    onUpdate(item.id, item.originalDataUrl, false);
  }, [item.id, item.originalDataUrl, onUpdate]);

  const download = useCallback(() => {
    const name = `screenshot_${item.timestamp.getTime()}.png`;
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = name;
    a.click();
  }, [item.dataUrl, item.timestamp]);

  const renderSelection = () => {
    if (!selection) return null;
    const left = Math.min(selection.startX, selection.endX);
    const top = Math.min(selection.startY, selection.endY);
    const w = Math.abs(selection.endX - selection.startX);
    const h = Math.abs(selection.endY - selection.startY);
    return (
      <div
        style={{
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: `${w}px`,
          height: `${h}px`,
          border: '2px dashed #3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          pointerEvents: 'none',
        }}
      />
    );
  };

  return (
    <div
      class="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          ref={imgRef}
          src={item.dataUrl}
          class="h-80 max-w-60 object-contain block"
          onMouseDown={cropMode ? onMouseDown : undefined}
          style={{ cursor: cropMode ? 'crosshair' : 'default', userSelect: 'none' }}
        />
        {renderSelection()}
      </div>
      {hovered && !cropMode && (
        <div class="absolute top-1.5 right-1.5 flex gap-1 bg-white/90 rounded-md shadow px-1.5 py-1 backdrop-blur-sm">
          <button
            class="rounded px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
            onClick={() => setCropMode(true)}
          >
            裁剪
          </button>
          <button
            class="rounded px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
            onClick={download}
          >
            下载
          </button>
          {item.cropped && (
            <button
              class="rounded px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-50 cursor-pointer"
              onClick={restore}
            >
              复原
            </button>
          )}
          <button
            class="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
            onClick={() => onRemove(item.id)}
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [capturing, setCapturing] = useState(false);

  const takeScreenshot = useCallback(async () => {
    setCapturing(true);
    try {
      const dataUrl = await $u.screenshotAsBase64();
      setScreenshots(prev => [...prev, {
        id: prev.length > 0 ? prev[prev.length - 1].id + 1 : 0,
        dataUrl,
        originalDataUrl: dataUrl,
        timestamp: new Date(),
        cropped: false,
      }]);
    } finally {
      setCapturing(false);
    }
  }, []);

  const updateScreenshot = useCallback((id: number, dataUrl: string, cropped: boolean) => {
    setScreenshots(prev => prev.map(s => s.id === id ? { ...s, dataUrl, cropped } : s));
  }, []);

  const remove = useCallback((id: number) => {
    setScreenshots(prev => prev.filter(s => s.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setScreenshots([]);
  }, []);

  return (
    <div class="p-2 flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <Button onClick={takeScreenshot} disabled={capturing}>
          {capturing ? '截图中...' : '截图'}
        </Button>
        {screenshots.length > 0 && (
          <Button onClick={clearAll} variant="danger">清空</Button>
        )}
      </div>

      {screenshots.length === 0 && (
        <p class="text-xs text-slate-400 py-4 text-center">暂无截图</p>
      )}

      <div class="flex flex-wrap gap-2">
        {screenshots.map(item => (
          <ScreenshotCard
            key={item.id}
            item={item}
            onUpdate={updateScreenshot}
            onRemove={remove}
          />
        ))}
      </div>
    </div>
  );
}

render(<App />, document.getElementById('app')!);
