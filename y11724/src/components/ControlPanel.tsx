import { Plane, Battery, Wind, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCalcStore } from '../store/useCalcStore';
import { DRONE_SPECS, BATTERY_SPECS } from '../types';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  icon: React.ReactNode;
  warning?: boolean;
  error?: boolean;
}

function Slider({ label, value, min, max, step, unit, onChange, icon, warning, error }: SliderProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className={`${warning ? 'text-amber-400' : error ? 'text-red-400' : 'text-cyan-400'}`}>
            {icon}
          </span>
          {label}
        </label>
        <span className={`font-mono text-sm ${warning ? 'text-amber-400' : error ? 'text-red-400' : 'text-cyan-300'}`}>
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 
                   [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                   [&::-webkit-slider-thumb]:hover:bg-cyan-300"
      />
      <div className="flex justify-between text-xs text-slate-500 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function ControlPanel() {
  const { params, setParams, result } = useCalcStore();
  const drone = DRONE_SPECS.find(d => d.id === params.droneId) || DRONE_SPECS[0];
  const battery = BATTERY_SPECS.find(b => b.id === params.batteryId) || BATTERY_SPECS[0];

  const hasError = result.warnings.some(w => w.severity === 'error');
  const hasWarning = result.warnings.some(w => w.severity === 'warning');

  const payloadWarning = params.payload > drone.maxPayload * 0.9;
  const payloadError = params.payload > drone.maxPayload;
  const windError = params.windSpeed > drone.cruiseSpeed * 0.5;

  return (
    <div className="h-full flex flex-col bg-slate-900/80 backdrop-blur-sm border-r border-slate-700/50">
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Plane className="w-5 h-5 text-cyan-400" />
          飞行参数设置
        </h2>
        <div className="flex items-center gap-2 mt-2">
          {hasError ? (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertTriangle className="w-3 h-3" />
              存在安全风险
            </span>
          ) : hasWarning ? (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              需注意
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              状态正常
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Plane className="w-4 h-4" />
            设备配置
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-1">无人机型号</label>
            <select
              value={params.droneId}
              onChange={(e) => setParams({ droneId: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {DRONE_SPECS.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">来源: {drone.sourceRef}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-1">电池型号</label>
            <select
              value={params.batteryId}
              onChange={(e) => setParams({ batteryId: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {BATTERY_SPECS.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">来源: {battery.sourceRef}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Battery className="w-4 h-4" />
            载荷设置
          </h3>
          
          <Slider
            label="载重"
            value={params.payload}
            min={0}
            max={drone.maxPayload * 1.2}
            step={0.1}
            unit="kg"
            onChange={(v) => setParams({ payload: v })}
            icon={<Battery className="w-4 h-4" />}
            warning={payloadWarning && !payloadError}
            error={payloadError}
          />
          
          <div className="text-xs text-slate-500">
            最大载重: {drone.maxPayload.toFixed(1)} kg | 空重: {drone.emptyWeight.toFixed(1)} kg
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Wind className="w-4 h-4" />
            环境条件
          </h3>
          
          <Slider
            label="风速"
            value={params.windSpeed}
            min={0}
            max={15}
            step={0.5}
            unit="m/s"
            onChange={(v) => setParams({ windSpeed: v })}
            icon={<Wind className="w-4 h-4" />}
            error={windError}
          />

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-cyan-400"><Wind className="w-4 h-4" /></span>
                风向
              </label>
              <span className="font-mono text-sm text-cyan-300">
                {params.windDirection}°
              </span>
            </div>
            <select
              value={params.windDirection}
              onChange={(e) => setParams({ windDirection: parseInt(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <option value={0}>0° 顺风(正东)</option>
              <option value={90}>90° 侧风(正南)</option>
              <option value={180}>180° 顺风(正西)</option>
              <option value={270}>270° 逆风(正北)</option>
              <option value={45}>45° 东南风</option>
              <option value={135}>135° 西南风</option>
              <option value={225}>225° 西北风</option>
              <option value={315}>315° 东北风</option>
            </select>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            航线设置
          </h3>
          
          <Slider
            label="航线距离"
            value={params.routeDistance}
            min={500}
            max={10000}
            step={100}
            unit="m"
            onChange={(v) => setParams({ routeDistance: v })}
            icon={<MapPin className="w-4 h-4" />}
          />

          <Slider
            label="飞行高度"
            value={params.altitude}
            min={20}
            max={500}
            step={10}
            unit="m"
            onChange={(v) => setParams({ altitude: v })}
            icon={<MapPin className="w-4 h-4" />}
          />

          <Slider
            label="返航余量"
            value={params.returnReserveRatio * 100}
            min={10}
            max={40}
            step={1}
            unit="%"
            onChange={(v) => setParams({ returnReserveRatio: v / 100 })}
            icon={<Battery className="w-4 h-4" />}
            warning={params.returnReserveRatio < 0.25 && params.returnReserveRatio >= 0.2}
            error={params.returnReserveRatio < 0.2}
          />
        </div>
      </div>
    </div>
  );
}
