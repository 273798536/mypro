import { Play, Settings, Thermometer, Waves, Sliders, Loader2 } from 'lucide-react';
import { useCalibrationStore } from '../../store/useCalibrationStore';
import { generateSummary } from '../../utils/export';

export const CalibrationPanel = () => {
  const { 
    records, 
    config, 
    phase, 
    isCalibrating, 
    calibrate, 
    updateConfig 
  } = useCalibrationStore();
  
  const summary = records.length > 0 ? generateSummary(records, phase) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#3E92CC]/10 rounded-lg">
            <Settings className="w-5 h-5 text-[#3E92CC]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">校准控制</h3>
            <p className="text-sm text-gray-500">配置校准参数并执行</p>
          </div>
        </div>
        <button
          onClick={calibrate}
          disabled={records.length === 0 || isCalibrating}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
            records.length === 0 || isCalibrating
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-[#0A2463] text-white hover:bg-[#0A2463]/90 shadow-md hover:shadow-lg'
          }`}
        >
          {isCalibrating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              校准中...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              执行校准
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">参考温度</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="40"
              value={config.referenceTemperature}
              onChange={(e) => updateConfig({ referenceTemperature: parseFloat(e.target.value) })}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3E92CC]"
            />
            <span className="text-lg font-mono font-bold text-[#0A2463] min-w-[60px] text-right">
              {config.referenceTemperature}°C
            </span>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">异常阈值</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={config.anomalyThreshold}
              onChange={(e) => updateConfig({ anomalyThreshold: parseFloat(e.target.value) })}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3E92CC]"
            />
            <span className="text-lg font-mono font-bold text-[#0A2463] min-w-[50px] text-right">
              {config.anomalyThreshold.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Waves className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">多重回声检测</span>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={config.enableMultiEchoDetection}
                onChange={(e) => updateConfig({ enableMultiEchoDetection: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors ${
                config.enableMultiEchoDetection ? 'bg-[#3E92CC]' : 'bg-gray-300'
              }`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-1 ${
                  config.enableMultiEchoDetection ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </div>
            </div>
            <span className="text-sm text-gray-600">
              {config.enableMultiEchoDetection ? '已启用' : '已禁用'}
            </span>
          </label>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">自动单位转换</span>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={config.autoUnitConversion}
                onChange={(e) => updateConfig({ autoUnitConversion: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors ${
                config.autoUnitConversion ? 'bg-[#3E92CC]' : 'bg-gray-300'
              }`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-1 ${
                  config.autoUnitConversion ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </div>
            </div>
            <span className="text-sm text-gray-600">
              {config.autoUnitConversion ? '已启用' : '已禁用'}
            </span>
          </label>
        </div>
      </div>

      {summary && (
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">校准统计</h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-[#0A2463]">{summary.totalRecords}</p>
              <p className="text-xs text-gray-500">总记录数</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{summary.calibratedCount}</p>
              <p className="text-xs text-gray-500">已校准</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{summary.errorCount}</p>
              <p className="text-xs text-gray-500">错误异常</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{summary.averageError.toFixed(2)}%</p>
              <p className="text-xs text-gray-500">平均误差</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
