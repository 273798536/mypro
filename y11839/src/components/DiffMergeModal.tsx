import { useState, useCallback } from 'react';
import { Plus, Minus, ArrowRightLeft, Check, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import type { DiffEntry } from '../types';

const TYPE_ICON_MAP = {
  added: { icon: Plus, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  removed: { icon: Minus, color: 'text-red-400', bg: 'bg-red-400/10' },
  modified: { icon: ArrowRightLeft, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
} as const;

function DiffCard({
  diff,
  resolution,
  onResolve,
}: {
  diff: DiffEntry;
  resolution: 'current' | 'incoming' | undefined;
  onResolve: (key: string, value: 'current' | 'incoming') => void;
}) {
  const config = TYPE_ICON_MAP[diff.type];
  const Icon = config.icon;
  const key = `${diff.entityId}.${diff.field}`;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#1e3a5f] bg-[#0d1f3c] p-3">
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded ${config.bg}`}>
        <Icon size={16} className={config.color} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#c8ddf0] leading-relaxed">{diff.description}</p>

        <div className="mt-2 flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="radio"
              name={key}
              checked={resolution === 'current'}
              onChange={() => onResolve(key, 'current')}
              className="accent-[#3498DB]"
            />
            <span className="text-xs text-[#7eb8e0] group-hover:text-[#a0d0f0] transition-colors">
              当前方案
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="radio"
              name={key}
              checked={resolution === 'incoming'}
              onChange={() => onResolve(key, 'incoming')}
              className="accent-[#2ECC71]"
            />
            <span className="text-xs text-[#7eb8e0] group-hover:text-[#a0d0f0] transition-colors">
              新方案
            </span>
          </label>
        </div>
      </div>

      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
          diff.entityType === 'node'
            ? 'bg-blue-500/15 text-blue-300'
            : 'bg-purple-500/15 text-purple-300'
        }`}
      >
        {diff.entityType === 'node' ? '节点' : '杆件'}
      </span>
    </div>
  );
}

export default function DiffMergeModal() {
  const mergeState = useGameStore((s) => s.mergeState);
  const resolveMerge = useGameStore((s) => s.resolveMerge);
  const cancelMerge = useGameStore((s) => s.cancelMerge);

  const [resolution, setResolution] = useState<Record<string, 'current' | 'incoming'>>({});

  const handleResolve = useCallback((key: string, value: 'current' | 'incoming') => {
    setResolution((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resolvedCount = Object.keys(resolution).length;
  const totalDiffs = mergeState.diffs.length;

  const handleConfirm = useCallback(() => {
    resolveMerge(resolution);
  }, [resolveMerge, resolution]);

  if (!mergeState.isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl rounded-xl border-2 border-[#3498DB]/60 bg-[#0a1628] shadow-2xl shadow-[#3498DB]/10">
        <div className="border-b border-[#1e3a5f] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#e0ecf8]">方案合并</h2>
              <p className="mt-0.5 text-xs text-[#7eb8e0]">
                节点侧（当前方案）与杆件侧（新方案）存在差异，请逐项选择保留方案
              </p>
            </div>
            <button
              onClick={cancelMerge}
              className="rounded-lg p-1.5 text-[#7eb8e0] hover:bg-[#1e3a5f] hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-3">
          {mergeState.diffs.map((diff) => {
            const key = `${diff.entityId}.${diff.field}`;
            return (
              <DiffCard
                key={key}
                diff={diff}
                resolution={resolution[key]}
                onResolve={handleResolve}
              />
            );
          })}
        </div>

        <div className="border-t border-[#1e3a5f] px-6 py-4">
          <div className="mb-3 flex items-center justify-between text-xs text-[#7eb8e0]">
            <span>
              共 <span className="text-white font-medium">{totalDiffs}</span> 项变更
            </span>
            <span>
              已处理 <span className="text-white font-medium">{resolvedCount}</span> / {totalDiffs}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirm}
              disabled={resolvedCount < totalDiffs}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#3498DB] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2980B9] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check size={16} />
              确认合并
            </button>

            <button
              onClick={cancelMerge}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#1e3a5f] bg-[#0d1f3c] px-4 py-2.5 text-sm text-[#7eb8e0] transition-colors hover:bg-[#1e3a5f] hover:text-white"
            >
              <X size={16} />
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
