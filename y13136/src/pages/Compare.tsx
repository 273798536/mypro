import { useState } from 'react';
import {
  ChevronDown, ArrowRightLeft, TrendingUp, TrendingDown, Minus,
  Percent, AlertOctagon, Calculator, AlertCircle,
} from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';
import { formatNumber } from '@/utils/common';
import type {
  VerificationRecord, BoundaryStatus, UnitConversion, ZeroDivisionSource,
} from '@/types';

const ZERO_SRC_META: Record<ZeroDivisionSource, { short: string; long: string }> = {
  weight_raw_zero: { short: 'W=0', long: '原始权重为零' },
  probability_raw_zero: { short: 'P=0', long: '原始概率为零' },
  transition_count_sum: { short: 'ΣCnt', long: '转移计数归一化分母为零' },
  steady_state_denominator: { short: '1-W', long: '稳态求解分母(1-W)=0' },
  weight_normalize_sum: { short: 'ΣW', long: '全局权重归一化分母为零' },
};

function renderUnitBadge(record?: VerificationRecord) {
  if (!record) return <span className="text-slate-700">—</span>;
  const convs = record.unitConversions || [];
  if (convs.length === 0) {
    return <span className="text-[10px] text-slate-600">无</span>;
  }
  return (
    <div className="space-y-0.5">
      {convs.slice(0, 2).map((u, i) => (
        <div
          key={i}
          className="inline-block w-full text-center px-1 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/30"
          title={`${u.appliedField === 'weight' ? '权重' : '概率'}：${u.valueBefore}${u.fromUnit} → ${formatNumber(u.valueAfter)} (×${u.factor})`}
        >
          {u.appliedField === 'weight' ? 'W' : 'P'}×{u.factor}
        </div>
      ))}
      {convs.length > 2 && (
        <div className="text-[9px] text-violet-400 text-center">+{convs.length - 2}项</div>
      )}
    </div>
  );
}

function renderZeroBadge(record?: VerificationRecord) {
  if (!record || !record.isZeroDivision) {
    return <span className="text-[10px] text-slate-600">无</span>;
  }
  const sources: ZeroDivisionSource[] = record.zeroDivisionSources || [];
  return (
    <div
      className="text-center"
      title={sources.map((s) => `${ZERO_SRC_META[s]?.short || s}：${ZERO_SRC_META[s]?.long || s}`).join('\n')}
    >
      <div className="flex flex-wrap gap-0.5 justify-center">
        {sources.slice(0, 3).map((s) => (
          <span
            key={s}
            className="px-1 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30"
          >
            {ZERO_SRC_META[s]?.short || s}
          </span>
        ))}
      </div>
      {sources.length > 3 && (
        <div className="text-[9px] text-amber-400 mt-0.5">+{sources.length - 3}</div>
      )}
    </div>
  );
}

function UnitConvPanel({ record }: { record?: VerificationRecord }) {
  const convs = record?.unitConversions || [];
  if (convs.length === 0) {
    return <div className="text-xs text-slate-600">无单位换算</div>;
  }
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-violet-300 font-medium flex items-center gap-1">
        <Percent className="w-3 h-3" strokeWidth={1.8} />
        单位换算（{convs.length}次）
      </div>
      {convs.map((u: UnitConversion) => (
        <div key={u.id} className="p-2 rounded bg-violet-500/5 border border-violet-500/20 text-[11px]">
          <div className="text-slate-300 font-mono">
            {u.appliedField === 'weight' ? '权重' : '概率'}：
            <span className="text-slate-400">{formatNumber(u.valueBefore)}</span>
            <span className="text-violet-400">[{u.fromUnit}]</span>
            <span className="mx-1 text-slate-600">→</span>
            <span className="text-emerald-400">{formatNumber(u.valueAfter)}</span>
            <span className="text-violet-400">[{u.toUnit}]</span>
            <span className="ml-1 text-[10px] text-slate-500">×{u.factor}</span>
          </div>
          {u.note && <div className="text-[10px] text-slate-500 mt-0.5">{u.note}</div>}
        </div>
      ))}
    </div>
  );
}

