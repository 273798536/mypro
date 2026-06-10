import { useEffect, useState } from 'react';
import { useReportStore } from '@/store/useReportStore';
import { useMutationCalculator } from '@/hooks/useMutationCalculator';
import { AlertTriangle, Check, Info, FlaskConical } from 'lucide-react';
import { formatNumber } from '@/utils/calculator';

export default function CalculationCard() {
  const { samples, selectedSampleId, params } = useReportStore();
  const selected = samples.find((s) => s.id === selectedSampleId);
  const result = useMutationCalculator(selected, params);
  const [animatedValue, setAnimatedValue] = useState({ mf: 0, af: 0, cd: 0 });

  useEffect(() => {
    if (!result) return;
    const steps = 12;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      setAnimatedValue({
        mf: result.mutationFrequency * progress,
        af: result.alleleFrequency * progress,
        cd: result.coverageDepth * progress,
      });
      if (step >= steps) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [result]);

  if (!selected || !result) {
    return (
      <div className="card p-8 text-center text-warm-500 animate-fade-in-up stagger-2">
        <FlaskConical size={40} className="mx-auto mb-3 text-warm-400" />
        <p>请从左侧样本清单选择一个样本查看计算结果</p>
      </div>
    );
  }

  const isPositive = result.mutationFrequency >= params.mutationFrequencyThreshold;

  return (
    <div className="card p-5 animate-fade-in-up stagger-2">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-warm-900">突变计算结果</h3>
          <p className="text-sm text-warm-500 mt-0.5 font-mono">{selected.barcode}</p>
        </div>
        <span
          className={`badge ${
            selected.conclusion === '阳性'
              ? 'badge-danger'
              : selected.conclusion === '阴性'
              ? 'badge-success'
              : 'badge-warning'
          } gap-1 text-sm px-3 py-1`}
        >
          {selected.conclusion === '阳性' && <AlertTriangle size={14} />}
          {selected.conclusion === '阴性' && <Check size={14} />}
          {selected.conclusion === '不确定' && <Info size={14} />}
          结论：{selected.conclusion}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-warm-50 rounded-lg p-4 border border-warm-200/60">
          <p className="text-xs text-warm-500 mb-1">突变频率 (MF)</p>
          <p className="font-mono text-2xl font-semibold text-warm-900">
            {formatNumber(animatedValue.mf)}
            <span className="text-sm font-normal text-warm-500 ml-1">%</span>
          </p>
          <p
            className={`text-xs mt-1 ${
              isPositive ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            阈值 {params.mutationFrequencyThreshold}%
          </p>
        </div>
        <div className="bg-warm-50 rounded-lg p-4 border border-warm-200/60">
          <p className="text-xs text-warm-500 mb-1">等位基因频率 (AF)</p>
          <p className="font-mono text-2xl font-semibold text-warm-900">
            {formatNumber(animatedValue.af)}
            <span className="text-sm font-normal text-warm-500 ml-1">%</span>
          </p>
          <p className="text-xs mt-1 text-warm-500">二倍体校正值</p>
        </div>
        <div className="bg-warm-50 rounded-lg p-4 border border-warm-200/60">
          <p className="text-xs text-warm-500 mb-1">覆盖深度 (CD)</p>
          <p className="font-mono text-2xl font-semibold text-warm-900">
            {formatNumber(animatedValue.cd)}
            <span className="text-sm font-normal text-warm-500 ml-1">×</span>
          </p>
          <p
            className={`text-xs mt-1 ${
              result.coverageDepth >= params.minCoverageDepth
                ? 'text-emerald-600'
                : 'text-amber-600'
            }`}
          >
            建议 ≥ {params.minCoverageDepth}×
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
        <div>
          <p className="text-xs text-warm-500">总读段数</p>
          <p className="font-mono text-warm-900">
            {isNaN(selected.totalReads) ? '—' : selected.totalReads.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-warm-500">突变读段数</p>
          <p className="font-mono text-warm-900">{selected.mutantReads.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-warm-500">质量分值 Q</p>
          <p className="font-mono text-warm-900">{formatNumber(selected.qualityScore, 1)}</p>
        </div>
        <div>
          <p className="text-xs text-warm-500">质控状态</p>
          <p
            className={`font-medium ${
              result.isPass ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {result.isPass ? '通过' : '未通过'}
          </p>
        </div>
      </div>

      {result.failureReason && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-rose-800">失败原因</p>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
              {result.failureReason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
