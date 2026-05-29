import { useEffect } from 'react';
import { useNetworkStore } from '@/store/useNetworkStore';
import StatsCard from '@/components/dashboard/StatsCard';
import PendingArea from '@/components/dashboard/PendingArea';
import TopologyGraph from '@/components/dashboard/TopologyGraph';
import RouteTable from '@/components/dashboard/RouteTable';

export default function Dashboard() {
  const { analysisResult, nodes, routes, loadSampleData } = useNetworkStore();

  useEffect(() => {
    if (nodes.length === 0) {
      loadSampleData();
    }
  }, [nodes.length, loadSampleData]);

  return (
    <div className="p-6 flex-1 overflow-auto scrollbar-thin">
      <PendingArea />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard
          label="最大流"
          value={analysisResult?.maxFlow || 0}
          suffix=" 单位"
          trend="up"
          trendValue="+12.5%"
        />
        <StatsCard
          label="总容量"
          value={analysisResult?.totalCapacity || 0}
          suffix=" 单位"
          trend="neutral"
          trendValue="基线"
        />
        <StatsCard
          label="整体利用率"
          value={Math.round((analysisResult?.utilizationRate || 0) * 100)}
          suffix="%"
          trend="down"
          trendValue="-3.2%"
        />
        <StatsCard
          label="瓶颈线路"
          value={analysisResult?.bottleneckRoutes.length || 0}
          suffix=" 条"
          trend="up"
          trendValue="+2"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <TopologyGraph width={700} height={500} />
        </div>
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-medium text-white mb-3">瓶颈线路 TOP 5</h3>
            <div className="space-y-2">
              {analysisResult?.bottleneckRoutes.slice(0, 5).map((route, idx) => (
                <div
                  key={route.id}
                  className="flex items-center justify-between p-2 bg-base-900/50 border border-base-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-base-500 font-mono w-5">{idx + 1}</span>
                    <span className="font-mono text-sm text-white">{route.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="progress-bar-bg w-16">
                      <div
                        className="progress-bar-fill bg-accent-red"
                        style={{ width: `${Math.min(100, route.utilization * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-accent-red">
                      {(route.utilization * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
              {(!analysisResult || analysisResult.bottleneckRoutes.length === 0) && (
                <p className="text-sm text-base-500 text-center py-4">暂无瓶颈线路</p>
              )}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-medium text-white mb-3">需求点满足率</h3>
            <div className="space-y-3">
              {nodes
                .filter((n) => n.type === 'demand')
                .map((node) => {
                  const inflow = routes
                    ?.filter((r) => r.to === node.id)
                    .reduce((sum, r) => sum + r.flow, 0);
                  const demand = node.demand || 0;
                  const rate = demand > 0 ? (inflow || 0) / demand : 0;
                  return (
                    <div key={node.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-base-500">{node.name}</span>
                        <span className="font-mono text-white">
                          {inflow || 0}/{demand}
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className={`progress-bar-fill ${rate >= 0.9 ? 'bg-accent-cyan' : rate >= 0.5 ? 'bg-accent-amber' : 'bg-accent-red'}`}
                          style={{ width: `${Math.min(100, rate * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-medium text-white mb-3">求解信息</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-base-500">算法</span>
                <span className="font-mono text-white">Edmonds-Karp</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-500">迭代次数</span>
                <span className="font-mono text-white">{analysisResult?.solverSteps.length || 0} 步</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-500">节点数</span>
                <span className="font-mono text-white">{nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-500">线路数</span>
                <span className="font-mono text-white">{routes.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RouteTable />
    </div>
  );
}
