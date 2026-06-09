import { useAppStore } from '@/store';
import { ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function BatchSelector() {
  const { batchList, currentBatchId, selectBatch } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = batchList.find(b => b.id === currentBatchId);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const statusColor = (s: string) => {
    switch (s) {
      case 'completed': return 'bg-pass-green';
      case 'reviewed': return 'bg-blue-500';
      case 'processing': return 'bg-alert-orange';
      default: return 'bg-slate-500';
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'completed': return '已完成';
      case 'reviewed': return '已复核';
      case 'processing': return '处理中';
      default: return '待开始';
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 px-3 py-1.5 bg-industrial-700 border border-industrial-600 rounded-industrial hover:border-slate-400 transition-all"
      >
        {current && (
          <>
            <span className={`w-2 h-2 rounded-full ${statusColor(current.status)}`} />
            <span className="text-sm text-slate-200 font-mono">{current.materialCode}</span>
            <span className="text-xs text-slate-400">{statusLabel(current.status)}</span>
            {current.anomalyCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-alert-orange/20 text-alert-orange rounded">
                {current.anomalyCount}项异常
              </span>
            )}
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-industrial-800 border border-industrial-600 rounded-industrial shadow-xl z-50">
          <div className="px-3 py-2 border-b border-industrial-600 text-xs text-slate-500 uppercase tracking-wide">
            当前批次材料
          </div>
          <div className="max-h-72 overflow-auto">
            {batchList.map(b => (
              <button
                key={b.id}
                onClick={() => { selectBatch(b.id); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 hover:bg-industrial-700 border-b border-industrial-700/50 last:border-0 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-mono text-slate-200">{b.materialCode}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{b.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    生成于 {b.createdAt}
                    {b.anomalyCount > 0 && (
                      <span className="ml-2 text-alert-orange">{b.anomalyCount}项异常待处理</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusColor(b.status)}`} />
                  {b.id === currentBatchId && <Check className="w-4 h-4 text-pass-green" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
