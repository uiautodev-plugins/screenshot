/// <reference path="./plugin-runtime.d.ts" />
import { render } from 'preact';
import { useState, useCallback } from 'preact/hooks';

interface ScreenshotItem {
  id: number;
  dataUrl: string;
  timestamp: Date;
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

function App() {
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [nextId, setNextId] = useState(0);

  const takeScreenshot = useCallback(async () => {
    setCapturing(true);
    try {
      const dataUrl = await $u.screenshotAsBase64();
      setNextId(prev => {
        setScreenshots(prev => [...prev, { id: prev.length > 0 ? prev[prev.length - 1].id + 1 : 0, dataUrl, timestamp: new Date() }]);
        return prev + 1;
      });
    } finally {
      setCapturing(false);
    }
  }, []);

  const download = useCallback((item: ScreenshotItem) => {
    const name = `screenshot_${item.timestamp.getTime()}.png`;
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = name;
    a.click();
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
          <div
            class="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <img src={item.dataUrl} class="h-80 object-contain block" />
            {hoveredId === item.id && (
              <div class="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
                <button
                  class="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-900 hover:bg-slate-100 cursor-pointer"
                  onClick={() => download(item)}
                >
                  下载
                </button>
                <button
                  class="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 cursor-pointer"
                  onClick={() => remove(item.id)}
                >
                  删除
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

render(<App />, document.getElementById('app')!);
