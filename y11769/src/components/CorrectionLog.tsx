import { useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useSandboxStore } from '@/store/useSandboxStore';

export default function CorrectionLog() {
  const correctionLog = useSandboxStore(s => s.correctionLog);
  const correctionLogOpen = useSandboxStore(s => s.correctionLogOpen);
  const toggleCorrectionLog = useSandboxStore(s => s.toggleCorrectionLog);

  if (!correctionLogOpen) return null;

  return (
    <div className="fixed right-4 top-14 w-80 max-h-[70vh] bg-[#0a0e1a]/95 border border-zinc-700/50 rounded-lg shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50">
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <Clock size={12} /> 修正痕迹
        </span>
        <button onClick={toggleCorrectionLog} className="p-1 text-zinc-500 hover:text-white transition-colors">
          <X size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
        {correctionLog.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center py-4">暂无修正记录</div>
        ) : (
          correctionLog.slice().reverse().map((corr, i) => (
            <div key={corr.id || i} className="rounded px-2 py-1.5 bg-zinc-800/50 border border-zinc-700/30">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-orange-400">{corr.field}</span>
                <span className="text-[9px] text-zinc-500">{new Date(corr.timestamp).toLocaleTimeString('zh-CN')}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-red-400 line-through">{corr.oldValue}</span>
                <span className="text-zinc-500">→</span>
                <span className="text-green-400">{corr.newValue}</span>
              </div>
              <div className="text-[9px] text-zinc-400 mt-0.5">{corr.reason}</div>
              <div className="text-[9px] text-zinc-500 mt-0.5">来源: {corr.source}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
