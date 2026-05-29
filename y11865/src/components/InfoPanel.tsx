import { useState, useMemo } from 'react';
import {
  BarChart3,
  AlertTriangle,
  History,
  Building2,
  Clock,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Play,
} from 'lucide-react';
import { useAppStore } from '../store';
import { getComparisonStatistics } from '../utils/comparisonEngine';

export default function InfoPanel() {
  const {
    currentSimulation,
    comparisonSimulation,
    comparison,
    selectedBuildingId,
    selectedFireStationId,
    alerts,
    simulationHistory,
    viewMode,
    setComparisonSimulation,
    setViewMode,
    setCurrentSimulation,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'stats' | 'alerts' | 'history'>('stats');

  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId || !currentSimulation) return null;
    return currentSimulation.buildings.find((b) => b.id === selectedBuildingId);
  }, [selectedBuildingId, currentSimulation]);

  const selectedBuildingResult = useMemo(() => {
    if (!selectedBuildingId || !currentSimulation) return null;
    return currentSimulation.results.find((r) => r.buildingId === selectedBuildingId);
  }, [selectedBuildingId, currentSimulation]);

  const selectedStation = useMemo(() => {
    if (!selectedFireStationId || !currentSimulation) return null;
    return currentSimulation.fireStations.find((s) => s.id === selectedFireStationId);
  }, [selectedFireStationId, currentSimulation]);

  const statistics = useMemo(() => {
    if (!currentSimulation || currentSimulation.results.length === 0) return null;

    const coveredBuildings = currentSimulation.results.filter(
      (r) => !r.isBlind
    ).length;
    const blindBuildings = currentSimulation.results.filter((r) => r.isBlind)
      .length;
    const avgResponseTime =
      currentSimulation.results.reduce((sum, r) => sum + r.responseTime, 0) /
      currentSimulation.results.length;
    const maxResponseTime = Math.max(
      ...currentSimulation.results.map((r) => r.responseTime)
    );

    const coveredPopulation = currentSimulation.buildings
      .filter((b) => {
        const result = currentSimulation.results.find(
          (r) => r.buildingId === b.id
        );
        return result && !result.isBlind;
      })
      .reduce((sum, b) => sum + b.population, 0);

    const totalPopulation = currentSimulation.buildings.reduce(
      (sum, b) => sum + b.population,
      0
    );

    return {
      coveredBuildings,
      blindBuildings,
      avgResponseTime,
      maxResponseTime,
      coveredPopulation,
      totalPopulation,
      coverageRate: (coveredBuildings / currentSimulation.buildings.length) * 100,
      populationCoverageRate: (coveredPopulation / totalPopulation) * 100,
    };
  }, [currentSimulation]);

  const comparisonStats = useMemo(() => {
    if (!comparison) return null;
    return getComparisonStatistics(comparison);
  }, [comparison]);

  if (!currentSimulation) {
    return (
      <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 h-full flex items-center justify-center">
        <p className="text-slate-400">正在加载数据...</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            分析面板
          </h2>
        </div>

        <div className="flex gap-1">
          {(['single', 'comparison', 'difference'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {mode === 'single' && '单视图'}
              {mode === 'comparison' && '对比'}
              {mode === 'difference' && '差异'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
            activeTab === 'stats'
              ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-800/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 mx-auto mb-1" />
          统计
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2 px-3 text-xs font-medium transition-colors relative ${
            activeTab === 'alerts'
              ? 'text-orange-400 border-b-2 border-orange-400 bg-slate-800/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
          告警
          {alerts.length > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
              {alerts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-green-400 border-b-2 border-green-400 bg-slate-800/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4 mx-auto mb-1" />
          历史
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {statistics && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-400 text-xs mb-1">
                      <CheckCircle className="w-3 h-3" />
                      覆盖建筑
                    </div>
                    <div className="text-xl font-bold text-white">
                      {statistics.coveredBuildings}
                    </div>
                    <div className="text-xs text-slate-400">
                      {statistics.coverageRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
                      <XCircle className="w-3 h-3" />
                      盲区建筑
                    </div>
                    <div className="text-xl font-bold text-white">
                      {statistics.blindBuildings}
                    </div>
                    <div className="text-xs text-slate-400">
                      {(100 - statistics.coverageRate).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      平均响应时间
                    </span>
                    <span className="text-white font-semibold">
                      {statistics.avgResponseTime.toFixed(1)} 分钟
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      最大响应时间
                    </span>
                    <span className="text-orange-400 font-semibold">
                      {statistics.maxResponseTime.toFixed(1)} 分钟
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      覆盖人口
                    </span>
                    <span className="text-white font-semibold">
                      {statistics.coveredPopulation.toLocaleString()}
                      <span className="text-slate-500 text-xs ml-1">
                        / {statistics.totalPopulation.toLocaleString()}
                      </span>
                    </span>
                  </div>
                </div>

                {comparisonStats && (
                  <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg p-3 border border-purple-500/30">
                    <h4 className="text-sm font-semibold text-purple-300 mb-3">
                      对比分析结果
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">响应改善</span>
                        <span className="text-green-400 flex items-center gap-1">
                          <ArrowDown className="w-3 h-3" />
                          {comparisonStats.improvedCount} 处
                          <span className="text-xs">
                            (平均 -{comparisonStats.avgImprovement.toFixed(1)}分)
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">响应恶化</span>
                        <span className="text-red-400 flex items-center gap-1">
                          <ArrowUp className="w-3 h-3" />
                          {comparisonStats.worsenedCount} 处
                          <span className="text-xs">
                            (平均 +{comparisonStats.avgWorsening.toFixed(1)}分)
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">新增盲区</span>
                        <span className="text-red-400">
                          {comparisonStats.newBlindCount} 处
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">消除盲区</span>
                        <span className="text-green-400">
                          {comparisonStats.resolvedBlindCount} 处
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedBuilding && (
              <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-500/30">
                <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  选中建筑
                </h4>
                <div className="text-sm text-white mb-1">{selectedBuilding.name}</div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>类型: {selectedBuilding.type}</div>
                  <div>高度: {selectedBuilding.height.toFixed(1)}m</div>
                  <div>人口: {selectedBuilding.population}</div>
                  {selectedBuildingResult && (
                    <>
                      <div
                        className={`font-semibold ${
                          selectedBuildingResult.isBlind
                            ? 'text-red-400'
                            : 'text-green-400'
                        }`}
                      >
                        响应时间: {selectedBuildingResult.responseTime.toFixed(1)} 分钟
                        {selectedBuildingResult.isBlind && ' (盲区)'}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {selectedStation && (
              <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
                <h4 className="text-sm font-semibold text-red-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  选中消防站
                </h4>
                <div className="text-sm text-white mb-1">{selectedStation.name}</div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>车辆数: {selectedStation.vehicles}</div>
                  <div>标准响应: {selectedStation.responseTime} 分钟</div>
                </div>
              </div>
            )}

            {!statistics && (
              <div className="text-center py-8">
                <Play className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">点击运行模拟查看分析结果</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">暂无告警信息</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.severity === 'error'
                      ? 'bg-red-900/30 border-red-500/30'
                      : alert.severity === 'warning'
                      ? 'bg-yellow-900/30 border-yellow-500/30'
                      : 'bg-blue-900/30 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        alert.severity === 'error'
                          ? 'text-red-400'
                          : alert.severity === 'warning'
                          ? 'text-yellow-400'
                          : 'text-blue-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs text-slate-400 uppercase mb-1">
                        {alert.type}
                      </div>
                      <p className="text-sm text-white">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            {simulationHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">暂无历史记录</p>
              </div>
            ) : (
              simulationHistory.map((sim) => (
                <div
                  key={sim.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    sim.id === currentSimulation.id
                      ? 'bg-blue-900/30 border-blue-500/50'
                      : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
                  }`}
                  onClick={() => {
                    setCurrentSimulation(sim);
                  }}
                >
                  <div className="text-sm font-medium text-white mb-1">
                    {sim.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(sim.createdAt).toLocaleString('zh-CN')}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setComparisonSimulation(sim);
                        setViewMode('comparison');
                      }}
                      className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                    >
                      设为对比
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
