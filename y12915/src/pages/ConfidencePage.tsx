import { useState, useMemo } from 'react';
import useAppStore from '@/store/useAppStore';
import DistributionHistogram from '@/components/charts/DistributionHistogram';
import VersionCompareLine from '@/components/charts/VersionCompareLine';
import ConfidenceErrorBar from '@/components/charts/ConfidenceErrorBar';
import { compareBeforeAfterCorrection, calculateConfidenceInterval, buildHistogram } from '@/utils/confidence';
import { cn } from '@/lib/utils';
import { BarChart3, GitCompare, ArrowRight, Sparkles, Target, Sigma, Layers } from 'lucide-react';
import type { GroupedCI } from '@/types';

type TabId = 'distribution' | 'correction' | 'gray';

const TABS: Array<{ id: TabId; label: string; icon: typeof BarChart3; desc: string }> = [
  { id: 'distribution', label: '分数分布', icon: BarChart3, desc: '查看当前版本样本的分数分布与置信区间' },
  { id: 'correction', label: '修正对比', icon: GitCompare, desc: '人工修正前后置信区间变化对比' },
  { id: 'gray', label: '灰度对比', icon: Sparkles, desc: '多版本并排对比，分析迭代效果' },
];

export default function ConfidencePage() {
  const { currentSamples, versions, samples, confidenceInterval } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabId>('distribution');

  const versionGroups = useMemo<GroupedCI[]>(() => {
    return versions.map(v => {
      const vSamples = samples.filter(s => s.modelVersionId === v.id);
      const scores = vSamples.map(s => s.humanCorrectedScore ?? s.modelScore);
      const ci = calculateConfidenceInterval(scores);
      return { group: v.version, ci, histogram: buildHistogram(scores) };
    });
  }, [versions, samples]);

  const currentScores = useMemo(
    () => currentSamples.map((s) => s.humanCorrectedScore ?? s.modelScore),
    [currentSamples]
  );

  const beforeAfter = useMemo(() => compareBeforeAfterCorrection(currentSamples), [currentSamples]);

  const beforeScores = useMemo(
    () => currentSamples.map((s) => s.beforeScore ?? s.modelScore),
    [currentSamples]
  );
  const afterScores = useMemo(
    () => currentSamples.map((s) => s.afterScore ?? s.humanCorrectedScore ?? s.modelScore),
    [currentSamples]
  );

  const ciNarrowImprovement = useMemo(() => {
    const beforeWidth = beforeAfter.before.upper - beforeAfter.before.lower;
    const afterWidth = beforeAfter.after.upper - beforeAfter.after.lower;
    const improvement = beforeWidth > 0 ? ((beforeWidth - afterWidth) / beforeWidth) * 100 : 0;
    return { beforeWidth, afterWidth, improvement };
  }, [beforeAfter]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-sky-300 via-sky-400 to-cyan-300 bg-clip-text text-transparent">
            置信区间分析
          </h1>
          <p className="text-lg text-slate-400">
            深入分析评测分数的分布特征、修正影响与版本迭代差异
          </p>
        </div>

        <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-800/60 border border-slate-700 w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeTab === t.id
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              )}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="text-sm text-slate-500 pl-2 -mt-2">
          {TABS.find((t) => t.id === activeTab)?.desc}
        </div>

        {activeTab === 'distribution' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-6 rounded-full bg-sky-500" />
                <h2 className="text-xl font-semibold text-slate-100">整体分数分布</h2>
                <span className="text-xs text-slate-500 ml-auto font-mono">
                  N = {confidenceInterval.n}
                </span>
              </div>
              <DistributionHistogram
                scores={currentScores}
                ci={confidenceInterval}
                height={400}
                barColor="#0ea5e9"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 backdrop-blur-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="text-sky-400" />
                  <span className="text-sm text-slate-400">均值 ± 95% CI</span>
                </div>
                <div className="text-3xl font-bold font-mono text-sky-300">
                  {confidenceInterval.mean.toFixed(2)}
                </div>
                <div className="text-sm font-mono text-slate-400 mt-1">
                  [{confidenceInterval.lower.toFixed(2)}, {confidenceInterval.upper.toFixed(2)}]
                </div>
                <div className="text-xs text-slate-500 mt-2">误差半宽 {(confidenceInterval.upper - confidenceInterval.mean).toFixed(3)}</div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sigma size={16} className="text-amber-400" />
                  <span className="text-sm text-slate-400">标准差 σ</span>
                </div>
                <div className="text-3xl font-bold font-mono text-amber-300">
                  {confidenceInterval.std.toFixed(3)}
                </div>
                <div className="text-sm text-slate-400 mt-1">离散程度</div>
                <div className="text-xs text-slate-500 mt-2">
                  CV = {confidenceInterval.mean > 0 ? ((confidenceInterval.std / confidenceInterval.mean) * 100).toFixed(2) : '0'}%
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={16} className="text-emerald-400" />
                  <span className="text-sm text-slate-400">样本数量</span>
                </div>
                <div className="text-3xl font-bold font-mono text-emerald-300">
                  {confidenceInterval.n}
                </div>
                <div className="text-sm text-slate-400 mt-1">有效样本</div>
                <div className="text-xs text-slate-500 mt-2">
                  ≥30 {confidenceInterval.n >= 30 ? '✓ 统计可靠' : '⚠ 需扩充样本'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'correction' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-6 rounded-full bg-amber-500" />
                <h2 className="text-xl font-semibold text-slate-100">人工修正前后对比</h2>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 ml-2">
                  {beforeAfter.changedCount} 条已修正
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-start">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-sm font-semibold text-rose-300">修正前</span>
                  </div>
                  <DistributionHistogram
                    scores={beforeScores}
                    ci={beforeAfter.before}
                    height={320}
                    barColor="#f43f5e"
                    showCI
                    title={`均值 ${beforeAfter.before.mean.toFixed(2)}`}
                  />
                </div>

                <div className="flex flex-col items-center justify-center pt-16 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
                    <ArrowRight size={28} className="text-white" />
                  </div>
                  <div className="w-40 space-y-2 text-center">
                    <div className="rounded-lg bg-slate-700/60 border border-slate-600 p-3">
                      <div className="text-xs text-slate-500">变化条数</div>
                      <div className="text-xl font-bold font-mono text-slate-100">
                        {beforeAfter.changedCount}
                        <span className="text-sm text-slate-500 ml-0.5">条</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
                      <div className="text-xs text-emerald-400/80">均值变化</div>
                      <div className={cn(
                        'text-xl font-bold font-mono',
                        beforeAfter.after.mean - beforeAfter.before.mean >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      )}>
                        {beforeAfter.after.mean - beforeAfter.before.mean >= 0 ? '+' : ''}
                        {(beforeAfter.after.mean - beforeAfter.before.mean).toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-sky-500/10 border border-sky-500/30 p-3">
                      <div className="text-xs text-sky-400/80">CI 半宽变化</div>
                      <div className={cn(
                        'text-xl font-bold font-mono',
                        (beforeAfter.before.upper - beforeAfter.before.mean) - (beforeAfter.after.upper - beforeAfter.after.mean) >= 0
                          ? 'text-sky-400'
                          : 'text-amber-400'
                      )}>
                        {((beforeAfter.before.upper - beforeAfter.before.mean) - (beforeAfter.after.upper - beforeAfter.after.mean)) >= 0 ? '-' : '+'}
                        {Math.abs(
                          (beforeAfter.before.upper - beforeAfter.before.mean) - (beforeAfter.after.upper - beforeAfter.after.mean)
                        ).toFixed(3)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-300">修正后</span>
                  </div>
                  <DistributionHistogram
                    scores={afterScores}
                    ci={beforeAfter.after}
                    height={320}
                    barColor="#10b981"
                    showCI
                    title={`均值 ${beforeAfter.after.mean.toFixed(2)}`}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-800/80 to-sky-500/10 backdrop-blur-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">修正效果总结</h3>
                  <p className="text-slate-300 leading-relaxed">
                    人工修正后，置信区间从{' '}
                    <span className="font-mono text-rose-400">
                      [{beforeAfter.before.lower.toFixed(2)}, {beforeAfter.before.upper.toFixed(2)}]
                    </span>
                    {' '}收窄到{' '}
                    <span className="font-mono text-emerald-400">
                      [{beforeAfter.after.lower.toFixed(2)}, {beforeAfter.after.upper.toFixed(2)}]
                    </span>
                    {' '}，CI宽度收窄{' '}
                    <span className="font-mono font-bold text-sky-300">
                      {ciNarrowImprovement.improvement.toFixed(1)}%
                    </span>
                    ，评测结果的统计稳定性显著提升。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gray' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-6 rounded-full bg-violet-500" />
                <h2 className="text-xl font-semibold text-slate-100">多版本 CI 折线对比</h2>
              </div>
              <VersionCompareLine groups={versionGroups} />
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-6 rounded-full bg-sky-500" />
                <h2 className="text-xl font-semibold text-slate-100">误差棒柱状对比</h2>
              </div>
              <ConfidenceErrorBar groups={versionGroups} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
