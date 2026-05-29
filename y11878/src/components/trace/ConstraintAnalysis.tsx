import { useMemo } from 'react';
import { Link2, ArrowUp, ArrowDown, GitBranch } from 'lucide-react';
import { useNetworkStore } from '@/store/useNetworkStore';
import { analyzeConstraints } from '@/utils/bottleneck';

interface ConstraintAnalysisProps {
  routeId?: string;
}

export default function ConstraintAnalysis({ routeId }: ConstraintAnalysisProps) {
  const { nodes, routes, analysisResult } = useNetworkStore();

  const route = useMemo(
    () => routes.find((r) => r.id === routeId),
    [routes, routeId]
  );

  const constraints = useMemo(() => {
    if (!routeId || !analysisResult) return [];
    return analyzeConstraints(
      routeId,
      nodes,
      routes,
      analysisResult.routeFlows
    );
  }, [routeId, nodes, routes, analysisResult]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'upstream':
        return <ArrowUp className="w-4 h-4 text-accent-amber" />;
      case 'downstream':
        return <ArrowDown className="w-4 h-4 text-accent-orange" />;
      case 'parallel':
        return <GitBranch className="w-4 h-4 text-accent-cyan" />;
      default:
        return <Link2 className="w-4 h-4 text-base-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'upstream':
        return '上游约束';
      case 'downstream':
        return '下游约束';
      case 'parallel':
        return '并行线路';
      default:
        return '其他约束';
    }
  };

  if (!routeId || !analysisResult) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <p className="text-base-500 text-sm">选择线路查看约束分析</p>
      </div>
    );
  }

  const fromNode = nodes.find((n) => n.id === route.from);
  const toNode = nodes.find((n) => n.id === route.to);
  const flow = analysisResult.routeFlows[routeId] || 0;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-4 h-4 text-accent-orange" />
        <h3 className="text-sm font-medium text-white">约束分析</h3>
      </div>

      <div className="mb-6 p-4 bg-base-900 border border-base-700">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-lg text-white">
            {routeId}</span>
          <span
            className={`text-xs px-2 py-0.5 ${
              route.isBottleneck
                ? 'bg-accent-red/10 text-accent-red border border-accent-red/30'
                : 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
            }`}
          >
            {route.isBottleneck ? '瓶颈线路' : '正常线路'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-base-500 mb-1">起点</div>
            <div className="font-mono text-white">{fromNode?.name || route.from}</div>
          </div>
          <div>
            <div className="text-base-500 mb-1">终点</div>
            <div className="font-mono text-white">{toNode?.name || route.to}</div>
          </div>
          <div>
            <div className="text-base-500 mb-1">流量/容量</div>
            <div className="font-mono text-white">
              {flow} / {route.capacity}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-base-500">利用率</span>
            <span className="font-mono text-white">
              {((flow / (route.capacity || 1)) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className={`progress-bar-fill ${
                route.utilization >= 0.9
                  ? 'bg-accent-red'
                  : route.utilization >= 0.7
                  ? 'bg-accent-amber'
                  : 'bg-accent-cyan'
              }`}
              style={{ width: `${Math.min(100, route.utilization * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mb-3 text-xs text-base-500 mb-2">相关约束</div>

      {constraints.length === 0 ? (
        <div className="text-sm text-base-500 text-center py-8">
          该线路无明显约束条件
        </div>
      ) : (
        <div className="space-y-3">
          {constraints.map((constraint, idx) => (
            <div
              key={idx}
              className="p-3 bg-base-900/50 border border-base-700"
            >
              <div className="flex items-center gap-2 mb-2">
                {getTypeIcon(constraint.type)}
                <span className="text-xs font-medium text-white">
                  {getTypeLabel(constraint.type)}
                </span>
                <span className="ml-auto text-xs font-mono text-accent-amber">
                  影响度: {constraint.impact}%
                </span>
              </div>
              <div className="text-xs text-base-500">
                <span className="text-white font-mono">{constraint.nodeName}</span>{' '}
                {constraint.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
