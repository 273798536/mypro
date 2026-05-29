import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, LineChart, GitBranch } from 'lucide-react';
import { useNetworkStore } from '@/store/useNetworkStore';
import SolverTimeline from '@/components/trace/SolverTimeline';
import ConstraintAnalysis from '@/components/trace/ConstraintAnalysis';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Trace() {
  const query = useQuery();
  const navigate = useNavigate();
  const queryRouteId = query.get('routeId');
  const { routes, selectedRouteId, setSelectedRouteId, loadSampleData, nodes, analysisResult } = useNetworkStore();
  const [localRouteId, setLocalRouteId] = useState<string | undefined>(queryRouteId || selectedRouteId || undefined);

  useEffect(() => {
    if (nodes.length === 0) {
      loadSampleData();
    }
  }, [nodes.length, loadSampleData]);

  useEffect(() => {
    if (queryRouteId) {
      setLocalRouteId(queryRouteId);
      setSelectedRouteId(queryRouteId);
    }
  }, [queryRouteId, setSelectedRouteId]);

  const handleRouteChange = (routeId: string) => {
    setLocalRouteId(routeId);
    setSelectedRouteId(routeId);
    navigate(`/trace?routeId=${routeId}`, { replace: true });
  };

  const selectedRoute = routes.find((r) => r.id === localRouteId);

  return (
    <div className="p-6 flex-1 overflow-auto scrollbar-thin">
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-base-500 hover:text-white transition-colors mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          返回分析看板
        </button>
        <h1 className="text-xl font-semibold text-white font-mono flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-accent-orange" />
          瓶颈追溯
        </h1>
        <p className="text-sm text-base-500 mt-1">
          从单条线路追溯到最大流求解过程、约束条件和相关节点
        </p>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm text-base-500 whitespace-nowrap">选择线路</label>
          <select
            value={localRouteId || ''}
            onChange={(e) => handleRouteChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-base-900 border border-base-600 text-sm text-white focus:outline-none focus:border-accent-orange font-mono"
          >
            <option value="">-- 选择线路追溯 --</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.id} - {route.from} → {route.to} {route.isBottleneck ? '(瓶颈)' : ''}
              </option>
            ))}
          </select>
          {selectedRoute && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base-500">流量</span>
              <span className="font-mono text-white">
                {selectedRoute.flow} / {selectedRoute.capacity}
              </span>
              <span
                className={`text-xs px-2 py-0.5 ${
                  selectedRoute.isBottleneck
                    ? 'bg-accent-red/10 text-accent-red border border-accent-red/30'
                    : 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
                }`}
              >
                {selectedRoute.isBottleneck ? '瓶颈' : '正常'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SolverTimeline routeId={localRouteId} />
        <ConstraintAnalysis routeId={localRouteId} />
      </div>

      {localRouteId && (
        <div className="mt-6 card p-4">
          <div className="flex items-center gap-2 mb-4">
            <LineChart className="w-4 h-4 text-accent-amber" />
            <h3 className="text-sm font-medium text-white">快速操作</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/scenario?routeId=${localRouteId}`)}
              className="btn-primary flex items-center gap-2"
            >
              <LineChart className="w-4 h-4" />
              进入情景对比，调整该线路容量
            </button>
            {analysisResult && (
              <div className="ml-auto text-xs text-base-500">
                该线路在求解过程中被标记为瓶颈{' '}
                <span className="font-mono text-accent-orange">
                  {
                    analysisResult.solverSteps.filter(
                      (s) => s.bottleneckRouteId === localRouteId
                    ).length
                  }{' '}
                  次
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
