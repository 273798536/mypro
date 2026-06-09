import { useState } from 'react';
import { ChevronLeft, ChevronRight, GitCompare, Eye, EyeOff } from 'lucide-react';
import type { ProfileVersion } from '../../types';

interface Props {
  profiles: ProfileVersion[];
}

export default function ProfileCompare({ profiles }: Props) {
  const [mode, setMode] = useState<'split' | 'overlay'>('split');
  const [activeIdx, setActiveIdx] = useState(Math.max(0, profiles.length - 1));
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.55);

  if (profiles.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded border border-dashed border-slate-700 bg-slate-900/40 text-xs text-slate-500">
        暂无剖面图版本
      </div>
    );
  }

  if (profiles.length === 1) {
    return (
      <div className="overflow-hidden rounded border border-slate-700">
        <img src={profiles[0].imageDataUrl} alt={profiles[0].imageName} className="w-full" />
        <div className="flex items-center justify-between border-t border-slate-700 bg-slate-900/80 px-3 py-1.5">
          <span className="font-mono text-[10px] text-slate-400">
            {profiles[0].imageName}
          </span>
          <span className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-[#FFD93D">
            {profiles[0].version}
          </span>
        </div>
        {profiles[0].note && (
          <p className="border-t border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[10px] italic text-slate-500">
            📝 {profiles[0].note}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">剖面图版本对比</span>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setMode('split')}
            className={`rounded border px-2 py-0.5 text-[10px] transition-all ${
              mode === 'split'
                ? 'border-[#00D4AA] bg-[#00D4AA]/15 text-[#00D4AA]'
                : 'border-slate-700 bg-slate-800/40 text-slate-400'
            }`}
          >
            <GitCompare size={11} className="mr-1 inline" /> 上下对比
          </button>
          <button
            onClick={() => setMode('overlay')}
            className={`rounded border px-2 py-0.5 text-[10px] transition-all ${
              mode === 'overlay'
                ? 'border-[#00D4AA] bg-[#00D4AA]/15 text-[#00D4AA]'
                : 'border-slate-700 bg-slate-800/40 text-slate-400'
            }`}
          >
            {showOverlay ? <Eye size={11} className="mr-1 inline" /> : <EyeOff size={11} className="mr-1 inline" />}
            叠加
          </button>
        </div>
      </div>
      {mode === 'split' ? (
        <div className="overflow-hidden rounded border border-slate-700">
          <div className="grid grid-cols-2 gap-px bg-slate-700">
            {profiles.slice(-2).map((p) => (
              <div key={p.id} className="relative">
                <img src={p.imageDataUrl} alt={p.imageName} className="w-full" />
                <div className="absolute left-2 top-2 flex items-center gap-1">
                  <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-[#FFD93D]">
                    {p.version}
                  </span>
                </div>
                <div className="border-t border-slate-700 bg-slate-900/80 px-2 py-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-slate-400">{p.imageName}</span>
                  </div>
                  {p.note && (
                    <p className="mt-1 text-[9px] italic text-slate-500 line-clamp-1">
                      📝 {p.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="relative flex h-5 items-center justify-center border-t border-slate-700 bg-gradient-to-r from-rose-500/20 via-[#FFD93D]/20 to-emerald-500/20">
            <div className="absolute left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1 rounded-full border border-[#FFD93D]/40 bg-slate-900/90 px-2 py-0.5">
                <ChevronLeft size={10} className="text-rose-400" />
                <span className="font-mono text-[10px] font-bold text-[#FFD93D]">V1 → V2</span>
                <ChevronRight size={10} className="text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1">
            {profiles.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActiveIdx(i)}
                className={`flex-1 rounded border px-2 py-1 text-[10px] transition-all ${
                  activeIdx === i
                    ? 'border-[#00D4AA] bg-[#00D4AA]/15 text-[#00D4AA]'
                    : 'border-slate-700 bg-slate-800/40 text-slate-400'
                }`}
              >
                {p.version} · {p.imageName}
              </button>
            ))}
          </div>
          <div className="relative overflow-hidden rounded border border-slate-700">
            <img src={profiles[activeIdx].imageDataUrl} className="w-full" />
            {showOverlay && profiles.length > 1 && activeIdx > 0 && (
              <img
                src={profiles[activeIdx - 1].imageDataUrl}
                className="pointer-events-none absolute inset-0 w-full mix-blend-difference"
                style={{ opacity: overlayOpacity }}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className={`rounded border px-2 py-0.5 text-[10px] ${
                showOverlay
                  ? 'border-[#00D4AA] bg-[#00D4AA]/15 text-[#00D4AA]'
                  : 'border-slate-700 bg-slate-800/40 text-slate-400'
              }`}
            >
              {showOverlay ? '隐藏叠加' : '显示叠加'}
            </button>
            {showOverlay && (
              <>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  className="flex-1 accent-[#00D4AA]"
                />
                <span className="font-mono text-[10px] text-slate-400">{overlayOpacity.toFixed(2)}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
