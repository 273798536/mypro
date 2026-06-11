import { BarChart3, AlertTriangle, CheckCircle2, Gauge, Link2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import ImpactChain from '@/components/analysis/ImpactChain';
import SuspendedAlert from '@/components/analysis/SuspendedAlert';
import { impactNodes, impactLinks } from '@/data/scenarios';
import StatusBadge from '@/components/points/StatusBadge';
import { Link } from 'react-router-dom';

export default function AnalysisPage() {
  const { scenarios, points } = useAppStore();
  const scenario = scenarios[0];

  if (!scenario) {
    return <div className="p-8 text-center text-gray-500">暂无方案数据</div>;
  }

  const stats = {
    total: points.length,
    processed: points.filter((p) => p.status === 'processed').length,
    withdrawn: points.filter((p) => p.status === 'withdrawn').length,
    suspended: points.filter((p) => p.status === 'suspended').length,
    pending: points.filter((p) => p.status === 'pending_material').length,
    manual: points.filter((p) => p.status === 'manual_overruled').length,
  };

  const avgSpeed =
    points
      .filter((p) => p.status === 'processed' || p.status === 'manual_overruled')
      .reduce((sum, p) => sum + p.windSpeed, 0) /
    Math.max(1, points.filter((p) => p.status === 'processed' || p.status === 'manual_overruled').length);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-5 space-y-5">
      <div>
        <h2 className="font-serif-cn text-xl font-semibold text-deep-sea flex items-center gap-2">
          <BarChart3 className="w-5 h-5" strokeWidth={1.8} />
          方案分析
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          查看方案结论、撤回记录的影响链路，以及挂起待确认的异常点位组。
        </p>
      </div>

      <div className="bg-white border border-sea-mist-dark rounded-sm shadow-sm p-5">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="flex items-center gap-2">
              <h3 className="font-serif-cn text-lg font-semibold text-deep-sea">
                {scenario.name}
              </h3>
              <span className="font-mono-data text-xs text-gray-400">{scenario.id}</span>
            </div>
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">{scenario.conclusion}</p>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500">已纳入点位</div>
                  <div className="font-mono-data text-lg text-deep-sea">
                    {stats.processed + stats.manual}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">已撤回</div>
                  <div className="font-mono-data text-lg text-withdrawn-gray">
                    {stats.withdrawn}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">挂起待确认</div>
                  <div className="font-mono-data text-lg text-suspended-red">
                    {stats.suspended}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    平均风速（已纳入）
                  </div>
                  <div className="font-mono-data text-lg text-deep-sea">
                    {avgSpeed.toFixed(2)} <span className="text-sm text-gray-400">m/s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-56 bg-sea-mist/60 rounded-sm p-4 text-center">
            <Gauge className="w-8 h-8 text-deep-sea mx-auto mb-2" strokeWidth={1.5} />
            <div className="text-xs text-gray-500">方案可信度</div>
            <div className="mt-1 font-mono-data text-2xl text-deep-sea">
              {(scenario.confidence * 100).toFixed(0)}%
            </div>
            <div className="mt-2 h-2 bg-white rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${scenario.confidence * 100}%`,
                  backgroundColor:
                    scenario.confidence >= 0.8
                      ? '#27AE60'
                      : scenario.confidence >= 0.6
                      ? '#F39C12'
                      : '#C0392B',
                }}
              />
            </div>
            <div className="text-[11px] text-gray-500 mt-2">
              受撤回与挂起影响，可信度偏低
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-sea-mist-dark rounded-sm shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-withdrawn-gray" strokeWidth={1.8} />
          <h3 className="font-serif-cn text-base font-semibold text-deep-sea">
            撤回记录对结论的影响链路
          </h3>
        </div>

        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-sm text-sm text-gray-700 leading-relaxed">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-alert-orange flex-shrink-0 mt-0.5" strokeWidth={1.8} />
            <div>
              <strong className="text-gray-800">关键说明：</strong>
              {scenario.withdrawalImpact}
            </div>
          </div>
        </div>

        <ImpactChain nodes={impactNodes} links={impactLinks} />

        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2">涉及撤回的点位：</div>
          <div className="flex flex-wrap gap-2">
            {scenario.withdrawnPoints.map((pid) => {
              const p = points.find((x) => x.id === pid);
              if (!p) return null;
              return (
                <Link
                  key={pid}
                  to={`/point/${pid}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-sm hover:bg-gray-100 transition-colors"
                >
                  <span className="font-mono-data text-deep-sea">{pid}</span>
                  <StatusBadge status={p.status} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white border border-sea-mist-dark rounded-sm shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-suspended-red" strokeWidth={1.8} />
          <h3 className="font-serif-cn text-base font-semibold text-deep-sea">
            挂起风险提示
          </h3>
          <span className="text-xs text-gray-500">
            （以下点位未纳入方案结论，宁可挂起等待确认，也不输出假稳定结论）
          </span>
        </div>
        <SuspendedAlert groups={scenario.suspendedPointGroups} />

        {stats.pending > 0 && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-sm">
            <div className="text-sm text-alert-orange font-medium">
              另有 {stats.pending} 个点位待补材料
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {points
                .filter((p) => p.status === 'pending_material')
                .map((p) => (
                  <Link
                    key={p.id}
                    to={`/point/${p.id}`}
                    className="inline-flex items-center gap-2 px-2 py-1 bg-white border border-orange-200 text-alert-orange rounded-sm font-mono-data text-xs hover:bg-alert-orange hover:text-white transition-colors"
                  >
                    {p.id}
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-sea-mist-dark rounded-sm shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-processed-green" strokeWidth={1.8} />
          <h3 className="font-serif-cn text-base font-semibold text-deep-sea">
            人工改判记录
          </h3>
        </div>
        <div className="space-y-2">
          {points
            .filter((p) => p.status === 'manual_overruled')
            .map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between gap-3 p-3 bg-purple-50 border border-purple-100 rounded-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/point/${p.id}`}
                      className="font-mono-data font-semibold text-manual-purple hover:underline"
                    >
                      {p.id}
                    </Link>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{p.note}</p>
                </div>
                <div className="text-xs text-gray-500 text-right flex-shrink-0">
                  <div>上报人: {p.reporter}</div>
                  <div className="font-mono-data">{p.updatedAt}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
