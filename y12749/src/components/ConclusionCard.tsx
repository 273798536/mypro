import { useState } from 'react';
import type { Conclusion } from '@/types';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calculator,
  Database,
  MessageCircle,
  History,
} from 'lucide-react';

interface Props {
  conclusion: Conclusion;
  index: number;
}

export default function ConclusionCard({ conclusion, index }: Props) {
  const [open, setOpen] = useState(false);
  const c = conclusion;

  return (
    <div
      className={`card-base p-4 animate-fade-up transition-all ${
        c.affectedByMissingCharts ? 'opacity-60 border-amber-300 bg-amber-50/30' : ''
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
            c.passed ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-500'
          }`}
        >
          {c.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-sm font-semibold text-navy-800">{c.title}</h3>
            {c.affectedByMissingCharts && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 border border-amber-200">
                <AlertTriangle size={10} />
                受图表缺失影响
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
            <span className={`text-lg font-bold ${c.passed ? 'text-teal-600' : 'text-red-600'}`}>
              {c.value}
            </span>
            {c.historicalVersion && (
              <span className="text-[11px] text-navy-400 line-through">
                上次：{c.historicalVersion.value}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-navy-600 leading-relaxed">{c.explanation}</p>

          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-navy-500 hover:text-navy-700 transition-colors"
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            展开依据与讲解话术
          </button>

          {open && (
            <div className="mt-2 space-y-2 pl-2 border-l-2 border-navy-100">
              <div className="flex gap-2 text-xs">
                <Database size={13} className="text-navy-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-navy-400 mb-0.5">数据依据</div>
                  <div className="text-navy-700">{c.dataBasis}</div>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <Calculator size={13} className="text-navy-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-navy-400 mb-0.5">计算口径</div>
                  <code className="block px-2 py-1 rounded bg-slate-50 text-navy-700 text-[11px] font-mono">
                    {c.formula}
                  </code>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <MessageCircle size={13} className="text-navy-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-navy-400 mb-0.5">给别人讲可以这样说</div>
                  <div className="text-navy-700 leading-relaxed italic">"{c.speakingScript}"</div>
                </div>
              </div>
              {c.historicalVersion && (
                <div className="flex gap-2 text-xs">
                  <History size={13} className="text-navy-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-[10px] text-navy-400 mb-0.5">历史版本</div>
                    <div className="text-navy-500">
                      {new Date(c.historicalVersion.updatedAt).toLocaleString('zh-CN')} ·{' '}
                      {c.historicalVersion.value}
                    </div>
                  </div>
                </div>
              )}
              {c.affectedByMissingCharts && c.affectedChartNames.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-[10px] text-amber-600 mb-0.5">本结论受以下缺失图表影响</div>
                    <div className="text-amber-700">{c.affectedChartNames.join('、')}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
