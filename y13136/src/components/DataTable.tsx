import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Divider, Edit3 } from 'lucide-react';
import type { VerificationRecord, BoundaryStatus } from '@/types';
import { formatNumber, formatDateTime } from '@/utils/common';

interface DataTableProps {
  records: VerificationRecord[];
  onAddJudgment?: (id: string, judgment: string) => void;
}

const statusConfig: Record<BoundaryStatus, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  normal: {
    label: '正常',
    icon: <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
  },
  boundary: {
    label: '边界',
    icon: <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
  },
  anomaly: {
    label: '异常',
    icon: <XCircle className="w-3.5 h-3.5" strokeWidth={2} />,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/30',
  },
};

function CalculationDetail({ record }: { record: VerificationRecord }) {
  return (
    <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-700/50 space-y-2">
      <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
        <Divider className="w-3.5 h-3.5" strokeWidth={1.8} />
        计算过程（中间步骤透明化）
      </div>
      <div className="space-y-1.5">
        {record.calculationSteps.map((step, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-2 rounded bg-slate-800/40 border border-slate-700/30"
          >
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 text-[10px] flex items-center justify-center text-slate-400 font-mono">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300">{step.stepName}</span>
                <code className="text-[10px] font-mono text-slate-500 bg-slate-900/60 px-1.5 py-0.5 rounded">
                  {step.formula}
                </code>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{step.description}</div>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono">
                <span className="text-slate-500">输入：</span>
                {Object.entries(step.inputs).map(([k, v]) => (
                  <span key={k} className="text-slate-400">
                    {k} = {formatNumber(v)}
                  </span>
                ))}
                <span className="text-slate-600">→</span>
                <span className="text-emerald-400">结果 = {formatNumber(step.output)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {record.tempJudgment && (
        <div className="mt-3 p-2 rounded border border-sky-500/30 bg-sky-500/5">
          <div className="text-xs font-medium text-sky-400 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5" strokeWidth={1.8} />
            临时判断
            {record.judgeName && <span className="text-sky-500/70">by {record.judgeName}</span>}
          </div>
          <div className="text-xs text-slate-300 mt-1">{record.tempJudgment}</div>
          {record.judgedAt && (
            <div className="text-[10px] text-slate-500 mt-0.5">{formatDateTime(record.judgedAt)}</div>
          )}
        </div>
      )}
    </div>
  );
}

function RawDataBadge({ record }: { record: VerificationRecord }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShow(!show)}
        className="text-[10px] px-1.5 py-0.5 rounded border border-slate-600 text-slate-400 hover:text-slate-300 hover:border-slate-500 transition-colors font-mono"
      >
        原始数据
      </button>
      {show && (
        <div className="absolute top-full left-0 mt-1 z-20 p-2 rounded border border-slate-600 bg-slate-800 shadow-lg w-48">
          <div className="text-[10px] text-slate-500 mb-1">原始值（未清洗）</div>
          <div className="text-xs font-mono text-slate-300 space-y-0.5">
            <div>权重: <span className="text-amber-400">{record.rawWeight}</span></div>
            <div>概率: <span className="text-amber-400">{record.rawProbability}</span></div>
          </div>
          <div className="text-[9px] text-slate-600 mt-1.5">保留原始来源，不做数据清洗</div>
        </div>
      )}
    </div>
  );
}

export default function DataTable({ records, onAddJudgment }: DataTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [judgingId, setJudgingId] = useState<string | null>(null);
  const [judgeText, setJudgeText] = useState('');

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const handleSubmitJudgment = (id: string) => {
    if (onAddJudgment && judgeText.trim()) {
      onAddJudgment(id, judgeText.trim());
      setJudgeText('');
      setJudgingId(null);
    }
  };

  if (records.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500">
        <div className="text-sm">暂无数据</div>
        <div className="text-xs text-slate-600 mt-1">上传参数表后开始校验</div>
      </div>
    );
  }

  return (
    <div className="rounded border border-slate-700/50 bg-slate-800/20 overflow-hidden">
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm table-fixed-header">
          <thead>
            <tr className="bg-slate-800/80 backdrop-blur text-xs text-slate-400">
              <th className="w-8 px-3 py-2.5 text-left font-medium"></th>
              <th className="px-3 py-2.5 text-left font-medium w-36">状态名称</th>
              <th className="px-3 py-2.5 text-right font-medium w-28">权重</th>
              <th className="px-3 py-2.5 text-right font-medium w-32">转移概率</th>
              <th className="px-3 py-2.5 text-right font-medium w-28">行和</th>
              <th className="px-3 py-2.5 text-center font-medium w-24">边界状态</th>
              <th className="px-3 py-2.5 text-center font-medium w-24">除零标记</th>
              <th className="px-3 py-2.5 text-center font-medium w-24">原始数据</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {records.map((record) => {
              const status = statusConfig[record.boundaryStatus];
              const isExpanded = expandedIds.has(record.id);
              const rowSum = record.weight + record.transitionProbability;

              return (
                <React.Fragment key={record.id}>
                  <tr
                    className={`transition-colors group ${
                      record.isZeroDivision ? 'zero-division-row breathe-glow' : 'hover:bg-slate-700/20'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleExpand(record.id)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" strokeWidth={2} />
                        ) : (
                          <ChevronRight className="w-4 h-4" strokeWidth={2} />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-200 truncate">{record.stateName}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {isNaN(record.weight) ? <span className="text-rose-400">N/A</span> : formatNumber(record.weight, 4)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {isNaN(record.transitionProbability) ? (
                        <span className="text-rose-400">N/A</span>
                      ) : (
                        formatNumber(record.transitionProbability, 4)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isNaN(rowSum) ? (
                        <span className="text-rose-400">N/A</span>
                      ) : (
                        <span className={status.color}>{formatNumber(rowSum, 4)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] ${status.color} ${status.bgColor}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {record.isZeroDivision ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] text-amber-400 border-amber-500/40 bg-amber-500/10">
                          <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                          除零
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <RawDataBadge record={record} />
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <CalculationDetail record={record} />
                        {onAddJudgment && (
                          <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-900/30">
                            {judgingId === record.id ? (
                              <div className="flex gap-2">
                                <input
                                  autoFocus
                                  value={judgeText}
                                  onChange={(e) => setJudgeText(e.target.value)}
                                  placeholder="输入临时判断..."
                                  className="flex-1 px-2 py-1.5 text-xs rounded border border-slate-600 bg-slate-800 text-slate-300 focus:outline-none focus:border-sky-500"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSubmitJudgment(record.id);
                                    if (e.key === 'Escape') {
                                      setJudgingId(null);
                                      setJudgeText('');
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleSubmitJudgment(record.id)}
                                  className="px-3 py-1 text-xs rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 transition-colors"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={() => {
                                    setJudgingId(null);
                                    setJudgeText('');
                                  }}
                                  className="px-3 py-1 text-xs rounded border border-slate-600 text-slate-400 hover:bg-slate-700/50 transition-colors"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setJudgingId(record.id)}
                                className="text-xs text-slate-500 hover:text-sky-400 flex items-center gap-1 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" strokeWidth={1.8} />
                                添加临时判断
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
