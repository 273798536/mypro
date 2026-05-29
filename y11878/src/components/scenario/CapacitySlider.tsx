import { useState, useMemo } from 'react';
import { Sliders, RotateCcw, Save } from 'lucide-react';
import { useNetworkStore } from '@/store/useNetworkStore';
import type { Route } from '@/types';

interface CapacitySliderProps {
  routeId?: string;
}

export default function CapacitySlider({ routeId }: CapacitySliderProps) {
  const { routes, updateRouteCapacity, analysisResult, saveScenario, runAnalysis } =
    useNetworkStore();
  const [filter, setFilter] = useState('');
  const [showBottleneckOnly, setShowBottleneckOnly] = useState(false);
  const [scenarioName, setScenarioName] = useState('');

  const filteredRoutes = useMemo(() => {
    let result = [...routes];

    if (showBottleneckOnly) {
      result = result.filter((r) => r.isBottleneck);
    }

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(lowerFilter) ||
          r.from.toLowerCase().includes(lowerFilter) ||
          r.to.toLowerCase().includes(lowerFilter)
      );
    }

    return result.sort((a, b) => b.utilization - a.utilization);
  }, [routes, filter, showBottleneckOnly]);

  const handleCapacityChange = (routeId: string, value: number) => {
    updateRouteCapacity(routeId, value);
  };

  const handleReset = (route: Route) => {
    const originalRoutes = useNetworkStore.getState().routes;
    updateRouteCapacity(route.id, route.capacity);
  };

  const handleSaveScenario = () => {
    if (!scenarioName.trim()) return;
    saveScenario(scenarioName.trim());
    setScenarioName('');
  };

  if (routes.length === 0) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <p className="text-base-500 text-sm">加载数据后调整容量</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="w-4 h-4 text-accent-cyan" />
        <h3 className="text-sm font-medium text-white">容量调整</h3>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="搜索线路..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-base-900 border border-base-600 text-sm text-white placeholder-base-500 focus:outline-none focus:border-accent-orange"
        />
        <label className="flex items-center gap-2 text-xs text-base-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showBottleneckOnly}
            onChange={(e) => setShowBottleneckOnly(e.target.checked)}
            className="rounded border-base-600 bg-base-800 text-accent-orange focus:ring-accent-orange"
          />
          仅瓶颈
        </label>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin pr-2">
        {filteredRoutes.map((route) => {
          const flow = analysisResult?.routeFlows[route.id] || 0;
          const newUtilization =
            route.capacity > 0 ? flow / route.capacity : 0;
          const isHighlighted = routeId === route.id;

          return (
            <div
              key={route.id}
              className={`p-3 border ${
                isHighlighted
                  ? 'border-accent-orange/50 bg-accent-orange/5'
                  : 'border-base-700 bg-base-900/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white">{route.id}</span>
                  <span className="text-xs text-base-500">
                    {route.from} → {route.to}
                  </span>
                  {route.isBottleneck && (
                    <span className="text-xs px-1.5 py-0.5 bg-accent-red/10 border border-accent-red/30 text-accent-red">
                      瓶颈
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleReset(route)}
                  className="p-1 hover:bg-base-700 transition-colors"
                  title="重置"
                >
                  <RotateCcw className="w-3 h-3 text-base-500" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max={Math.max(500, route.capacity * 2)}
                  value={route.capacity}
                  onChange={(e) =>
                    handleCapacityChange(route.id, parseInt(e.target.value))
                  }
                  className="flex-1 h-1 bg-base-700 appearance-none cursor-pointer accent-accent-orange"
                />
                <div className="flex items-center gap-1 w-32">
                  <input
                    type="number"
                    min="0"
                    value={route.capacity}
                    onChange={(e) =>
                      handleCapacityChange(
                        route.id,
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-16 px-2 py-1 bg-base-900 border border-base-600 text-sm text-white text-right font-mono focus:outline-none focus:border-accent-orange"
                  />
                  <span className="text-xs text-base-500">单位</span>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-base-500">利用率:</span>
                <div className="progress-bar-bg flex-1">
                  <div
                    className={`progress-bar-fill ${
                      newUtilization >= 0.9
                        ? 'bg-accent-red'
                        : newUtilization >= 0.7
                        ? 'bg-accent-amber'
                        : 'bg-accent-cyan'
                    }`}
                    style={{ width: `${Math.min(100, newUtilization * 100)}%` }}
                  />
                </div>
                <span
                  className={`font-mono ${
                    newUtilization >= 0.9
                      ? 'text-accent-red'
                      : newUtilization >= 0.7
                      ? 'text-accent-amber'
                      : 'text-accent-cyan'
                  }`}
                >
                  {(newUtilization * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-base-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="方案名称..."
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            className="flex-1 px-3 py-2 bg-base-900 border border-base-600 text-sm text-white placeholder-base-500 focus:outline-none focus:border-accent-orange"
          />
          <button
            onClick={handleSaveScenario}
            disabled={!scenarioName.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            保存方案
          </button>
        </div>
      </div>
    </div>
  );
}
