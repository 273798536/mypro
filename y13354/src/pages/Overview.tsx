import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Bug, Download, TrendingDown } from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import { useGatekeeperStore } from '@/store/gatekeeper';
import { cn } from '@/lib/utils';
import { getTopNegativeSamples } from '@/utils/metrics';
import { Link } from 'react-router-dom';

export default function Overview() {
  const { currentSnapshot, metricResults, overallPassed, hasOverride, init, openOverrideModal } =
    useGatekeeperStore();

  useEffect(() => {
    if (!currentSnapshot) init();
  }, [currentSnapshot, init]);

  if (!currentSnapshot) return null;

  const contaminatedCount = currentSnapshot.samples.filter((s) => s.isContaminated).length;
  const topNegatives = getTopNegativeSamples(currentSnapshot.samples ?? [], 3);
  const hitCount = currentSnapshot.samples.filter((s) => s.isHit).length;
  const totalCount = currentSnapshot.samples.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">守门总览</h1>
          <p className="mt-1 text-[12px] text-slate-400">
            快照：{currentSnapshot.name} · {currentSnapshot.version}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/samples"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-[12px] font-medium text-slate-300 transition hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            查看明细
          </Link>
          <button
            onClick={() => openOverrideModal('overall')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-blue-500 shadow-lg shadow-blue-500/20"
          >
            <Bug className="h-4 w-4" />
            人工改判
          </button>
        </div>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border p-6',
          overallPassed
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900'
            : 'border-rose-500/40 bg-gradient-to-br from-rose-500/10 via-slate-900 to-slate-900'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-2xl',
                overallPassed ? 'bg-emerald-500/20' : 'bg-rose-500/20'
              )}
            >
              {overallPassed ? (
                <CheckCircle2 className="h-9 w-9 text-emerald-400" />
              ) : (
                <XCircle className="h-9 w-9 text-rose-400" />
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">最终结论</p>
              <h2
                className={cn(
                  'mt-1 text-3xl font-bold',
                  overallPassed ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                {overallPassed ? '通过上线' : '暂缓上线'}
              </h2>
              {hasOverride && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-blue-400">
                  <Bug className="h-3.5 w-3.5" />
                  含 {currentSnapshot.overrides.length} 条人工改判
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">命中</p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">
                {hitCount}/{totalCount}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">命中率</p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">
                {totalCount > 0 ? ((hitCount / totalCount) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">污染样本</p>
              <p
                className={cn(
                  'mt-1 font-mono text-2xl font-bold',
                  contaminatedCount > 0 ? 'text-amber-400' : 'text-white'
                )}
              >
                {contaminatedCount}
              </p>
            </div>
          </div>
        </div>

        {contaminatedCount > 0 && (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <div className="text-[12px] text-amber-200">
              <p className="font-medium text-amber-400">
                发现 {contaminatedCount} 条疑似验证集污染样本
              </p>
              <p className="mt-0.5 text-[11px] text-amber-200/70">
                已关联特征快照备注可追溯原始说法，前往
                <span className="font-medium">样本明细</span>页面查看详情
              </p>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-white">守门指标</h3>
          <p className="text-[11px] text-slate-500">点击卡片展开公式、分子分母与阈值调整</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {metricResults.map((m) => (
            <MetricCard key={m.key} metric={m} />
          ))}
        </div>
      </div>

      {topNegatives.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="inline-flex items-center gap-2 text-[14px] font-semibold text-white">
              <TrendingDown className="h-4 w-4 text-rose-400" />
              拉低指标的 Top 异常样本
            </h3>
            <Link to="/samples" className="text-[11px] text-blue-400 hover:text-blue-300 transition">
              查看全部 →
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
            {topNegatives.map((s) => (
              <Link
                key={s.id}
                to="/samples"
                className="flex items-center gap-4 border-b border-slate-700/50 px-4 py-3 last:border-b-0 transition hover:bg-slate-800/70"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20">
                  <TrendingDown className="h-4 w-4 text-rose-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-white">{s.query}</p>
                  <p className="text-[11px] text-slate-500">
                    ID: {s.id} · Ground Truth: {s.groundTruth}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[11px] text-rose-400">
                    {s.contributionToMetric.toFixed(3)}
                  </p>
                  <p className="text-[10px] text-slate-500">贡献值</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
