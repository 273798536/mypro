import { useMemo } from 'react';
import useAppStore from '@/store/useAppStore';
import ConfidenceCards from '@/components/dashboard/ConfidenceCards';
import StatusPieChart from '@/components/charts/StatusPieChart';
import SafetyStatusTable from '@/components/dashboard/SafetyStatusTable';
import { Users, Hash, Ruler, CheckCircle2, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { currentSamples, safetyRules, confidenceInterval, correctionLogs } = useAppStore();

  const statusCounts = useMemo(() => ({
    direct_use: currentSamples.filter(s => s.reviewStatus === 'direct_use').length,
    need_review: currentSamples.filter(s => s.reviewStatus === 'need_review').length,
    rejected: currentSamples.filter(s => s.reviewStatus === 'rejected').length,
    pending: currentSamples.filter(s => s.reviewStatus === 'pending').length,
  }), [currentSamples]);

  const keyMetrics = useMemo(() => {
    const totalSamples = currentSamples.length;
    const mean = confidenceInterval.mean;
    const ciWidth = confidenceInterval.upper - confidenceInterval.lower;
    const correctedCount = currentSamples.filter(
      (s) => s.isCorrected || s.humanCorrectedScore !== undefined
    ).length;
    const correctionRate = totalSamples > 0 ? (correctedCount / totalSamples) * 100 : 0;

    return {
      totalSamples,
      mean,
      ciWidth,
      correctionRate,
      correctedCount,
    };
  }, [currentSamples, confidenceInterval]);

  const metricCards = [
    {
      label: '样本总数',
      value: keyMetrics.totalSamples.toString(),
      unit: '条',
      icon: Hash,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30',
      sub: `${correctionLogs.length} 条修正记录`,
    },
    {
      label: '均值分数',
      value: keyMetrics.mean.toFixed(2),
      unit: '分',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      sub: `95% CI [${confidenceInterval.lower.toFixed(2)}, ${confidenceInterval.upper.toFixed(2)}]`,
    },
    {
      label: 'CI 宽度',
      value: keyMetrics.ciWidth.toFixed(3),
      unit: '分',
      icon: Ruler,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      sub: '越小越稳定',
    },
    {
      label: '人工修正率',
      value: keyMetrics.correctionRate.toFixed(1),
      unit: '%',
      icon: CheckCircle2,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/30',
      sub: `${keyMetrics.correctedCount}/${keyMetrics.totalSamples} 条`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-sky-300 via-sky-400 to-emerald-300 bg-clip-text text-transparent">
            评测分数置信区间
          </h1>
          <p className="text-lg text-slate-400">
            模型版本复盘中心 · 全方位掌握模型评测的置信度与稳定性
          </p>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 rounded-full bg-sky-500" />
            <h2 className="text-xl font-semibold text-slate-100">四象限分布矩阵</h2>
            <span className="text-xs text-slate-500">按分数高低 × 置信度高低划分</span>
          </div>
          <ConfidenceCards />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h3 className="text-lg font-semibold text-slate-100">状态分布占比</h3>
            </div>
            <StatusPieChart counts={statusCounts} />
          </div>

          <div className="lg:col-span-2 rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-sky-500" />
              <h3 className="text-lg font-semibold text-slate-100">关键指标总览</h3>
              <div className="flex items-center gap-1 ml-auto text-xs text-slate-500">
                <Users size={14} />
                统计基于当前版本样本
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {metricCards.map((m) => (
                <div
                  key={m.label}
                  className={`relative rounded-xl border p-4 backdrop-blur-sm transition-all hover:scale-[1.02] ${m.bg} ${m.border}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${m.bg}`}>
                        <m.icon size={16} className={m.color} />
                      </div>
                      <span className="text-sm text-slate-400">{m.label}</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold font-mono ${m.color}`}>
                      {m.value}
                    </span>
                    <span className="text-sm text-slate-500">{m.unit}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 rounded-full bg-violet-500" />
              <h2 className="text-xl font-semibold text-slate-100">安全规则状态校验</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                PASS {safetyRules.filter((r) => r.pageStatus).length}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                FAIL {safetyRules.filter((r) => r.pageStatus === false).length}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/30 ring-offset-1 ring-offset-slate-900" />
                不一致 {safetyRules.filter((r) => r.isConsistent === false).length}
              </div>
            </div>
          </div>
          <SafetyStatusTable />
        </section>
      </div>
    </div>
  );
}
