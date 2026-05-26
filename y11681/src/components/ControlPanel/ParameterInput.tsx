import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { UnitSelector } from './UnitSelector';
import { ValidationAlert } from './ValidationAlert';
import { validateParams } from '@/utils/validator';
import { Play, RotateCcw, Save, LineChart } from 'lucide-react';
import { useRecordStore } from '@/store/useRecordStore';
import { useCompareStore } from '@/store/useCompareStore';

export function ParameterInput() {
  const {
    currentParams,
    currentResult,
    setParams,
    calculate,
    resetParams,
    validation,
    isPlaying,
  } = useTrajectoryStore();

  const addRecord = useRecordStore((s) => s.addRecord);
  const addToCompare = useCompareStore((s) => s.addToCompare);
  const compareItems = useCompareStore((s) => s.items);

  const liveValidation = validateParams(currentParams);

  const handleCalculate = () => {
    calculate();
  };

  const handleSave = () => {
    if (currentResult) {
      addRecord(currentResult);
    }
  };

  const handleCompare = () => {
    if (currentResult) {
      addToCompare(currentResult);
    }
  };

  const inputClass = "w-20 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-display text-golf-green">击球参数</h2>
        <button
          onClick={resetParams}
          className="p-1.5 rounded hover:bg-golf-teal/20 transition-colors"
          title="重置参数"
        >
          <RotateCcw size={14} className="text-golf-green" />
        </button>
      </div>

      <div className="glass-panel rounded-lg p-4 space-y-3">
        <div className="text-xs text-golf-green font-semibold mb-2">球速与角度</div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">球速</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={currentParams.ballSpeed}
                onChange={(e) => setParams({ ballSpeed: parseFloat(e.target.value) || 0 })}
                className={inputClass}
                step="0.5"
                min={0}
              />
              <UnitSelector
                value={currentParams.ballSpeedUnit}
                onChange={(v) => setParams({ ballSpeedUnit: v })}
              />
            </div>
            <input
              type="range"
              min={20}
              max={100}
              value={currentParams.ballSpeedUnit === 'm/s' ? currentParams.ballSpeed :
                currentParams.ballSpeedUnit === 'km/h' ? currentParams.ballSpeed / 3.6 :
                currentParams.ballSpeed / 2.23694}
              onChange={(e) => {
                const ms = parseFloat(e.target.value);
                const val = currentParams.ballSpeedUnit === 'm/s' ? ms :
                  currentParams.ballSpeedUnit === 'km/h' ? ms * 3.6 :
                  ms * 2.23694;
                setParams({ ballSpeed: Math.round(val * 10) / 10 });
              }}
              className="w-full mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">发射角 (°)</label>
            <input
              type="number"
              value={currentParams.launchAngle}
              onChange={(e) => setParams({ launchAngle: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              step="0.5"
              min={0}
              max={45}
            />
            <input
              type="range"
              min={0}
              max={45}
              value={currentParams.launchAngle}
              onChange={(e) => setParams({ launchAngle: parseFloat(e.target.value) })}
              className="w-full mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">发射方向 (°)</label>
            <input
              type="number"
              value={currentParams.launchDirection}
              onChange={(e) => setParams({ launchDirection: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              step="1"
              min={-90}
              max={90}
            />
            <input
              type="range"
              min={-45}
              max={45}
              value={currentParams.launchDirection}
              onChange={(e) => setParams({ launchDirection: parseFloat(e.target.value) })}
              className="w-full mt-1"
            />
          </div>
        </div>

        <div className="text-xs text-golf-green font-semibold mt-4 mb-2">旋转</div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">后旋 (rpm)</label>
            <input
              type="number"
              value={currentParams.backspin}
              onChange={(e) => setParams({ backspin: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              step="100"
            />
            <input
              type="range"
              min={500}
              max={5000}
              value={currentParams.backspin}
              onChange={(e) => setParams({ backspin: parseFloat(e.target.value) })}
              className="w-full mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">侧旋 (rpm)</label>
            <input
              type="number"
              value={currentParams.sidespin}
              onChange={(e) => setParams({ sidespin: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              step="50"
            />
            <input
              type="range"
              min={-3000}
              max={3000}
              value={currentParams.sidespin}
              onChange={(e) => setParams({ sidespin: parseFloat(e.target.value) })}
              className="w-full mt-1"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-lg p-4 space-y-3">
        <div className="text-xs text-golf-green font-semibold mb-2">环境条件</div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">风速</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={currentParams.windSpeed}
                onChange={(e) => setParams({ windSpeed: parseFloat(e.target.value) || 0 })}
                className={inputClass}
                step="0.5"
                min={0}
              />
              <UnitSelector
                value={currentParams.windSpeedUnit}
                onChange={(v) => setParams({ windSpeedUnit: v })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">风向 (°)</label>
            <input
              type="number"
              value={currentParams.windDirection}
              onChange={(e) => setParams({ windDirection: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              step="5"
            />
            <div className="text-xs text-gray-500 mt-1">
              0=左→右, 90=迎面, 270=顺风
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">温度 (°C)</label>
            <input
              type="number"
              value={currentParams.temperature}
              onChange={(e) => setParams({ temperature: parseFloat(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">湿度 (%)</label>
            <input
              type="number"
              value={currentParams.humidity}
              onChange={(e) => setParams({ humidity: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              min={0}
              max={100}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">海拔 (m)</label>
            <input
              type="number"
              value={currentParams.altitude}
              onChange={(e) => setParams({ altitude: parseFloat(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <ValidationAlert
        errors={[...validation.errors, ...liveValidation.errors]}
        warnings={[...validation.warnings, ...liveValidation.warnings]}
      />

      <div className="flex gap-2">
        <button
          onClick={handleCalculate}
          disabled={!liveValidation.valid && !validation.valid}
          className="btn-primary flex items-center gap-2 flex-1 justify-center"
        >
          <Play size={16} />
          计算弹道
        </button>
        <button
          onClick={handleSave}
          disabled={!currentResult}
          className="btn-secondary flex items-center gap-2"
          title="保存到训练记录"
        >
          <Save size={14} />
        </button>
        <button
          onClick={handleCompare}
          disabled={!currentResult || compareItems.length >= 4}
          className="btn-secondary flex items-center gap-2"
          title={`添加到对比 (${compareItems.length}/4)`}
        >
          <LineChart size={14} />
          {compareItems.length > 0 && (
            <span className="text-xs">{compareItems.length}/4</span>
          )}
        </button>
      </div>
    </div>
  );
}
