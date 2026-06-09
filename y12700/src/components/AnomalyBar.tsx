import { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  FileSearch,
  Ruler,
  RefreshCw,
  UserCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { useStore } from '@/store';
import { SUGGESTION_LABEL } from '@/utils/diagnosis';
import type { AnomalyItem, AnomalySeverity, AnomalySuggestion } from '@/types';

const SEV_STYLE: Record<AnomalySeverity, { bg: string; border: string; text: string; Icon: typeof AlertTriangle }> = {
  info:    { bg: 'bg-ink-50',   border: 'border-ink-200',   text: 'text-ink-700',   Icon: Info },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', Icon: AlertTriangle },
  error:   { bg: 'bg-rose-50',  border: 'border-rose-200',  text: 'text-rose-700',  Icon: AlertOctagon },
};

const SUGG_ICON: Record<AnomalySuggestion, typeof FileSearch> = {
  fill_material: FileSearch,
  adjust_caliber: Ruler,
  recollect: RefreshCw,
  review: UserCheck,
};

const SUGG_BTN: Record<AnomalySuggestion, string> = {
  fill_material: 'btn-outline-a',
  adjust_caliber: 'btn-outline-a',
  recollect: 'btn-outline-r',
  review: 'btn-ghost',
};

function TypeIcon({ type }: { type: AnomalyItem['type'] }) {
  if (type === 'unit_missing') return <Ruler className="w-3.5 h-3.5" />;
  if (type === 'value_invalid') return <XCircle className="w-3.5 h-3.5" />;
  if (type === 'near_singular') return <AlertCircle className="w-3.5 h-3.5" />;
  return <AlertTriangle className="w-3.5 h-3.5" />;
}

function TypeLabel({ type }: { type: AnomalyItem['type'] }) {
  const map: Record<AnomalyItem['type'], string> = {
    unit_missing: '单位缺失',
    value_invalid: '数值无效',
    near_singular: '接近奇异',
    large_error: '误差偏大',
  };
  return <span>{map[type]}</span>;
}

export default function AnomalyBar() {
  const anomalies = useStore(s => s.anomalies);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!anomalies.length) {
    return (
      <div className="card p-4 animate-fade-up border-forest-200/70 bg-forest-50/40">
        <div className="flex items-center gap-2 text-forest-700 text-sm">
          <Info className="w-4 h-4" />
          <span className="font-medium">未检测到异常 — 数据完整、计算稳定</span>
        </div>
      </div>
    );
  }

  const errCount = anomalies.filter(a => a.severity === 'error').length;
  const warnCount = anomalies.filter(a => a.severity === 'warning').length;

  return (
    <div className="card p-4 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h3 className="font-serif text-ink-800 font-semibold">异常诊断</h3>
          <span className="chip bg-rose-50 text-rose-700 border border-rose-200">
            {errCount} 严重
          </span>
          <span className="chip bg-amber-50 text-amber-700 border border-amber-200">
            {warnCount} 警示
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {anomalies.map(a => {
          const style = SEV_STYLE[a.severity];
          const SuggIcon = SUGG_ICON[a.suggestion];
          const open = openId === a.id;
          return (
            <div
              key={a.id}
              className={`rounded-xl border ${style.border} ${style.bg} transition-all overflow-hidden`}
            >
              <button
                onClick={() => setOpenId(open ? null : a.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm ${style.text} font-medium hover:bg-white/60 w-full text-left`}
              >
                <TypeIcon type={a.type} />
                <TypeLabel type={a.type} />
                {a.cellRef && (
                  <span className="font-mono text-[11px] opacity-70">
                    ({a.cellRef.row + 1},{a.cellRef.col + 1})
                  </span>
                )}
                {open ? (
                  <ChevronUp className="w-3.5 h-3.5 ml-1 opacity-70" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
                )}
              </button>
              {open && (
                <div className="px-3 pb-3 pt-0 border-t border-white/60 space-y-2 animate-fade-up">
                  <p className={`text-[12.5px] ${style.text} mt-2`}>{a.message}</p>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/70 border border-white">
                    <SuggIcon className={`w-4 h-4 shrink-0 mt-0.5 ${style.text}`} />
                    <div className="flex-1">
                      <div className={`text-[12px] font-semibold ${style.text}`}>
                        下一步：{SUGGESTION_LABEL[a.suggestion]}
                      </div>
                      <div className="text-[12px] text-ink-600 mt-0.5">{a.suggestionText}</div>
                    </div>
                    <button className={SUGG_BTN[a.suggestion]} style={{ padding: '6px 10px', fontSize: '12px' }}>
                      <SuggIcon className="w-3.5 h-3.5" />
                      {SUGGESTION_LABEL[a.suggestion]}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
