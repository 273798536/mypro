import { useState } from 'react';
import { ChevronDown, ArrowRightLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';
import { formatNumber } from '@/utils/common';
import type { VerificationRecord, BoundaryStatus } from '@/types';

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

  return (
    <>
      <tr className={`border-b border-slate-700/40 transition-colors ${hasWeightDiff || hasStatusDiff ? 'bg-amber-500/5' : ''}`}>
        <td className="px-3 py-2 text-sm text-slate-300 font-medium w-36">{stateName}</td>

        <td className={`px-3 py-2 text-right font-mono text-sm ${leftRecord ? statusConfig[leftRecord.boundaryStatus] : 'text-slate-600'}`}>
          {leftRecord ? (isNaN(leftRecord.weight) ? 'N/A' : formatNumber(leftRecord.weight, 4)) : '—'}
        </td>
        <td className={`px-3 py-2 text-right font-mono text-sm ${rightRecord ? statusConfig[rightRecord.boundaryStatus] : 'text-slate-600'}`}>
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
          <td colSpan={7} className="p-0">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/50 border-b border-slate-700/40">
              <div className="space-y-2">
                <div className="text-xs text-slate-500">左侧 · 计算过程</div>
                {leftRecord ? (
                  leftRecord.calculationSteps.map((step, idx) => (
                    <div key={idx} className="text-[11px] p-2 rounded bg-slate-800/40 border border-slate-700/30">
                      <div className="font-medium text-slate-300">{step.stepName}</div>
                      <div className="text-slate-500 mt-0.5">{step.description}</div>
                      <div className="font-mono text-slate-400 mt-1">
                        结果 = <span className="text-emerald-400">{formatNumber(step.output)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-600">无数据</div>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-xs text-slate-500">右侧 · 计算过程</div>
                {rightRecord ? (
                  rightRecord.calculationSteps.map((step, idx) => (
                    <div key={idx} className="text-[11px] p-2 rounded bg-slate-800/40 border border-slate-700/30">
                      <div className="font-medium text-slate-300">{step.stepName}</div>
                      <div className="text-slate-500 mt-0.5">{step.description}</div>
                      <div className="font-mono text-slate-400 mt-1">
                        结果 = <span className="text-emerald-400">{formatNumber(step.output)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-600">无数据</div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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

  const diffCount = allStates.filter(
    (s) => leftMap.get(s)?.weight !== rightMap.get(s)?.weight || leftMap.get(s)?.boundaryStatus !== rightMap.get(s)?.boundaryStatus
  ).length;

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
                <th className="px-3 py-2.5 text-right font-medium w-32">左侧权重</th>
                <th className="px-3 py-2.5 text-right font-medium w-32">右侧权重</th>
                <th className="px-3 py-2.5 text-center font-medium w-16">变化</th>
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