function ZeroDivPanel({ record }: { record?: VerificationRecord }) {
  if (!record?.isZeroDivision) {
    return <div className="text-xs text-slate-600">无除零边界</div>;
  }
  const sources: ZeroDivisionSource[] = record.zeroDivisionSources || [];
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-amber-300 font-medium flex items-center gap-1">
        <AlertOctagon className="w-3 h-3" strokeWidth={1.8} />
        除零边界（{sources.length}处）
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <span
            key={s}
            className="px-1.5 py-0.5 rounded border text-[10px] font-mono bg-amber-500/10 text-amber-300 border-amber-500/30"
            title={ZERO_SRC_META[s]?.long || s}
          >
            {ZERO_SRC_META[s]?.short || s}
          </span>
        ))}
      </div>
      {record.zeroDivisionReason && (
        <div className="text-[10px] text-amber-200/80 mt-1">{record.zeroDivisionReason}</div>
      )}
    </div>
  );
}

function ErrorPanel({ record }: { record?: VerificationRecord }) {
  const pErr = record?.parseError;
  const cErr = record?.computeError;
  if (!pErr && !cErr) {
    return <div className="text-xs text-slate-600">无错误</div>;
  }
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-rose-300 font-medium flex items-center gap-1">
        <AlertCircle className="w-3 h-3" strokeWidth={1.8} />
        错误记录
      </div>
      {pErr && (
        <div className="p-2 rounded bg-rose-500/8 border border-rose-500/30 text-[11px]">
          <div className="text-rose-300 font-medium">解析失败</div>
          <div className="text-rose-200/90 mt-0.5">{pErr}</div>
        </div>
      )}
      {cErr && (
        <div className="p-2 rounded bg-orange-500/8 border border-orange-500/30 text-[11px]">
          <div className="text-orange-300 font-medium flex items-center gap-1">
            <Calculator className="w-3 h-3" strokeWidth={1.8} />
            计算中断
          </div>
          <div className="text-orange-200/90 mt-0.5">{cErr}</div>
        </div>
      )}
    </div>
  );
}

