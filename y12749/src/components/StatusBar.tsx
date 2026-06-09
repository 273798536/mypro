import { useBatchStore } from '@/store/useBatchStore';
import { AlertTriangle, CheckCircle2, Clock, Layers } from 'lucide-react';

export default function StatusBar() {
  const { batch } = useBatchStore();
  const dupCount = batch.problems.filter((p) => p.isDuplicate).length;
  const anomalyCount = batch.anomalies.filter((a) => !a.resolved).length;
  const needMaterial = batch.anomalies.filter((a) => a.category === 'need_material' && !a.resolved).length;
  const needCriteria = batch.anomalies.filter((a) => a.category === 'need_criteria' && !a.resolved).length;

  const statusMeta: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: '草稿', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock },
    processing: { label: '处理中', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Layers },
    chart_pending: { label: '待图表', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: AlertTriangle },
    completed: { label: '已完成', color: 'bg-teal-50 text-teal-600 border-teal-200', icon: CheckCircle2 },
  };
  const meta = statusMeta[batch.status] || statusMeta.draft;
  const Icon = meta.icon;

  return (
    <div className="no-print bg-white border-b border-navy-100 px-8 py-2.5 flex items-center justify-between animate-slide-down">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-navy-500 font-medium">批次</span>
        <code className="px-2 py-0.5 rounded bg-navy-50 text-navy-700 border border-navy-200 text-xs font-mono">
          {batch.batchId}
        </code>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${meta.color}`}>
          <Icon size={12} />
          {meta.label}
        </span>
        <span className="text-navy-400">
          题目 <b className="text-navy-700">{batch.problems.length}</b> · 评分{' '}
          <b className="text-navy-700">{batch.scores.length}</b> · 重复{' '}
          <b className={dupCount ? 'text-red-600' : 'text-navy-700'}>{dupCount}</b>
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {anomalyCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle size={14} className={anomalyCount > 3 ? 'text-red-500 animate-pulse-soft' : 'text-amber-500'} />
            <span className="text-navy-500">异常</span>
            <span className="font-semibold text-navy-700">{anomalyCount}</span>
            <span className="text-xs text-navy-400">
              （补材料 {needMaterial} · 改口径 {needCriteria}）
            </span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${batch.chartsMissing.length === 0 ? 'bg-teal-500' : 'bg-amber-500 animate-pulse-soft'}`} />
          <span className="text-navy-500 text-xs">
            图表 {batch.chartsAvailable.length}/
            {batch.chartsAvailable.length + batch.chartsMissing.length} 到齐
          </span>
        </span>
      </div>
    </div>
  );
}
