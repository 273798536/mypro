import { useState } from 'react';
import {
  Thermometer,
  Maximize2,
  Layers,
  RotateCcw,
  Info,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { MATERIALS, TemperatureUnit, UNIT_LABELS } from '../../types';
import { toKelvin } from '../../utils/physics';

export function ControlPanel() {
  const {
    heatSource,
    setTemperature,
    setTemperatureUnit,
    setArea,
    setMaterial,
    resetToDefault,
    validationResults,
  } = useAppStore();

  const [tempInput, setTempInput] = useState(heatSource.temperature.toString());
  const [areaInput, setAreaInput] = useState(heatSource.area.toString());

  const getValidationFor = (paramName: string) => {
    return validationResults.find((v) => v.parameterName === paramName);
  };

  const tempValidation = getValidationFor('temperature');
  const areaValidation = getValidationFor('area');
  const emissivityValidation = getValidationFor('emissivity');

  const handleTempChange = (value: string) => {
    setTempInput(value);
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setTemperature(num);
    }
  };

  const handleAreaChange = (value: string) => {
    setAreaInput(value);
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setArea(num);
    }
  };

  const handleUnitChange = (unit: TemperatureUnit) => {
    setTemperatureUnit(unit);
    const newTemp = toKelvin(heatSource.temperature, heatSource.temperatureUnit);
    let converted: number;
    switch (unit) {
      case 'celsius':
        converted = newTemp - 273.15;
        break;
      case 'fahrenheit':
        converted = (newTemp - 273.15) * (9 / 5) + 32;
        break;
      default:
        converted = newTemp;
    }
    setTempInput(converted.toFixed(2));
  };

  const getStatusIcon = (level?: 'info' | 'warning' | 'error') => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const tempMin = heatSource.temperatureUnit === 'celsius' ? -273.15 :
                 heatSource.temperatureUnit === 'kelvin' ? 0 : -459.67;
  const tempMax = heatSource.temperatureUnit === 'celsius' ? 5726.85 :
                 heatSource.temperatureUnit === 'kelvin' ? 6000 : 10340.33;

  return (
    <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white font-['Orbitron'] tracking-wider">
          参数控制
        </h2>
        <p className="text-xs text-slate-400 mt-1">调节热辐射参数观察变化</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-orange-400" />
            <label className="text-sm font-medium text-slate-200">热源温度</label>
            {getStatusIcon(tempValidation?.level)}
          </div>

          <div className="flex gap-2 mb-2">
            {(['celsius', 'kelvin', 'fahrenheit'] as TemperatureUnit[]).map((unit) => (
              <button
                key={unit}
                onClick={() => handleUnitChange(unit)}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                  heatSource.temperatureUnit === unit
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {UNIT_LABELS[unit]}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              value={tempInput}
              onChange={(e) => handleTempChange(e.target.value)}
              min={tempMin}
              max={tempMax}
              step={1}
              className={`flex-1 bg-slate-800 border rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 ${
                tempValidation?.level === 'error'
                  ? 'border-red-500 focus:ring-red-500/50'
                  : tempValidation?.level === 'warning'
                  ? 'border-yellow-500 focus:ring-yellow-500/50'
                  : 'border-slate-600 focus:ring-blue-500/50'
              }`}
            />
            <span className="flex items-center px-3 bg-slate-800 border border-slate-600 rounded text-slate-400 text-sm">
              {UNIT_LABELS[heatSource.temperatureUnit]}
            </span>
          </div>

          <input
            type="range"
            min={tempMin}
            max={tempMax}
            step={1}
            value={parseFloat(tempInput) || tempMin}
            onChange={(e) => handleTempChange(e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />

          {tempValidation && tempValidation.level !== 'info' && (
            <div className={`p-2 rounded text-xs ${
              tempValidation.level === 'error'
                ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
            }`}>
              <p className="font-medium">{tempValidation.message}</p>
              {tempValidation.correction && (
                <p className="mt-1 opacity-80">💡 {tempValidation.correction}</p>
              )}
            </div>
          )}

          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            数据来源: {heatSource.dataSource}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-cyan-400" />
            <label className="text-sm font-medium text-slate-200">辐射面积</label>
            {getStatusIcon(areaValidation?.level)}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              value={areaInput}
              onChange={(e) => handleAreaChange(e.target.value)}
              min={0.01}
              max={100}
              step={0.1}
              className={`flex-1 bg-slate-800 border rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 ${
                areaValidation?.level === 'error'
                  ? 'border-red-500 focus:ring-red-500/50'
                  : 'border-slate-600 focus:ring-blue-500/50'
              }`}
            />
            <span className="flex items-center px-3 bg-slate-800 border border-slate-600 rounded text-slate-400 text-sm">
              m²
            </span>
          </div>

          <input
            type="range"
            min={0.01}
            max={100}
            step={0.1}
            value={parseFloat(areaInput) || 0.01}
            onChange={(e) => handleAreaChange(e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />

          {areaValidation && areaValidation.level !== 'info' && (
            <div className={`p-2 rounded text-xs ${
              areaValidation.level === 'error'
                ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
            }`}>
              <p className="font-medium">{areaValidation.message}</p>
              {areaValidation.correction && (
                <p className="mt-1 opacity-80">💡 {areaValidation.correction}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <label className="text-sm font-medium text-slate-200">材料选择</label>
            {getStatusIcon(emissivityValidation?.level)}
          </div>

          <select
            value={heatSource.material.id}
            onChange={(e) => {
              const material = MATERIALS.find((m) => m.id === e.target.value);
              if (material) setMaterial(material);
            }}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {MATERIALS.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name} (ε = {material.emissivity.toFixed(4)})
              </option>
            ))}
          </select>

          <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400">发射率 ε</span>
              <span className="text-sm font-mono text-purple-400">
                {heatSource.material.emissivity.toFixed(4)}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all"
                style={{ width: `${heatSource.material.emissivity * 100}%` }}
              />
            </div>
          </div>

          {emissivityValidation && emissivityValidation.level !== 'info' && (
            <div className={`p-2 rounded text-xs ${
              emissivityValidation.level === 'error'
                ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
            }`}>
              <p className="font-medium">{emissivityValidation.message}</p>
              {emissivityValidation.correction && (
                <p className="mt-1 opacity-80">💡 {emissivityValidation.correction}</p>
              )}
            </div>
          )}

          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            数据来源: {heatSource.material.dataSource}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={resetToDefault}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-4 rounded transition-all border border-slate-600 hover:border-slate-500"
        >
          <RotateCcw className="w-4 h-4" />
          重置为默认参数
        </button>
      </div>
    </div>
  );
}
