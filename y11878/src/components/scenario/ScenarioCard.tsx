import { Trash2, Download, Play } from 'lucide-react';
import { useNetworkStore } from '@/store/useNetworkStore';
import { compareScenarios } from '@/utils/compare';
import type { Scenario } from '@/types';

interface ScenarioCardProps {
  scenario: Scenario;
  baseScenario?: Scenario;
  onDelete: () => void;
  onLoad: () => void;
}

export default function ScenarioCard({
  scenario,
  baseScenario,
  onDelete,
  onLoad,
}: ScenarioCardProps) {
  const { exportData } = useNetworkStore();

  const comparison = baseScenario
    ? compareScenarios(baseScenario, scenario)
    : null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-mono text-sm text-white">{scenario.name}</h4>
          <p className="text-xs text-base-500 mt-0.5">{formatDate(scenario.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onLoad}
            className="p-1.5 hover:bg-accent-cyan/20 border border-accent-cyan/30"
            title="加载此方案"
          >
            <Play className="w-3 h-3 text-accent-cyan" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-accent-red/20 border border-accent-red/30"
            title="删除"
          >
            <Trash2 className="w-3 h-3 text-accent-red" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-base-500 mb-1">最大流</div>
          <div className="font-mono text-lg text-white">
            {scenario.result.maxFlow}
            {comparison && (
              <span
                className={`text-xs ml-1 ${
                  comparison.flowDiff > 0
                    ? 'text-accent-cyan'
                    : comparison.flowDiff < 0
                    ? 'text-accent-red'
                    : 'text-base-500'
                }`}
              >
                {comparison.flowDiff > 0 ? '+' : ''}
                {comparison.flowDiff} ({comparison.flowDiffPercent.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-base-500 mb-1">瓶颈数</div>
          <div className="font-mono text-lg text-white">
            {scenario.result.bottleneckRoutes.length}
            {comparison && (
              <span
                className={`text-xs ml-1 ${
                  comparison.resolvedBottlenecks.length > 0
                    ? 'text-accent-cyan'
                    : comparison.newBottlenecks.length > 0
                    ? 'text-accent-red'
                    : 'text-base-500'
                }`}
              >
                {comparison.resolvedBottlenecks.length > 0
                  ? `-${comparison.resolvedBottlenecks.length}`
                  : comparison.newBottlenecks.length > 0
                  ? `+${comparison.newBottlenecks.length}`
                  : '±0'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-base-500 mb-1">整体利用率</div>
        <div className="flex items-center gap-2">
          <div className="progress-bar-bg flex-1">
            <div
              className="progress-bar-fill bg-accent-cyan"
              style={{
                width: `${Math.min(100, scenario.result.utilizationRate * 100)}%`,
              }}
            />
          </div>
          <span className="font-mono text-xs text-white">
            {(scenario.result.utilizationRate * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {comparison &&
        (comparison.newBottlenecks.length > 0 ||
          comparison.resolvedBottlenecks.length > 0) && (
          <div className="pt-3 border-t border-base-700 space-y-2">
            {comparison.resolvedBottlenecks.length > 0 && (
              <div className="text-xs">
                <span className="text-accent-cyan">解决瓶颈: </span>
                <span className="font-mono text-white">
                  {comparison.resolvedBottlenecks.join(', ')}
                </span>
              </div>
            )}
            {comparison.newBottlenecks.length > 0 && (
              <div className="text-xs">
                <span className="text-accent-red">新增瓶颈: </span>
                <span className="font-mono text-white">
                  {comparison.newBottlenecks.join(', ')}
                </span>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
