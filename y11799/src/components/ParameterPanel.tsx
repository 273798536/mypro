import { Sliders, ThermometerSun, Droplets, Zap, Home, Clock } from 'lucide-react';
import { useAppStore } from '@/store';
import { heatPumpData } from '@/data/heatPumps';
import { electricityTemplates } from '@/data/electricityTemplates';
import { getAlertsByField } from '@/utils/validator';

const ParameterPanel = () => {
  const { input, alerts, setOutdoorTemp, setSupplyWaterTemp, setHeatPumpId, setElectricityPrice, setHeatLoad, setOperatingHours } = useAppStore();

  const outdoorTempAlerts = getAlertsByField(alerts, 'outdoorTemp');
  const supplyWaterTempAlerts = getAlertsByField(alerts, 'supplyWaterTemp');
  const heatLoadAlerts = getAlertsByField(alerts, 'heatLoad');
  const priceAlerts = getAlertsByField(alerts, 'electricityPrice');
  const hoursAlerts = getAlertsByField(alerts, 'operatingHours');

  const selectedHeatPump = heatPumpData.find(hp => hp.id === input.heatPumpId);

  const getFieldStatus = (fieldAlerts: typeof alerts) => {
    if (fieldAlerts.some(a => a.type === 'error')) return 'error';
    if (fieldAlerts.some(a => a.type === 'warning')) return 'warning';
    return 'normal';
  };

  return (
    <div className="h-full bg-slate-800/50 rounded-xl p-4 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold text-white">参数配置</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            机组型号
          </label>
          <select
            value={input.heatPumpId}
            onChange={(e) => setHeatPumpId(e.target.value)}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
          >
            {heatPumpData.map(hp => (
              <option key={hp.id} value={hp.id}>
                {hp.brand} {hp.model} ({hp.ratedCapacity}kW, COP:{hp.ratedCOP})
              </option>
            ))}
          </select>
          <div className="mt-1 text-xs text-slate-400">
            工作温度范围: {selectedHeatPump?.minOutdoorTemp}℃ ~ {selectedHeatPump?.maxOutdoorTemp}℃
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <ThermometerSun className={`w-4 h-4 ${getFieldStatus(outdoorTempAlerts) === 'error' ? 'text-red-400' : getFieldStatus(outdoorTempAlerts) === 'warning' ? 'text-amber-400' : 'text-blue-400'}`} />
            <label className="text-sm font-medium text-slate-300">
              室外温度: <span className="text-white font-bold">{input.outdoorTemp}℃</span>
            </label>
          </div>
          <input
            type="range"
            min={-30}
            max={45}
            value={input.outdoorTemp}
            onChange={(e) => setOutdoorTemp(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>-30℃</span>
            <span>45℃</span>
          </div>
          {outdoorTempAlerts.length > 0 && (
            <div className={`mt-2 p-2 rounded text-xs ${outdoorTempAlerts[0].type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
              {outdoorTempAlerts[0].message}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Droplets className={`w-4 h-4 ${getFieldStatus(supplyWaterTempAlerts) === 'warning' ? 'text-amber-400' : 'text-cyan-400'}`} />
            <label className="text-sm font-medium text-slate-300">
              供水温度: <span className="text-white font-bold">{input.supplyWaterTemp}℃</span>
            </label>
          </div>
          <input
            type="range"
            min={20}
            max={65}
            value={input.supplyWaterTemp}
            onChange={(e) => setSupplyWaterTemp(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>20℃</span>
            <span>65℃</span>
          </div>
          {supplyWaterTempAlerts.length > 0 && (
            <div className="mt-2 p-2 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {supplyWaterTempAlerts[0].message}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Home className={`w-4 h-4 ${getFieldStatus(heatLoadAlerts) === 'error' ? 'text-red-400' : getFieldStatus(heatLoadAlerts) === 'warning' ? 'text-amber-400' : 'text-green-400'}`} />
            <label className="text-sm font-medium text-slate-300">
              建筑热负荷: <span className="text-white font-bold">{input.heatLoad} kW</span>
            </label>
          </div>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={input.heatLoad}
            onChange={(e) => setHeatLoad(Number(e.target.value))}
            className={`w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border focus:outline-none transition-colors ${getFieldStatus(heatLoadAlerts) === 'error' ? 'border-red-500' : getFieldStatus(heatLoadAlerts) === 'warning' ? 'border-amber-500' : 'border-slate-600 focus:border-blue-500'}`}
          />
          <div className="mt-1 text-xs text-slate-400">
            建议: 根据建筑面积和保温情况计算
          </div>
          {heatLoadAlerts.length > 0 && (
            <div className={`mt-2 p-2 rounded text-xs ${heatLoadAlerts[0].type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
              {heatLoadAlerts[0].message}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className={`w-4 h-4 ${getFieldStatus(priceAlerts) === 'warning' ? 'text-amber-400' : 'text-yellow-400'}`} />
            <label className="text-sm font-medium text-slate-300">电价方案</label>
          </div>
          <select
            onChange={(e) => {
              const template = electricityTemplates.find(t => t.id === e.target.value);
              if (template) setElectricityPrice(template.prices);
            }}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors mb-2"
          >
            <option value="">选择地区电价模板...</option>
            {electricityTemplates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-400">峰 (元/kWh)</label>
              <input
                type="number"
                step={0.01}
                value={input.electricityPrice.peak}
                onChange={(e) => setElectricityPrice({ ...input.electricityPrice, peak: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm border border-red-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">平 (元/kWh)</label>
              <input
                type="number"
                step={0.01}
                value={input.electricityPrice.flat}
                onChange={(e) => setElectricityPrice({ ...input.electricityPrice, flat: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm border border-slate-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">谷 (元/kWh)</label>
              <input
                type="number"
                step={0.01}
                value={input.electricityPrice.valley}
                onChange={(e) => setElectricityPrice({ ...input.electricityPrice, valley: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm border border-green-500/50 focus:outline-none"
              />
            </div>
          </div>
          {priceAlerts.length > 0 && (
            <div className="mt-2 p-2 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {priceAlerts[0].message}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`w-4 h-4 ${getFieldStatus(hoursAlerts) === 'error' ? 'text-red-400' : getFieldStatus(hoursAlerts) === 'warning' ? 'text-amber-400' : 'text-purple-400'}`} />
            <label className="text-sm font-medium text-slate-300">
              每日运行时间: <span className="text-white font-bold">
                {input.operatingHours.peak + input.operatingHours.valley + input.operatingHours.flat}h
              </span>
            </label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400 w-8">峰时</span>
              <input
                type="range"
                min={0}
                max={24}
                value={input.operatingHours.peak}
                onChange={(e) => setOperatingHours({ ...input.operatingHours, peak: Number(e.target.value) })}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-white w-8 text-right">{input.operatingHours.peak}h</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-8">平时</span>
              <input
                type="range"
                min={0}
                max={24}
                value={input.operatingHours.flat}
                onChange={(e) => setOperatingHours({ ...input.operatingHours, flat: Number(e.target.value) })}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-white w-8 text-right">{input.operatingHours.flat}h</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-400 w-8">谷时</span>
              <input
                type="range"
                min={0}
                max={24}
                value={input.operatingHours.valley}
                onChange={(e) => setOperatingHours({ ...input.operatingHours, valley: Number(e.target.value) })}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-white w-8 text-right">{input.operatingHours.valley}h</span>
            </div>
          </div>
          {hoursAlerts.length > 0 && (
            <div className={`mt-2 p-2 rounded text-xs ${hoursAlerts[0].type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
              {hoursAlerts[0].message}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 2px;
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default ParameterPanel;
