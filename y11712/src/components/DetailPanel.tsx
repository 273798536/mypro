import { X, Thermometer, Ruler, TrendingUp } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { tempToColorHex } from '../utils/colorMap';

export default function DetailPanel() {
  const {
    temperatureField,
    currentTimeStep,
    params,
    resultStats,
    selectedPoint,
    pointInfo,
    selectPoint,
  } = useSimulationStore();

  const hasResult = temperatureField.length > 0;
  const { minTemp, maxTemp } = resultStats || { minTemp: 0, maxTemp: 100 };

  return (
    <div className="w-64 bg-slate-900 border-l border-slate-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100">点明细</h2>
        <p className="text-xs text-slate-500 mt-1">点击板材查看网格点数据</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedPoint && pointInfo ? (
          <>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Ruler size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400">坐标位置</span>
                <button
                  onClick={() => selectPoint(null, null)}
                  className="ml-auto p-1 hover:bg-slate-700 rounded"
                >
                  <X size={12} className="text-slate-500" />
                </button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">X</span>
                  <span className="text-slate-200 font-mono">{(pointInfo.x * 1000).toFixed(1)} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Y</span>
                  <span className="text-slate-200 font-mono">{(pointInfo.y * 1000).toFixed(1)} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">网格索引</span>
                  <span className="text-slate-200 font-mono">[{selectedPoint.i}, {selectedPoint.j}]</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400">温度</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: tempToColorHex(pointInfo.temperature, minTemp, maxTemp) }}
                />
                <span className="text-2xl font-mono text-slate-100">
                  {pointInfo.temperature.toFixed(2)}
                </span>
                <span className="text-sm text-slate-400">°C</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                范围: {minTemp.toFixed(1)} ~ {maxTemp.toFixed(1)} °C
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400">温度梯度</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">∂T/∂x</span>
                  <span className="text-slate-200 font-mono">{pointInfo.gradX.toFixed(2)} °C/m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">∂T/∂y</span>
                  <span className="text-slate-200 font-mono">{pointInfo.gradY.toFixed(2)} °C/m</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-700/50">
                  <span className="text-slate-400">模值</span>
                  <span className="text-slate-200 font-mono">{pointInfo.gradientMagnitude.toFixed(2)} °C/m</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
              <Ruler size={20} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">点击板材上的任意位置</p>
            <p className="text-xs text-slate-600 mt-1">查看该点的温度和梯度</p>
          </div>
        )}

        {hasResult && (
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400">全场统计 (t = {(currentTimeStep * params.timeStep).toFixed(4)}s)</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">最高温度</span>
                <span className="text-red-400 font-mono">{maxTemp.toFixed(2)} °C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">最低温度</span>
                <span className="text-blue-400 font-mono">{minTemp.toFixed(2)} °C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">平均温度</span>
                <span className="text-slate-200 font-mono">{resultStats?.avgTemp.toFixed(2) || 'N/A'} °C</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-2">温度色阶图例</div>
          <div className="h-3 rounded-full" style={{
            background: 'linear-gradient(to right, #1764b8, #1fb0f2, #10b981, #f59e0b, #ef4444)'
          }} />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{minTemp.toFixed(0)}</span>
            <span>{((minTemp + maxTemp) / 2).toFixed(0)}</span>
            <span>{maxTemp.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
