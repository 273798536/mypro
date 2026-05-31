import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { ResultCard } from '@/components/ResultCard';
import { ErrorList } from '@/components/ErrorList';
import { UnitLabel } from '@/components/UnitLabel';
import { FREQUENCY_BANDS } from '@/types';
import type { ValidationError, CalculationResult } from '@/types';
import { Play, RotateCcw, Database, AlertTriangle } from 'lucide-react';

export const CalculationPage = () => {
  const {
    roadNoiseSources,
    barriers,
    materials,
    residentPoints,
    results,
    errors,
    selectedRoadNoiseId,
    selectedBarrierId,
    selectedResidentPointId,
    setSelectedRoadNoiseId,
    setSelectedBarrierId,
    setSelectedResidentPointId,
    runValidation,
    runCalculation,
    loadMockData,
    clearResults,
    getSelectedData,
  } = useAppStore();

  const [latestResult, setLatestResult] = useState<CalculationResult | null>(null);

  const selectedData = getSelectedData();
  const hasErrors = errors.filter((e) => e.severity === 'error').length > 0;

  useEffect(() => {
    if (roadNoiseSources.length === 0) {
      loadMockData();
    }
  }, [roadNoiseSources.length, loadMockData]);

  useEffect(() => {
    runValidation();
  }, [roadNoiseSources, barriers, materials, residentPoints, runValidation]);

  useEffect(() => {
    if (results.length > 0) {
      setLatestResult(results[results.length - 1]);
    }
  }, [results]);

  const handleCalculate = () => {
    if (!selectedRoadNoiseId || !selectedBarrierId || !selectedResidentPointId) return;
    runCalculation(selectedRoadNoiseId, selectedBarrierId, selectedResidentPointId);
  };

  const handleErrorClick = (error: ValidationError) => {
    if (error.source?.materialId) {
      // 可以添加跳转到材料管理页面的逻辑
    }
  };

  const hasMissingData =
    selectedData.roadNoise &&
    FREQUENCY_BANDS.some((b) => selectedData.roadNoise!.spectrum[b] === null) ||
    selectedData.material &&
    FREQUENCY_BANDS.some((b) => selectedData.material!.transmissionLoss[b] === null);

  return (
    <div className="min-h-screen bg-primary-950 pl-64">
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-white mb-2">声衰减计算</h1>
          <p className="text-primary-400">
            基于ISO 9613-2标准的户外声传播衰减计算模型
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white">道路噪声源</h2>
                  <UnitLabel unit="dB" />
                </div>
                <select
                  value={selectedRoadNoiseId || ''}
                  onChange={(e) => setSelectedRoadNoiseId(e.target.value || null)}
                  className="w-full bg-primary-800 border border-primary-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange/50 mb-4"
                >
                  <option value="">请选择道路噪声源</option>
                  {roadNoiseSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {selectedData.roadNoise && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-400">车流量</span>
                      <span className="text-white font-mono">
                        {selectedData.roadNoise.trafficVolume}
                        <span className="text-primary-500 ml-1">辆/h</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-400">限速</span>
                      <span className="text-white font-mono">
                        {selectedData.roadNoise.speedLimit}
                        <span className="text-primary-500 ml-1">km/h</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-400">重型车比例</span>
                      <span className="text-white font-mono">
                        {selectedData.roadNoise.heavyVehicleRatio}
                        <span className="text-primary-500 ml-1">%</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-3">
                      {FREQUENCY_BANDS.map((band) => {
                        const val = selectedData.roadNoise!.spectrum[band];
                        return (
                          <div
                            key={band}
                            className={`text-center p-1.5 rounded ${
                              val === null
                                ? 'bg-accent-red/20 border border-accent-red/40'
                                : 'bg-primary-800/50'
                            }`}
                          >
                            <div className="text-[10px] text-primary-500">{band}Hz</div>
                            <div
                              className={`text-xs font-mono font-semibold ${
                                val === null ? 'text-accent-red' : 'text-white'
                              }`}
                            >
                              {val === null ? '?' : val}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white">隔音墙参数</h2>
                  <UnitLabel unit="m" />
                </div>
                <select
                  value={selectedBarrierId || ''}
                  onChange={(e) => setSelectedBarrierId(e.target.value || null)}
                  className="w-full bg-primary-800 border border-primary-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange/50 mb-4"
                >
                  <option value="">请选择隔音墙</option>
                  {barriers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {selectedData.barrier && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-400">墙体高度</span>
                      <span className="text-white font-mono">
                        {selectedData.barrier.height}
                        <span className="text-primary-500 ml-1">m</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-400">墙体长度</span>
                      <span className="text-white font-mono">
                        {selectedData.barrier.length}
                        <span className="text-primary-500 ml-1">m</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-400">距道路距离</span>
                      <span className="text-white font-mono">
                        {selectedData.barrier.distanceFromRoad}
                        <span className="text-primary-500 ml-1">m</span>
                      </span>
                    </div>
                    <div className="mt-3 p-3 bg-primary-800/50 rounded-lg">
                      <div className="text-[10px] text-primary-500 mb-1">关联材料</div>
                      <div className="text-sm text-accent-orange font-medium">
                        {selectedData.material?.name || '未找到材料'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white">居民接收点</h2>
                  <UnitLabel unit="m" />
                </div>
                <select
                  value={selectedResidentPointId || ''}
                  onChange={(e) => setSelectedResidentPointId(e.target.value || null)}
                  className="w-full bg-primary-800 border border-primary-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange/50 mb-4"
                >
                  <option value="">请选择居民点</option>
                  {residentPoints.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {selectedData.residentPoint && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-400">距道路距离</span>
                      <span className="text-white font-mono">
                        {selectedData.residentPoint.distanceFromRoad}
                        <span className="text-primary-500 ml-1">m</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-400">接收点高度</span>
                      <span className="text-white font-mono">
                        {selectedData.residentPoint.receiverHeight}
                        <span className="text-primary-500 ml-1">m</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-400">坐标</span>
                      <span className="text-white font-mono text-xs">
                        {selectedData.residentPoint.position.lat.toFixed(4)},
                        {selectedData.residentPoint.position.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleCalculate}
                disabled={
                  !selectedRoadNoiseId ||
                  !selectedBarrierId ||
                  !selectedResidentPointId ||
                  hasErrors
                }
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  !selectedRoadNoiseId ||
                  !selectedBarrierId ||
                  !selectedResidentPointId ||
                  hasErrors
                    ? 'bg-primary-700 text-primary-500 cursor-not-allowed'
                    : 'bg-accent-orange text-white hover:bg-accent-orange/90 active:scale-98'
                }`}
              >
                <Play size={18} />
                执行计算
              </button>
              <button
                onClick={clearResults}
                className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium bg-primary-800 text-primary-300 hover:bg-primary-700 transition-all"
              >
                <RotateCcw size={16} />
                清除结果
              </button>
              <button
                onClick={loadMockData}
                className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium bg-primary-800 text-primary-300 hover:bg-primary-700 transition-all"
              >
                <Database size={16} />
                加载示例数据
              </button>
              {hasErrors && (
                <div className="flex items-center gap-2 text-accent-red text-sm">
                  <AlertTriangle size={16} />
                  存在数据错误，请先修正
                </div>
              )}
            </div>

            {latestResult && selectedData.roadNoise && selectedData.barrier && selectedData.residentPoint && (
              <ResultCard
                result={latestResult}
                roadNoiseName={selectedData.roadNoise.name}
                barrierName={selectedData.barrier.name}
                residentPointName={selectedData.residentPoint.name}
                hasMissingData={!!hasMissingData}
              />
            )}
          </div>

          <div className="col-span-4">
            <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-5 sticky top-8">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-accent-orange" />
                数据校验结果
              </h2>
              <ErrorList errors={errors} onErrorClick={handleErrorClick} maxItems={15} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
