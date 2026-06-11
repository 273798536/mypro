import { useState } from 'react';
import { X, ZoomIn, Upload } from 'lucide-react';
import type { Screenshot } from '@/types';

interface Props {
  screenshots: Screenshot[];
  onAdd?: () => void;
}

export default function ScreenshotGrid({ screenshots, onAdd }: Props) {
  const [active, setActive] = useState<Screenshot | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {screenshots.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s)}
            className="group relative aspect-[4/3] rounded-xl overflow-hidden ring-1 ring-slate-200 hover:ring-deep-sea-400 transition bg-slate-100"
          >
            <img src={s.url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
              <div className="flex items-center gap-1 text-white text-xs">
                <ZoomIn size={14} />
                查看大图
              </div>
            </div>
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px] truncate max-w-[85%]">
              {s.name}
            </div>
          </button>
        ))}
        {onAdd && (
          <button
            onClick={onAdd}
            className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-300 hover:border-deep-sea-400 hover:bg-deep-sea-50/40 flex flex-col items-center justify-center text-slate-400 hover:text-deep-sea-600 transition"
          >
            <Upload size={22} className="mb-1" />
            <span className="text-xs">上传截图</span>
          </button>
        )}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActive(null)}
        >
          <button
            onClick={() => setActive(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X size={22} />
          </button>
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={active.url} alt={active.name} className="w-full h-auto rounded-lg shadow-2xl" />
            <div className="mt-3 text-center text-white text-sm">{active.name}</div>
          </div>
        </div>
      )}
    </>
  );
}
