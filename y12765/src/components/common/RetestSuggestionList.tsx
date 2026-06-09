import { RotateCcw, ArrowUp, Minus } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';
import type { RetestSuggestion } from '@/types';

function priorityBadge(p: RetestSuggestion['priority']) {
  if (p === 'high') return { label: '高', cls: 'bg-fail-500 text-white', icon: <ArrowUp size={12} /> };
  if (p === 'medium') return { label: '中', cls: 'bg-warn-500 text-white', icon: <Minus size={12} /> };
  return { label: '低', cls: 'bg-slate-500 text-white', icon: <Minus size={12} /> };
}

export default function RetestSuggestionList() {
  const { retestSuggestions } = useVerificationStore();
  if (retestSuggestions.length === 0) {
    return (
      <div className="card p-4 border-dashed text-slate-400 text-sm text-center">
        暂无复测建议
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {retestSuggestions.map((r) => {
        const b = priorityBadge(r.priority);
        return (
          <div key={r.id} className="card p-3 hover:shadow-hover transition">
            <div className="flex items-start gap-2">
              <RotateCcw size={16} className="mt-0.5 text-brand-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-slate-800">{r.additiveName}</span>
                  <span className={'chip gap-1 ' + b.cls}>{b.icon}{b.label}</span>
                  <span className="chip bg-slate-100 text-slate-600">建议 {r.sampleCount} 样</span>
                </div>
                <div className="text-sm text-slate-700">{r.reason}</div>
                <div className="text-xs text-slate-500 mt-1">复测方法：{r.method}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
