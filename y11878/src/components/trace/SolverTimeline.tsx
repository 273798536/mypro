import { useMemo } from 'react';
import { GitBranch, ArrowRight } from 'lucide-react';
import { useNetworkStore } from '@/store/useNetworkStore';
import type { SolverStep } from '@/types';

interface SolverTimelineProps {
  routeId?: string;
}

export default function SolverTimeline({ routeId }: SolverTimelineProps) {
  const { analysisResult, nodes, routes } = useNetworkStore();

  const relevantSteps = useMemo(() => {
    if (!analysisResult) return [];
    if (!routeId) return analysisResult.solverSteps;
    return analysisResult.solverSteps.filter(
      (step) =>
        step.bottleneckRouteId === routeId ||
        step.augmentingPath.some((nodeId) => {
          const idx = step.augmentingPath.indexOf(nodeId);
          if (idx < step.augmentingPath.length - 1) {
            const nextNode = step.augmentingPath[idx + 1];
            return routes?.some(
              (r) => r.from === nodeId && r.to === nextNode && r.id === routeId
            );
          }
          return false;
        })
    );
  }, [analysisResult, routeId, routes]);

  const getNodeName = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node ? node.name : nodeId;
  };

  if (!analysisResult) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <p className="text-base-500 text-sm">加载数据后显示求解过程</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-4 h-4 text-accent-cyan" />
        <h3 className="text-sm font-medium text-white">最大流求解过程</h3>
        <span className="text-xs text-base-500">
          {routeId
            ? `筛选: 共 ${relevantSteps.length} 步涉及该线路`
            : `共 ${analysisResult.solverSteps.length} 步`}
        </span>
      </div>

      <div className="space-y-0 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
        {analysisResult.solverSteps.map((step, idx) => {
          const isRelevant =
            !routeId || relevantSteps.some((s) => s.step === step.step);
          return (
            <div
              key={step.step}
              className={`relative pl-8 pb-6 ${idx === analysisResult.solverSteps.length - 1 ? 'pb-0' : ''} ${!isRelevant ? 'opacity-40' : ''}`}
            >
              <div
                className={`absolute left-3 top-1 w-3 h-3 rounded-full border-2 ${
                  step.bottleneckRouteId === routeId
                    ? 'bg-accent-red border-accent-red'
                    : isRelevant
                    ? 'bg-accent-cyan border-accent-cyan'
                    : 'bg-base-700 border-base-600'
                }`}
              />
              {idx < analysisResult.solverSteps.length - 1 && (
                <div className="absolute left-[17px] top-4 w-px h-full bg-base-700" />
              )}

              <div
                className={`p-3 border ${
                  step.bottleneckRouteId === routeId
                    ? 'border-accent-red/50 bg-accent-red/5'
                    : 'border-base-700 bg-base-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-base-500">
                    第 {step.step} 步
                  </span>
                  <span className="text-xs font-mono text-accent-cyan">
                    +{step.flowAdded} 单位
                  </span>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  {step.augmentingPath.map((nodeId, nodeIdx) => (
                    <div key={nodeId} className="flex items-center gap-1">
                      <span
                        className={`font-mono text-xs ${
                          step.bottleneckRouteId === routeId ? 'text-accent-orange' : 'text-white'
                        }`}
                      >
                        {getNodeName(nodeId)}
                      </span>
                      {nodeIdx < step.augmentingPath.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-base-600" />
                      )}
                    </div>
                  ))}
                </div>

                {step.bottleneckRouteId && (
                  <div className="text-xs text-base-500">
                  <span className="text-accent-amber">瓶颈: </span>
                    <span className="font-mono">{step.bottleneckRouteId}</span>
                    <span className="text-base-600"> 决定了该步最大增广流量</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-base-700 text-xs text-base-500 space-y-1">
        <p className="font-mono text-white">最大流: {analysisResult.maxFlow} 单位</p>
        <p>
          <span className="text-accent-cyan">青色</span> 正常步骤 ·{' '}
          <span className="text-accent-red">红色</span> 包含所选线路
        </p>
      </div>
    </div>
  );
}
