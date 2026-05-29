import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, LineChart, Plus, RefreshCw } from 'lucide-react';
import { useNetworkStore } from '@/store/useNetworkStore';
import { createScenario } from '@/utils/compare';
import CapacitySlider from '@/components/scenario/CapacitySlider';
import ScenarioCard from '@/components/scenario/ScenarioCard';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Scenario() {
  const query = useQuery();
  const navigate = useNavigate();
  const queryRouteId = query.get('routeId');
  const {
    nodes,
    routes,
    scenarios,
    analysisResult,
    loadSampleData,
    loadScenario,
    deleteScenario,
    saveScenario,
    setSelectedRouteId,
  } = useNetworkStore();
  const [baseScenario, setBaseScenario] = useState<string | null>(null);

  useEffect(() => {
    if (nodes.length === 0) {
      loadSampleData();
    }
  }, [nodes.length, loadSampleData]);

  useEffect(() => {
    if (queryRouteId) {
      setSelectedRouteId(queryRouteId);
    }
  }, [queryRouteId, setSelectedRouteId]);

  const handleCreateBaseline = () => {
    if (analysisResult && nodes.length > 0) {
      const scenario = createScenario(`基线方案_${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`, nodes, routes);
      setBaseScenario(scenario.id);
    }
  };

  const handleLoadScenario = (scenarioId: string) => {
    loadScenario(scenarioId);
  };

  const handleDeleteScenario = (scenarioId: string) => {
    deleteScenario(scenarioId);
    if (baseScenario === scenarioId) {
      setBaseScenario(null);
    }
  };

  const baseScenarioData = scenarios.find((s) => s.id === baseScenario);

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
          <LineChart className="w-6 h-6 text-accent-cyan" />
          情景对比
        </h1>
        <p className="text-sm text-base-500 mt-1">
          调整线路容量后重算，对比不同方案的最大流和瓶颈变化
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <CapacitySlider routeId={queryRouteId || undefined} />
        </div>

        <div className="lg:col-span-2">
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-white">当前状态</h3>
                {analysisResult && (
                  <span className="text-xs text-base-500">
                    基于当前数据
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {scenarios.length > 0 && (
                  <select
                    value={baseScenario || ''}
                    onChange={(e) => setBaseScenario(e.target.value || null)}
                    className="px-2 py-1 bg-base-900 border border-base-600 text-xs text-white focus:outline-none focus:border-accent-orange"
                  >
                    <option value="">-- 选择对比基线 --</option>
                    {scenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleCreateBaseline}
                  disabled={!analysisResult}
                  className="btn flex items-center gap-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3 h-3" />
                  保存为基线
                </button>
              </div>
            </div>

            {analysisResult && (
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-base-500 mb-1">最大流</div>
                  <div className="font-mono text-2xl text-white">
                    {analysisResult.maxFlow}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-base-500 mb-1">瓶颈数</div>
                  <div
                    className={`font-mono text-2xl ${
                      analysisResult.bottleneckRoutes.length > 0
                        ? 'text-accent-red'
                        : 'text-accent-cyan'
                    }`}
                  >
                    {analysisResult.bottleneckRoutes.length}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-base-500 mb-1">整体利用率</div>
                  <div className="font-mono text-2xl text-white">
                    {(analysisResult.utilizationRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-base-500 mb-1">求解步骤</div>
                  <div className="font-mono text-2xl text-white">
                    {analysisResult.solverSteps.length}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-white">已保存方案</h3>
              {scenarios.length > 0 && (
                <span className="text-xs text-base-500">
                  共 {scenarios.length} 个方案
                </span>
              )}
            </div>

            {scenarios.length === 0 ? (
              <div className="card p-8 flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 text-base-600 mb-2" />
                <p className="text-base-500 text-sm">暂无保存的方案</p>
                <p className="text-xs text-base-600 mt-1">
                  调整左侧容量滑块，然后点击"保存方案"
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {scenarios.map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    baseScenario={baseScenarioData}
                    onDelete={() => handleDeleteScenario(scenario.id)}
                    onLoad={() => handleLoadScenario(scenario.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {baseScenarioData && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-white">对比说明</h3>
            <span className="text-xs text-base-500">
              基线: {baseScenarioData.name}
            </span>
          </div>
          <div className="text-xs text-base-500 space-y-1">
            <p>
              <span className="text-accent-cyan">青色数字</span> 表示相比基线有所改善
            </p>
            <p>
              <span className="text-accent-red">红色数字</span> 表示相比基线有所恶化
            </p>
            <p>点击方案卡片的播放按钮可加载该方案进行查看或进一步调整</p>
          </div>
        </div>
      )}
    </div>
  );
}
