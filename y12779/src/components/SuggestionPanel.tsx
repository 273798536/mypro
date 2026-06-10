import React from 'react';
import {
  CheckCircle2,
  RefreshCcw,
  Trash2,
  ArrowRight,
  Beaker,
  ThermometerSun,
  Gauge,
  Plus,
  Ban,
} from 'lucide-react';
import { useReportStore } from '../store/useReportStore';
import { SuggestionLevel } from '../types';
import { getSupplementLabel, formatDateTime } from '../utils/validation';

const LEVEL_CONFIG: Record<
  SuggestionLevel,
  {
    title: string;
    sub: string;
    icon: React.FC<{ className?: string }>;
    border: string;
    accent: string;
    bg: string;
    badge: string;
  }
> = {
  release: {
    title: '建议放行',
    sub: '数据满足质控阈值',
    icon: CheckCircle2,
    border: 'border-status-success/30',
    accent: 'text-status-success',
    bg: 'from-status-success/10 to-transparent',
    badge: 'tag-success',
  },
  retest: {
    title: '建议复测',
    sub: '建议补充数据或复测确认',
    icon: RefreshCcw,
    border: 'border-status-pending/40',
    accent: 'text-amber-700',
    bg: 'from-status-pending/20 to-transparent',
    badge: 'tag-pending',
  },
  discard: {
    title: '建议废弃',
    sub: '数据可信度不足',
    icon: Trash2,
    border: 'border-status-failed/30',
    accent: 'text-status-failed',
    bg: 'from-status-failed/10 to-transparent',
    badge: 'tag-failed',
  },
};

export const SuggestionPanel: React.FC = () => {
  const batches = useReportStore((s) => s.batches);
  const selectedBatchId = useReportStore((s) => s.selectedBatchId);
  const setSelectedBatchId = useReportStore((s) => s.setSelectedBatchId);

  const display =
    batches.find((b) => b.id === selectedBatchId) ||
    batches.find((b) => b.status === 'failed') ||
    batches.find((b) => b.status === 'pending') ||
    batches[0];

  if (!display || !display.retestSuggestion) {
    return (
      <div className="card-paper p-8 text-center text-gray-400">
        <Ban className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">暂无批次数据</p>
      </div>
    );
  }

  const cfg = LEVEL_CONFIG[display.retestSuggestion.level];
  const Icon = cfg.icon;

  return (
    <div className={`card-paper overflow-hidden border-2 ${cfg.border}`}>
      <div className={`bg-gradient-to-r ${cfg.bg} p-5 border-b border-paper-200`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl bg-white/80 shadow-soft ${cfg.accent}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-serif text-xl font-bold ${cfg.accent}`}>{cfg.title}</h3>
                <span className={cfg.badge}>{cfg.sub}</span>
              </div>
              <p className="mt-1 text-xs font-mono text-gray-500">
                批次 {display.batchNo} · 研究员 {display.researcher}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-white/60 border border-paper-200 overflow-hidden">
            {batches.slice(0, 6).map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBatchId(b.id)}
                className={`px-2.5 py-1.5 text-xs font-mono transition-colors ${
                  b.id === display.id
                    ? 'bg-brand-800 text-white'
                    : 'text-gray-600 hover:bg-paper-100'
                }`}
                title={b.batchNo}
              >
                {b.batchNo.slice(-3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 mb-2">
            判定理由
          </p>
          <div className="p-4 rounded-lg bg-paper-100 border border-paper-200 text-sm text-gray-700 leading-relaxed">
            {display.retestSuggestion.reason}
          </div>
        </div>

        {display.blockerReasons && display.blockerReasons.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-status-failed mb-2 flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5" />
              拦阻原因（导出报告会包含）
            </p>
            <ul className="space-y-1.5">
              {display.blockerReasons.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-lg bg-status-failed/5 border-l-4 border-l-status-failed border-y border-r border-paper-200"
                >
                  <span className="font-mono text-xs font-bold text-status-failed mt-0.5">
                    #{i + 1}
                  </span>
                  <span className="text-sm text-gray-700">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {display.retestSuggestion.supplementRequired.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              需补录字段
            </p>
            <div className="flex flex-wrap gap-2">
              {display.retestSuggestion.supplementRequired.map((f) => (
                <span
                  key={f}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium"
                >
                  {getSupplementLabel(f)}
                </span>
              ))}
            </div>
          </div>
        )}

        {display.retestSuggestion.suggestedConditions &&
          Object.keys(display.retestSuggestion.suggestedConditions).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 mb-2 flex items-center gap-1.5">
                <Beaker className="w-3.5 h-3.5" />
                建议调整的反应条件
              </p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(display.retestSuggestion.suggestedConditions).map(([k, v]) => {
                  const IconComp =
                    k === 'temperature'
                      ? ThermometerSun
                      : k === 'pressure' || k === 'catalystLoading'
                      ? Gauge
                      : Beaker;
                  return (
                    <div
                      key={k}
                      className="flex items-center gap-2 p-3 rounded-lg bg-brand-50 border border-brand-100"
                    >
                      <IconComp className="w-4 h-4 text-brand-700 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                          {getSupplementLabel(k)}
                        </p>
                        <p className="text-sm font-mono font-semibold text-brand-800 truncate">
                          {String(v)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        <div className="pt-2 flex items-center justify-between text-xs text-gray-400 border-t border-paper-200">
          <span className="font-mono">
            建议生成时间：{formatDateTime(display.retestSuggestion.generatedAt)}
          </span>
          <button
            onClick={() => setSelectedBatchId(null)}
            className="flex items-center gap-1 text-brand-600 hover:text-brand-800 font-medium"
          >
            查看全部批次
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
