import { useState } from 'react';
import { useGachaStore } from '@/store/useGachaStore';
import { Settings, Upload, Download, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DuplicatePolicy } from '@/types';

const DUPLICATE_OPTIONS: { value: DuplicatePolicy; label: string }[] = [
  { value: 'shards', label: '碎片' },
  { value: 'currency', label: '星辉币' },
  { value: 'nothing', label: '无折算' },
];

export default function CardPoolConfig() {
  const { cardPool, setCardPool, startSession, session, importPool, exportPool } = useGachaStore();
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const rRatePercent = (cardPool.rRate * 100).toFixed(1);

  function handleImport() {
    const ok = importPool(importText);
    if (ok) {
      setShowImport(false);
      setImportText('');
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-gacha-border bg-gacha-card p-4">
      <div className="flex items-center gap-2 border-b border-gacha-border pb-3">
        <Settings className="h-4 w-4 text-gacha-purple" />
        <h2 className="font-display text-sm font-bold text-slate-200">卡池配置</h2>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto pr-1 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">卡池名称</span>
          <input
            type="text"
            value={cardPool.name}
            onChange={(e) => setCardPool({ name: e.target.value })}
            className="rounded border border-gacha-border bg-gacha-bg px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-gacha-gold"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">SSR 概率 <span className="text-amber-400 font-display">{(cardPool.ssrRate * 100).toFixed(1)}%</span></span>
          <input
            type="range" min={0} max={5} step={0.1}
            value={cardPool.ssrRate * 100}
            onChange={(e) => setCardPool({ ssrRate: Number(e.target.value) / 100 })}
            className="h-1.5 cursor-pointer accent-amber-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">SR 概率 <span className="text-purple-400 font-display">{(cardPool.srRate * 100).toFixed(1)}%</span></span>
          <input
            type="range" min={0} max={20} step={0.1}
            value={cardPool.srRate * 100}
            onChange={(e) => setCardPool({ srRate: Number(e.target.value) / 100 })}
            className="h-1.5 cursor-pointer accent-purple-400"
          />
        </label>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">R 概率</span>
          <span className="text-blue-400 font-display">{rRatePercent}%</span>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">硬保底 (SSR)</span>
          <input
            type="number" min={1} max={999}
            value={cardPool.hardPity}
            onChange={(e) => setCardPool({ hardPity: Number(e.target.value) || 1 })}
            className="rounded border border-gacha-border bg-gacha-bg px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-gacha-gold"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">软保底起始</span>
          <input
            type="number" min={0}
            value={cardPool.softPityStart}
            onChange={(e) => setCardPool({ softPityStart: Number(e.target.value) || 0 })}
            className="rounded border border-gacha-border bg-gacha-bg px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-gacha-gold"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">软保底增量 <span className="text-purple-400 font-display">{(cardPool.softPityIncrement * 100).toFixed(1)}%</span></span>
          <input
            type="range" min={0} max={50} step={0.5}
            value={cardPool.softPityIncrement * 100}
            onChange={(e) => setCardPool({ softPityIncrement: Number(e.target.value) / 100 })}
            className="h-1.5 cursor-pointer accent-purple-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">SR 保底</span>
          <input
            type="number" min={1}
            value={cardPool.srHardPity}
            onChange={(e) => setCardPool({ srHardPity: Number(e.target.value) || 1 })}
            className="rounded border border-gacha-border bg-gacha-bg px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-gacha-gold"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">重复卡折算</span>
          <div className="flex gap-2">
            {DUPLICATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCardPool({ duplicatePolicy: opt.value })}
                className={cn(
                  'flex-1 rounded border px-2 py-1 text-xs transition-colors',
                  cardPool.duplicatePolicy === opt.value
                    ? 'border-gacha-gold bg-gacha-gold/10 text-gacha-gold'
                    : 'border-gacha-border bg-gacha-bg text-slate-400 hover:border-slate-500',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-gacha-border pt-3">
        <button
          onClick={() => { setShowImport(true); setImportText(''); }}
          className="flex flex-1 items-center justify-center gap-1 rounded border border-gacha-border bg-gacha-bg px-2 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-500"
        >
          <Upload className="h-3 w-3" /> 导入
        </button>
        <button
          onClick={() => setShowExport(true)}
          className="flex flex-1 items-center justify-center gap-1 rounded border border-gacha-border bg-gacha-bg px-2 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-500"
        >
          <Download className="h-3 w-3" /> 导出
        </button>
      </div>

      <button
        onClick={startSession}
        disabled={!!session?.isActive}
        className={cn(
          'flex items-center justify-center gap-2 rounded-lg py-2.5 font-display text-sm font-bold transition-all',
          session?.isActive
            ? 'cursor-not-allowed bg-slate-700 text-slate-500'
            : 'bg-gacha-gold text-gacha-bg hover:bg-gacha-gold/90 animate-pulse-glow',
        )}
      >
        <Play className="h-4 w-4" /> 开始实验
      </button>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-80 rounded-xl border border-gacha-border bg-gacha-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-200">导入卡池配置</span>
              <button onClick={() => setShowImport(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              className="w-full rounded border border-gacha-border bg-gacha-bg p-2 text-xs text-slate-200 outline-none focus:border-gacha-gold"
              placeholder="粘贴 JSON 配置..."
            />
            <button
              onClick={handleImport}
              className="mt-3 w-full rounded-lg bg-gacha-gold py-2 text-sm font-bold text-gacha-bg"
            >
              确认导入
            </button>
          </div>
        </div>
      )}

      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-80 rounded-xl border border-gacha-border bg-gacha-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-200">导出卡池配置</span>
              <button onClick={() => setShowExport(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <textarea
              readOnly
              value={exportPool()}
              rows={8}
              className="w-full rounded border border-gacha-border bg-gacha-bg p-2 text-xs text-slate-200 outline-none"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(exportPool()); }}
              className="mt-3 w-full rounded-lg bg-gacha-gold py-2 text-sm font-bold text-gacha-bg"
            >
              复制到剪贴板
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
