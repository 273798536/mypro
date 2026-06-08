import type { Sandbox } from '@/types';
import { deepDiff, formatValue, getFieldLabel } from '@/utils/diff';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface DiffViewerProps {
  oldData: Sandbox;
  newData: Sandbox;
}

export default function DiffViewer({ oldData, newData }: DiffViewerProps) {
  const diffs = deepDiff(oldData, newData);

  if (diffs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">✓</div>
        <div className="text-space-200 font-medium">两个版本数据完全一致</div>
        <div className="text-sm text-space-400 mt-1">没有检测到任何变更</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-space-300 mb-4">
        共检测到 <span className="text-gold-400 font-semibold">{diffs.length}</span> 处变更
      </div>
      {diffs.map((diff, idx) => (
        <div key={idx} className="card overflow-hidden">
          <div className="px-4 py-2.5 bg-space-900/70 border-b border-space-700/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gold-300">{getFieldLabel(diff.path)}</span>
              <code className="text-xs text-space-400 font-mono">{diff.path}</code>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-space-700/50">
            <div className="p-4">
              <div className="flex items-center gap-2 text-xs text-space-400 mb-2">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                <span>旧值</span>
              </div>
              <div className="font-mono text-sm text-rose-300 bg-rose-950/30 border border-rose-900/40 rounded px-3 py-2 break-all">
                {formatValue(diff.oldValue)}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 text-xs text-space-400 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>新值</span>
              </div>
              <div className="font-mono text-sm text-emerald-300 bg-emerald-950/30 border border-emerald-900/40 rounded px-3 py-2 break-all">
                {formatValue(diff.newValue)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
