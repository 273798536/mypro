import { useState, useEffect } from 'react';
import {
  Calculator as CalcIcon,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wind,
  Waves,
  Eye,
  Gauge,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/StatusBadge';
import { calculationFormulaInfo } from '@/utils/calculator';
import { formatDateTime } from '@/utils/formatters';
import type { CalculationParams, WindWindowResult } from '@/types';

export default function CalculatorPage() {
  const { calculateWindow, buoyData, isFirstVisit } = useAppStore();
  const [showFormulaInfo, setShowFormulaInfo] = useState(true);
  const [result, setResult] = useState<WindWindowResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [params, setParams] = useState<CalculationParams>({
    windSpeed: 8.5,
    waveHeight: 1.2,
    visibility: 1500,
    windSpeedThreshold: 10.8,
    waveHeightThreshold: 1.5,
    visibilityThreshold: 1000,
    durationHours: 8,
  });

  const handleParamChange = (key: keyof CalculationParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const newResult = calculateWindow(params);
      setResult(newResult);
      setIsCalculating(false);
    }, 600);
  };

  const loadFromBuoyData = (buoyId: string) => {
    const buoy = buoyData.find((b) => b.id === buoyId);
    if (buoy) {
      setParams((prev) => ({
        ...prev,
        windSpeed: buoy.windSpeed,
        waveHeight: buoy.waveHeight,
        visibility: buoy.visibility,
      }));
    }
  };

  useEffect(() => {
    if (buoyData.length > 0) {
      loadFromBuoyData(buoyData[0].id);
    }
  }, [buoyData]);

  if (isFirstVisit) return null;

  const windPercent = Math.min(100, (params.windSpeed / params.windSpeedThreshold) * 100);
  const wavePercent = Math.min(100, (params.waveHeight / params.waveHeightThreshold) * 100);
  const visibilityPercent = Math.min(100, (params.visibilityThreshold / params.visibility) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display mb-1">风浪窗口计算</h1>
          <p className="text-gray-400 text-sm">船员换班风浪窗口期分析工具</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors"
          >
            <Info size={16} />
            公式说明
            {showFormulaInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {showFormulaInfo && (
        <div
          className="rounded-xl border border-ocean-500/20 bg-gradient-to-r from-ocean-500/10 to-transparent p-5"
          style={{
            opacity: 0,
            animation: 'fadeInUp 0.5s ease-out 0.05s forwards',
          }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-ocean-500/20">
              <BookOpen size={20} className="text-ocean-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium mb-2">计算公式</h3>
              <div className="bg-deep-700/50 rounded-lg p-3 font-mono text-sm text-ocean-300 mb-4">
                {calculationFormulaInfo.formula}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">单位说明</h4>
                  <ul className="space-y-1 text-xs text-gray-400">
                    {Object.entries(calculationFormulaInfo.units).map(([key, value]) => (
                      <li key={key}>
                        <span className="text-gray-500">{key}:</span> {value}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">适用范围</h4>
                  <ul className="space-y-1 text-xs text-gray-400">
                    {calculationFormulaInfo.scope.map((item, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <CheckCircle size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">不适用情况</h4>
                  <ul className="space-y-1 text-xs text-gray-400">
                    {calculationFormulaInfo.limitations.map((item, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 space-y-6"
          style={{
            opacity: 0,
            animation: 'fadeInUp 0.5s ease-out 0.1s forwards',
          }}
        >
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white font-display mb-4 flex items-center gap-2">
              <CalcIcon size={20} className="text-ocean-400" />
              环境参数输入
            </h3>

            {buoyData.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
                <label className="text-sm text-gray-400 mb-2 block">快速加载浮标数据</label>
                <select
                  onChange={(e) => loadFromBuoyData(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-deep-600 border border-white/10 text-white text-sm
                           focus:outline-none focus:border-ocean-500/50 transition-colors"
                  defaultValue={buoyData[0]?.id}
                >
                  {buoyData.slice(0, 10).map((buoy) => (
                    <option key={buoy.id} value={buoy.id}>
                      {buoy.stationName} - {formatDateTime(buoy.timestamp)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <Wind size={16} className="text-ocean-400" />
                    风速
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={params.windSpeed}
                      onChange={(e) => handleParamChange('windSpeed', Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded bg-deep-700 border border-white/10 text-white text-right text-sm
                               focus:outline-none focus:border-ocean-500/50"
                      step="0.1"
                    />
                    <span className="text-xs text-gray-500">m/s</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.1"
                  value={params.windSpeed}
                  onChange={(e) => handleParamChange('windSpeed', Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-deep-700 appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ocean-500
                           [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-ocean-500/50"
                />
                <div className="h-2 rounded-full bg-deep-700 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      windPercent > 100 ? 'bg-red-500' : windPercent > 70 ? 'bg-amber-500' : 'bg-ocean-500'
                    }`}
                    style={{ width: `${windPercent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">阈值: {params.windSpeedThreshold} m/s</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <Waves size={16} className="text-ocean-400" />
                    浪高
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={params.waveHeight}
                      onChange={(e) => handleParamChange('waveHeight', Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded bg-deep-700 border border-white/10 text-white text-right text-sm
                               focus:outline-none focus:border-ocean-500/50"
                      step="0.1"
                    />
                    <span className="text-xs text-gray-500">m</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="0.1"
                  value={params.waveHeight}
                  onChange={(e) => handleParamChange('waveHeight', Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-deep-700 appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ocean-500
                           [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-ocean-500/50"
                />
                <div className="h-2 rounded-full bg-deep-700 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      wavePercent > 100 ? 'bg-red-500' : wavePercent > 70 ? 'bg-amber-500' : 'bg-ocean-500'
                    }`}
                    style={{ width: `${wavePercent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">阈值: {params.waveHeightThreshold} m</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <Eye size={16} className="text-ocean-400" />
                    能见度
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={params.visibility}
                      onChange={(e) => handleParamChange('visibility', Number(e.target.value))}
                      className="w-24 px-2 py-1 rounded bg-deep-700 border border-white/10 text-white text-right text-sm
                               focus:outline-none focus:border-ocean-500/50"
                      step="50"
                    />
                    <span className="text-xs text-gray-500">m</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="50"
                  value={params.visibility}
                  onChange={(e) => handleParamChange('visibility', Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-deep-700 appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ocean-500
                           [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-ocean-500/50"
                />
                <div className="h-2 rounded-full bg-deep-700 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      visibilityPercent > 100 ? 'bg-red-500' : visibilityPercent > 70 ? 'bg-amber-500' : 'bg-ocean-500'
                    }`}
                    style={{ width: `${visibilityPercent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">阈值: {params.visibilityThreshold} m</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <Clock size={16} className="text-ocean-400" />
                    窗口时长
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={params.durationHours}
                      onChange={(e) => handleParamChange('durationHours', Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded bg-deep-700 border border-white/10 text-white text-right text-sm
                               focus:outline-none focus:border-ocean-500/50"
                      min="1"
                      max="24"
                    />
                    <span className="text-xs text-gray-500">小时</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  step="1"
                  value={params.durationHours}
                  onChange={(e) => handleParamChange('durationHours', Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-deep-700 appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ocean-500
                           [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-ocean-500/50"
                />
                <p className="text-xs text-gray-500 mt-4">预计作业所需时间</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white font-display mb-4 flex items-center gap-2">
              <Gauge size={20} className="text-ocean-400" />
              安全阈值设置
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">风速阈值</label>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    value={params.windSpeedThreshold}
                    onChange={(e) => handleParamChange('windSpeedThreshold', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                             focus:outline-none focus:border-ocean-500/50"
                    step="0.1"
                  />
                  <span className="text-xs text-gray-500 ml-1">m/s</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">浪高阈值</label>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    value={params.waveHeightThreshold}
                    onChange={(e) => handleParamChange('waveHeightThreshold', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                             focus:outline-none focus:border-ocean-500/50"
                    step="0.1"
                  />
                  <span className="text-xs text-gray-500 ml-1">m</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">能见度阈值</label>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    value={params.visibilityThreshold}
                    onChange={(e) => handleParamChange('visibilityThreshold', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                             focus:outline-none focus:border-ocean-500/50"
                    step="50"
                  />
                  <span className="text-xs text-gray-500 ml-1">m</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-ocean-500 to-ocean-600 text-white font-medium text-lg
                     hover:from-ocean-400 hover:to-ocean-500 transition-all duration-300
                     shadow-lg shadow-ocean-500/30 hover:shadow-ocean-500/50
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            {isCalculating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                计算中...
              </>
            ) : (
              <>
                <CalcIcon size={20} />
                计算风浪窗口
              </>
            )}
          </button>
        </div>

        <div
          className="space-y-6"
          style={{
            opacity: 0,
            animation: 'fadeInUp 0.5s ease-out 0.2s forwards',
          }}
        >
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-white font-display mb-4">计算结果</h3>

            {result ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <StatusBadge type="safety" status={result.safetyLevel} size="md" />
                  <div className="mt-3">
                    <span className="text-4xl font-bold font-display text-white">
                      {(result.safetyScore * 100).toFixed(0)}
                    </span>
                    <span className="text-lg text-gray-400">%</span>
                    <p className="text-sm text-gray-500 mt-1">安全指数</p>
                  </div>
                </div>

                {result.failureReason ? (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-300 mb-1">不满足安全条件</p>
                        <p className="text-xs text-red-400/80">{result.failureReason}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">开始时间</span>
                        <span className="text-white font-medium">{formatDateTime(result.startTime)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">结束时间</span>
                        <span className="text-white font-medium">{formatDateTime(result.endTime)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">持续时长</span>
                        <span className="text-ocean-400 font-medium">{params.durationHours} 小时</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10">
                      <p className="text-sm text-gray-300 leading-relaxed">{result.description}</p>
                    </div>
                  </>
                )}

                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-500">
                    计算时间: {formatDateTime(result.calculatedAt)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <CalcIcon size={28} className="text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm">输入参数后点击计算</p>
                <p className="text-gray-600 text-xs mt-1">将生成风浪窗口期分析结果</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