function CompareRow({
  leftRecord,
  rightRecord,
  stateName,
}: {
  leftRecord?: VerificationRecord;
  rightRecord?: VerificationRecord;
  stateName: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const leftWeight = leftRecord?.weight;
  const rightWeight = rightRecord?.weight;
  const hasWeightDiff =
    leftWeight !== undefined && rightWeight !== undefined && leftWeight !== rightWeight && !isNaN(leftWeight) && !isNaN(rightWeight);

  const weightDiff = hasWeightDiff ? (rightWeight! - leftWeight!) : 0;
  const weightDiffPct = hasWeightDiff && leftWeight !== 0 ? ((rightWeight! - leftWeight!) / Math.abs(leftWeight!)) * 100 : 0;

  const statusConfig: Record<BoundaryStatus, string> = {
    normal: 'text-emerald-400',
    boundary: 'text-amber-400',
    anomaly: 'text-rose-400',
  };

  const hasStatusDiff = leftRecord?.boundaryStatus !== rightRecord?.boundaryStatus;
  const hasZeroDiff = !!leftRecord?.isZeroDivision !== !!rightRecord?.isZeroDivision;
  const hasUnitDiff = (leftRecord?.unitConversions?.length || 0) !== (rightRecord?.unitConversions?.length || 0);
  const rowHighlight = hasWeightDiff || hasStatusDiff || hasZeroDiff || hasUnitDiff;

  return (
    <React.Fragment key={stateName}>
      <tr className={`border-b border-slate-700/40 transition-colors ${rowHighlight ? 'bg-amber-500/5' : ''}`}>
        <td className="px-3 py-2 text-sm text-slate-300 font-medium w-36">{stateName}</td>

        <td className="px-3 py-2 text-center w-14">{renderUnitBadge(leftRecord)}</td>
        <td className="px-3 py-2 text-center w-14">{renderUnitBadge(rightRecord)}</td>

        <td className={`px-3 py-2 text-right font-mono text-sm w-24 ${leftRecord ? statusConfig[leftRecord.boundaryStatus] : 'text-slate-600'}`}>
          {leftRecord ? (isNaN(leftRecord.weight) ? 'N/A' : formatNumber(leftRecord.weight, 4)) : '—'}
        </td>
        <td className={`px-3 py-2 text-right font-mono text-sm w-24 ${rightRecord ? statusConfig[rightRecord.boundaryStatus] : 'text-slate-600'}`}>
          {rightRecord ? (isNaN(rightRecord.weight) ? 'N/A' : formatNumber(rightRecord.weight, 4)) : '—'}
        </td>

        <td className="px-3 py-2 text-center w-16">
          {hasWeightDiff ? (
            <div className={`inline-flex items-center gap-0.5 text-[11px] font-mono ${weightDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {weightDiff > 0 ? <TrendingUp className="w-3 h-3" strokeWidth={2} /> : <TrendingDown className="w-3 h-3" strokeWidth={2} />}
              {weightDiff > 0 ? '+' : ''}
              {formatNumber(weightDiffPct, 1)}%
            </div>
          ) : leftRecord || rightRecord ? (
            <span className="text-slate-600 text-xs"><Minus className="w-3 h-3 inline" strokeWidth={2} /></span>
          ) : null}
        </td>

        <td className="px-3 py-2 text-center w-14">{renderZeroBadge(leftRecord)}</td>
        <td className="px-3 py-2 text-center w-14">{renderZeroBadge(rightRecord)}</td>

        <td className="px-3 py-2 text-center w-20">
          {leftRecord ? (
            <span className={`text-[11px] ${statusConfig[leftRecord.boundaryStatus]}`}>
              {leftRecord.boundaryStatus === 'normal' ? '正常' : leftRecord.boundaryStatus === 'boundary' ? '边界' : '异常'}
            </span>
          ) : (
            <span className="text-slate-600 text-xs">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-center w-20">
          {rightRecord ? (
            <span className={`text-[11px] ${statusConfig[rightRecord.boundaryStatus]}`}>
              {rightRecord.boundaryStatus === 'normal' ? '正常' : rightRecord.boundaryStatus === 'boundary' ? '边界' : '异常'}
            </span>
          ) : (
            <span className="text-slate-600 text-xs">—</span>
          )}
        </td>

        <td className="px-3 py-2 text-center w-12">
          <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-slate-300">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 -rotate-90" />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={11} className="p-0">
            <div className="p-4 bg-slate-900/50 border-b border-slate-700/40">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="text-xs text-slate-500">左侧 · 摘要信息</div>
                  <div className="grid grid-cols-1 gap-2">
                    <UnitConvPanel record={leftRecord} />
                    <ZeroDivPanel record={leftRecord} />
                    <ErrorPanel record={leftRecord} />
                  </div>
                  {leftRecord && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-700/40">
                      <div className="text-xs text-slate-500">计算过程</div>
                      {leftRecord.calculationSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className={`text-[11px] p-2 rounded border ${
                            step.isZeroDivision
                              ? 'bg-amber-500/8 border-amber-500/30'
                              : 'bg-slate-800/40 border-slate-700/30'
                          }`}
                        >
                          <div className={`font-medium ${step.isZeroDivision ? 'text-amber-300' : 'text-slate-300'}`}>
                            {step.stepName}
                            {step.isZeroDivision && step.zeroDivisionSource && (
                              <span className="ml-1 px-1 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                {ZERO_SRC_META[step.zeroDivisionSource]?.short || step.zeroDivisionSource}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 mt-0.5">{step.description}</div>
                          <div className="font-mono text-slate-400 mt-1">
                            结果 = <span className={step.isZeroDivision ? 'text-amber-400' : 'text-emerald-400'}>
                              {isNaN(step.output) ? 'NaN' : formatNumber(step.output)}
                            </span>
                          </div>
                          {step.zeroDivisionDetail && (
                            <div className="text-[10px] text-amber-300/70 mt-0.5">⚠ {step.zeroDivisionDetail}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="text-xs text-slate-500">右侧 · 摘要信息</div>
                  <div className="grid grid-cols-1 gap-2">
                    <UnitConvPanel record={rightRecord} />
                    <ZeroDivPanel record={rightRecord} />
                    <ErrorPanel record={rightRecord} />
                  </div>
                  {rightRecord && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-700/40">
                      <div className="text-xs text-slate-500">计算过程</div>
                      {rightRecord.calculationSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className={`text-[11px] p-2 rounded border ${
                            step.isZeroDivision
                              ? 'bg-amber-500/8 border-amber-500/30'
                              : 'bg-slate-800/40 border-slate-700/30'
                          }`}
                        >
                          <div className={`font-medium ${step.isZeroDivision ? 'text-amber-300' : 'text-slate-300'}`}>
                            {step.stepName}
                            {step.isZeroDivision && step.zeroDivisionSource && (
                              <span className="ml-1 px-1 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                {ZERO_SRC_META[step.zeroDivisionSource]?.short || step.zeroDivisionSource}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 mt-0.5">{step.description}</div>
                          <div className="font-mono text-slate-400 mt-1">
                            结果 = <span className={step.isZeroDivision ? 'text-amber-400' : 'text-emerald-400'}>
                              {isNaN(step.output) ? 'NaN' : formatNumber(step.output)}
                            </span>
                          </div>
                          {step.zeroDivisionDetail && (
                            <div className="text-[10px] text-amber-300/70 mt-0.5">⚠ {step.zeroDivisionDetail}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

export default function Compare() {
  const { versions } = useVerificationStore();
  const [leftId, setLeftId] = useState<string>(versions[1]?.id || '');
  const [rightId, setRightId] = useState<string>(versions[0]?.id || '');

  const leftVersion = versions.find((v) => v.id === leftId);
  const rightVersion = versions.find((v) => v.id === rightId);

  const leftMap = new Map(leftVersion?.verificationResults.map((r) => [r.stateName, r]) || []);
  const rightMap = new Map(rightVersion?.verificationResults.map((r) => [r.stateName, r]) || []);

  const allStates = Array.from(new Set([...leftMap.keys(), ...rightMap.keys()])).sort();

  const diffCount = allStates.filter((s) => {
    const l = leftMap.get(s);
    const r = rightMap.get(s);
    return (
      l?.weight !== r?.weight ||
      l?.boundaryStatus !== r?.boundaryStatus ||
      !!l?.isZeroDivision !== !!r?.isZeroDivision ||
      (l?.unitConversions?.length || 0) !== (r?.unitConversions?.length || 0)
    );
  }).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 flex-shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">参数对照</h2>
          <p className="text-xs text-slate-500">两组参数并排对比，中间计算过程透明化</p>
        </div>
        <div className="text-xs text-slate-500">
          差异项：<span className="text-amber-400 font-mono">{diffCount}</span> / {allStates.length}
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-slate-800">
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">左侧版本</label>
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border border-slate-700 bg-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version} — {v.description}
                </option>
              ))}
            </select>
          </div>

          <ArrowRightLeft className="w-5 h-5 text-slate-500 mt-5" strokeWidth={1.8} />

          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">右侧版本</label>
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border border-slate-700 bg-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version} — {v.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm table-fixed-header">
            <thead>
              <tr className="bg-slate-800/80 backdrop-blur text-xs text-slate-400">
                <th className="px-3 py-2.5 text-left font-medium w-36">状态名称</th>
                <th className="px-3 py-2.5 text-center font-medium w-14">左单位</th>
                <th className="px-3 py-2.5 text-center font-medium w-14">右单位</th>
                <th className="px-3 py-2.5 text-right font-medium w-24">左侧权重</th>
                <th className="px-3 py-2.5 text-right font-medium w-24">右侧权重</th>
                <th className="px-3 py-2.5 text-center font-medium w-16">变化</th>
                <th className="px-3 py-2.5 text-center font-medium w-14">左除零</th>
                <th className="px-3 py-2.5 text-center font-medium w-14">右除零</th>
                <th className="px-3 py-2.5 text-center font-medium w-20">左状态</th>
                <th className="px-3 py-2.5 text-center font-medium w-20">右状态</th>
                <th className="px-3 py-2.5 text-center font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {allStates.map((state) => (
                <CompareRow
                  key={state}
                  stateName={state}
                  leftRecord={leftMap.get(state)}
                  rightRecord={rightMap.get(state)}
                />
              ))}
            </tbody>
          </table>

          {allStates.length === 0 && (
            <div className="py-16 text-center text-sm text-slate-500">请选择两个版本进行对比</div>
          )}
        </div>
      </div>
    </div>
  );
}
