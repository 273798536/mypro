import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Minus, Edit3,
  ArrowRightLeft, AlertOctagon, Calculator, Percent, Info,
} from 'lucide-react';
import type { VerificationRecord, BoundaryStatus, CalculationStep, UnitConversion, ZeroDivisionSource } from '@/types';
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

const zeroSourceLabels: Record<ZeroDivisionSource, { short: string; long: string; color: string }> = {
  weight_raw_zero:            { short: 'W=0',   long: '原始权重本身为零',           color: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
  probability_raw_zero:       { short: 'P=0',   long: '原始概率本身为零',           color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  transition_count_sum:       { short: 'ΣCnt',  long: '转移计数求和为零（归一化分母）', color: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' },
  steady_state_denominator:   { short: '1-W',   long: '稳态求解分母(1-W)为零',       color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  weight_normalize_sum:       { short: 'ΣW',    long: '全局权重求和为零（归一化分母）', color: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
};

function UnitConversionCard({ conv }: { conv: UnitConversion }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded bg-violet-500/5 border border-violet-500/20">
      <Percent className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" strokeWidth={1.8} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-violet-300 font-medium">
          {conv.appliedField === 'weight' ? '权重' : conv.appliedField === 'probability' ? '概率' : '权重/概率'}单位换算
        </div>
        <div className="text-[11px] font-mono text-slate-300 mt-0.5">
          <span className="text-slate-400">{formatNumber(conv.valueBefore)}</span>
          <span className="mx-1 text-violet-400">[{conv.fromUnit}]</span>
          <ArrowRightLeft className="w-3 h-3 inline text-violet-500" strokeWidth={1.8} />
          <span className="ml-1 text-emerald-400">{formatNumber(conv.valueAfter)}</span>
          <span className="mx-1 text-violet-400">[{conv.toUnit}]</span>
          <span className="ml-1 text-[10px] text-slate-500">×{conv.factor}</span>
        </div>
        {conv.note && <div className="text-[10px] text-slate-500 mt-0.5">{conv.note}</div>}
      </div>
    </div>
  );
}

function ZeroDivisionSummary({ sources, reason }: { sources: ZeroDivisionSource[]; reason?: string }) {
  return (
    <div className="p-2.5 rounded bg-amber-500/8 border border-amber-500/30">
      <div className="flex items-center gap-1.5 mb-1.5">
        <AlertOctagon className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.8} />
        <span className="text-[11px] font-medium text-amber-300">除零边界来源（共 {sources.length} 处）</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {sources.map((s) => {
          const meta = zeroSourceLabels[s] || { short: s, long: s, color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' };
          return (
            <span
              key={s}
              title={meta.long}
              className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${meta.color}`}
            >
              {meta.short}
            </span>
          );
        })}
      </div>
      {reason && <div className="text-[10px] text-amber-200/80">{reason}</div>}
      <div className="text-[10px] text-slate-500 mt-1">
        展开下方步骤，查看具体哪一步触发了除零（步骤名称含 ⚠️）
      </div>
    </div>
  );
}

function ErrorCard({ parseError, computeError }: { parseError?: string; computeError?: string }) {
  return (
    <div className="space-y-1.5">
      {parseError && (
        <div className="flex items-start gap-2 p-2 rounded bg-rose-500/8 border border-rose-500/30">
          <AlertOctagon className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
          <div>
            <div className="text-[11px] font-medium text-rose-300">解析失败</div>
            <div className="text-[11px] text-rose-200/90 mt-0.5">{parseError}</div>
            <div className="text-[10px] text-rose-300/60 mt-0.5">已自动判定为「异常」状态，建议核对原始数据</div>
          </div>
        </div>
      )}
      {computeError && (
        <div className="flex items-start gap-2 p-2 rounded bg-orange-500/8 border border-orange-500/30">
          <Calculator className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
          <div>
            <div className="text-[11px] font-medium text-orange-300">计算中断</div>
            <div className="text-[11px] text-orange-200/90 mt-0.5">{computeError}</div>
            <div className="text-[10px] text-orange-300/60 mt-0.5">部分中间步骤无输出结果，请查看具体计算步骤</div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalculationDetail({ record }: { record: VerificationRecord }) {
  const hasErrors = record.parseError || record.computeError;
  const hasUnitConv = record.unitConversions && record.unitConversions.length > 0;
  const hasZeroDiv = record.isZeroDivision;

  return (
    <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-700/50 space-y-3 animate-fade-in">
      {(hasErrors || hasUnitConv || hasZeroDiv) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {hasUnitConv && record.unitConversions.map((c) => (
            <UnitConversionCard key={c.id} conv={c} />
          ))}
          {hasZeroDiv && (
            <ZeroDivisionSummary sources={record.zeroDivisionSources} reason={record.zeroDivisionReason} />
          )}
          {hasErrors && (
            <div className={hasUnitConv || hasZeroDiv ? '' : 'md:col-span-2'}>
              <ErrorCard parseError={record.parseError} computeError={record.computeError} />
            </div>
          )}
        </div>
      )}

      <div>
        <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
          <Minus className="w-3.5 h-3.5" strokeWidth={1.8} />
          计算过程（{record.calculationSteps.length} 步，中间结果不隐藏）
        </div>
        <div className="space-y-1.5">
          {record.calculationSteps.map((step: CalculationStep, idx: number) => {
            const isZeroStep = step.isZeroDivision;
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 p-2 rounded border ${
                  isZeroStep
                    ? 'bg-amber-500/8 border-amber-500/30'
                    : 'bg-slate-800/40 border-slate-700/30'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                    isZeroStep ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        isZeroStep ? 'text-amber-200' : 'text-slate-300'
                      }`}
                    >
                      {step.stepName}
                    </span>
                    <code
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isZeroStep ? 'bg-amber-900/40 text-amber-300' : 'bg-slate-900/60 text-slate-500'
                      }`}
                    >
                      {step.formula}
                    </code>
                    {step.zeroDivisionSource && (
                      <span
                        className={`text-[9px] px-1 py-px rounded border font-mono ${
                          zeroSourceLabels[step.zeroDivisionSource]?.color ||
                          'text-amber-400 border-amber-500/30 bg-amber-500/10'
                        }`}
                      >
                        source: {zeroSourceLabels[step.zeroDivisionSource]?.short || step.zeroDivisionSource}
                      </span>
                    )}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isZeroStep ? 'text-amber-200/80' : 'text-slate-500'}`}>
                    {step.description}
                  </div>
                  {step.zeroDivisionDetail && (
                    <div className="text-[10px] text-amber-300/80 mt-0.5 flex items-start gap-1">
                      <Info className="w-3 h-3 mt-px flex-shrink-0" strokeWidth={1.8} />
                      {step.zeroDivisionDetail}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] font-mono">
                    <span className="text-slate-500">输入：</span>
                    {Object.entries(step.inputs).map(([k, v]) => (
                      <span key={k} className="text-slate-400">
                        {k}=<span className="text-slate-300">{typeof v === 'number' ? formatNumber(v) : v}</span>
                      </span>
                    ))}
                    <span className="text-slate-600">→</span>
                    <span>
                      结果=<span className={isNaN(step.output) ? 'text-rose-400' : 'text-emerald-400'}>
                        {formatNumber(step.output)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {record.tempJudgment && (
        <div className="p-2 rounded border border-sky-500/30 bg-sky-500/5">
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
        onBlur={() => setTimeout(() => setShow(false), 200)}
        className="text-[10px] px-1.5 py-0.5 rounded border border-slate-600 text-slate-400 hover:text-slate-300 hover:border-slate-500 transition-colors font-mono"
      >
        原始数据
      </button>
      {show && (
        <div className="absolute top-full left-0 mt-1 z-20 p-2 rounded border border-slate-600 bg-slate-800 shadow-lg w-52">
          <div className="text-[10px] text-slate-500 mb-1.5">原始值（未清洗，保留来源）</div>
          <div className="text-xs font-mono text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">权重：</span>
              <span className="text-amber-400">{record.rawWeight}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">概率：</span>
              <span className="text-amber-400">{record.rawProbability}</span>
            </div>
          </div>
          {record.unitConversions.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-700 text-[10px] text-violet-400">
              ⚡ 已进行 {record.unitConversions.length} 次单位换算
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ZeroDivisionBadge({ record }: { record: VerificationRecord }) {
  const [show, setShow] = useState(false);
  if (!record.isZeroDivision) {
    return <span className="text-slate-600 text-[11px]">—</span>;
  }
  return (
    <div className="relative inline-block flex justify-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] text-amber-400 border-amber-500/40 bg-amber-500/10 cursor-help">
        <AlertTriangle className="w-3 h-3" strokeWidth={2} />
        除零
        <span className="ml-0.5 text-[9px] text-amber-400/70 font-mono">×{record.zeroDivisionSources.length}</span>
      </span>
      {show && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-30 p-2 rounded border border-amber-500/40 bg-slate-800 shadow-xl w-56">
          <div className="text-[10px] font-medium text-amber-300 mb-1">除零边界来源</div>
          <div className="space-y-1">
            {record.zeroDivisionSources.map((s) => {
              const meta = zeroSourceLabels[s];
              return (
                <div key={s} className="text-[10px]">
                  <code className="font-mono text-amber-400">{meta?.short || s}</code>
                  <span className="text-slate-400"> — {meta?.long || s}</span>
                </div>
              );
            })}
          </div>
          <div className="text-[9px] text-slate-500 mt-1.5">展开行查看每一步详情</div>
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
      <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
        <table className="w-full text-sm table-fixed-header">
          <thead>
            <tr className="bg-slate-800/80 backdrop-blur text-xs text-slate-400">
              <th className="w-8 px-3 py-2.5 text-left font-medium"></th>
              <th className="px-3 py-2.5 text-left font-medium w-32">状态名称</th>
              <th className="px-3 py-2.5 text-right font-medium w-24">权重</th>
              <th className="px-3 py-2.5 text-right font-medium w-28">转移概率</th>
              <th className="px-3 py-2.5 text-right font-medium w-24">行和</th>
              <th className="px-3 py-2.5 text-center font-medium w-20">边界</th>
              <th className="px-3 py-2.5 text-center font-medium w-20">除零</th>
              <th className="px-3 py-2.5 text-center font-medium w-24">单位</th>
              <th className="px-3 py-2.5 text-center font-medium w-24">原始数据</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {records.map((record) => {
              const status = statusConfig[record.boundaryStatus];
              const isExpanded = expandedIds.has(record.id);
              const rowSum = record.weight + record.transitionProbability;
              const unitCount = record.unitConversions?.length || 0;

              return (
                <React.Fragment key={record.id}>
                  <tr
                    className={`transition-colors group ${
                      record.isZeroDivision
                        ? 'zero-division-row breathe-glow'
                        : record.parseError
                        ? 'bg-rose-500/5 hover:bg-rose-500/10'
                        : 'hover:bg-slate-700/20'
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
                    <td className="px-3 py-2 font-medium text-slate-200 truncate">
                      {record.stateName}
                      {record.parseError && (
                        <AlertOctagon className="w-3 h-3 text-rose-400 inline ml-1" strokeWidth={2} />
                      )}
                    </td>
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
                      <ZeroDivisionBadge record={record} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {unitCount > 0 ? (
                        <span
                          title={record.unitConversions.map((c) => c.fromUnit + '→' + c.toUnit).join(', ')}
                          className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono text-violet-400 border-violet-500/40 bg-violet-500/10 cursor-help"
                        >
                          <Percent className="w-3 h-3 mr-0.5" strokeWidth={2} />
                          ×{unitCount}
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
                      <td colSpan={9} className="p-0">
                        <CalculationDetail record={record} />
                        {onAddJudgment && (
                          <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-900/30">
                            {judgingId === record.id ? (
                              <div className="flex gap-2">
                                <input
                                  autoFocus
                                  value={judgeText}
                                  onChange={(e) => setJudgeText(e.target.value)}
                                  placeholder="输入临时判断（例如：除零来自业务规则，允许放行）..."
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
                                添加临时判断（记入历史）
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
