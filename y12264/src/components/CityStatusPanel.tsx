import { motion } from 'framer-motion';
import { AlertTriangle, Droplets, Leaf, Gauge } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import {
  getPumpStatusLevel,
  getLowWaterStatusLevel,
  getGreenStatusLevel,
  statusLevelColors,
  statusLevelBgColors,
  PUMP_WARNING,
  PUMP_DANGER,
  LOW_WATER_WARNING,
  LOW_WATER_DANGER,
  GREEN_WARNING,
  GREEN_DANGER,
} from '../types/city';
import { calculateInflow, calculateCapacitySummary } from '../engine/storageCalculator';

export function CityStatusPanel() {
  const { city, activeRainfall, playedCardsThisRound, replayMode, stateHistory, replayIndex } = useGameStore();

  const displayCity = replayMode && stateHistory[replayIndex]
    ? stateHistory[replayIndex].city
    : city;

  const displayRainfall = replayMode && stateHistory[replayIndex]
    ? stateHistory[replayIndex].activeRainfall
    : activeRainfall;

  const pumpLevel = getPumpStatusLevel(displayCity.pumpLoad);
  const waterLevel = getLowWaterStatusLevel(displayCity.lowWater);
  const greenLevel = getGreenStatusLevel(displayCity.greenCapacity);

  const inflow = calculateInflow(displayRainfall);
  const capacity = calculateCapacitySummary(playedCardsThisRound);

  const GaugeComponent = ({
    label,
    value,
    max,
    warning,
    danger,
    level,
    unit,
    reverse,
    icon: Icon,
  }: {
    label: string;
    value: number;
    max: number;
    warning: number;
    danger: number;
    level: 'normal' | 'warning' | 'danger';
    unit: string;
    reverse?: boolean;
    icon: typeof Gauge;
  }) => {
    const percentage = reverse ? ((max - value) / max) * 100 : (value / max) * 100;
    const displayPercentage = Math.min(100, Math.max(0, percentage));
    const isPulse = level === 'danger';

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`p-5 rounded-xl border ${statusLevelBgColors[level]} ${isPulse ? 'animate-pulse' : ''}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon size={20} className={statusLevelColors[level]} />
            <span className="text-slate-300 font-medium">{label}</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${statusLevelBgColors[level]} ${statusLevelColors[level]} border`}>
            {level === 'normal' ? '正常' : level === 'warning' ? '预警' : '危险'}
          </span>
        </div>

        <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden mb-2">
          <div
            className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-full ${
              level === 'normal'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                : level === 'warning'
                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                : 'bg-gradient-to-r from-red-600 to-red-400'
            }`}
            style={{ width: `${displayPercentage}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-slate-500"
            style={{ left: `${(warning / max) * 100}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500"
            style={{ left: `${(danger / max) * 100}%` }}
          />
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className={`text-3xl font-bold font-mono ${statusLevelColors[level]}`}>
              {value.toFixed(1)}
            </span>
            <span className="text-slate-500 text-sm ml-1">{unit}</span>
          </div>
          <div className="text-xs text-slate-500">
            上限 {max}{unit}
          </div>
        </div>

        {isPulse && (
          <div className="mt-2 flex items-center gap-1 text-red-400 text-xs">
            <AlertTriangle size={12} />
            <span>阈值已突破，请立即处置！</span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Droplets size={18} className="text-cyan-400" />
            实时雨情
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">当前降雨</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">
              {displayRainfall}
              <span className="text-sm text-slate-500 ml-1">mm/h</span>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">预计汇入</div>
            <div className="text-2xl font-bold text-blue-400 font-mono">
              {inflow.toFixed(0)}
              <span className="text-sm text-slate-500 ml-1">m³</span>
            </div>
          </div>
        </div>

        {playedCardsThisRound.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="text-xs text-slate-400 mb-2">本回合已调度能力</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-orange-900/30 rounded px-2 py-1.5 text-center">
                <div className="text-orange-400 font-mono">{capacity.pipeline}</div>
                <div className="text-slate-500">管网 m³</div>
              </div>
              <div className="bg-yellow-900/30 rounded px-2 py-1.5 text-center">
                <div className="text-yellow-400 font-mono">{capacity.disposal}</div>
                <div className="text-slate-500">处置 m³</div>
              </div>
              <div className="bg-emerald-900/30 rounded px-2 py-1.5 text-center">
                <div className="text-emerald-400 font-mono">{capacity.garden}</div>
                <div className="text-slate-500">绿地 m³</div>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="text-slate-400 text-xs">总处理能力：</span>
              <span className="text-cyan-400 font-bold font-mono">{capacity.total} m³</span>
              <span className={`ml-2 text-xs ${capacity.total >= inflow ? 'text-emerald-400' : 'text-red-400'}`}>
                {capacity.total >= inflow ? '✓ 可消纳' : '✗ 不足'}
              </span>
            </div>
          </div>
        )}
      </div>

      <GaugeComponent
        label="泵站负载率"
        value={displayCity.pumpLoad}
        max={100}
        warning={PUMP_WARNING}
        danger={PUMP_DANGER}
        level={pumpLevel}
        unit="%"
        icon={Gauge}
      />

      <GaugeComponent
        label="低洼积水深度"
        value={displayCity.lowWater}
        max={300}
        warning={LOW_WATER_WARNING}
        danger={LOW_WATER_DANGER}
        level={waterLevel}
        unit="mm"
        icon={Droplets}
      />

      <GaugeComponent
        label="绿地剩余容量"
        value={displayCity.greenCapacity}
        max={100}
        warning={100 - GREEN_WARNING}
        danger={100 - GREEN_DANGER}
        level={greenLevel}
        unit="%"
        reverse
        icon={Leaf}
      />

      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50">
        <div className="text-xs text-slate-400 mb-2">累计蓄水量</div>
        <div className="text-3xl font-bold text-purple-400 font-mono">
          {displayCity.totalStorage.toFixed(0)}
          <span className="text-sm text-slate-500 ml-1">m³</span>
        </div>
      </div>
    </div>
  );
}
