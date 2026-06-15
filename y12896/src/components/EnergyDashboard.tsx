import { Zap, Gauge, ThermometerSun, Droplets, TrendingUp, AlertTriangle } from "lucide-react";
import type { CalcResult, TimelinePoint } from "~/shared/types";

interface Props {
  result?: CalcResult | null;
  current?: TimelinePoint | null;
}

function RingGauge({
  value,
  max,
  color,
  label,
  unit,
  icon,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  unit: string;
  icon: React.ReactNode;
}) {
  const percent = Math.min(100, (value / max) * 100);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference * (1 - percent / 100);
  const textValue =
    max >= 10000 ? (value / 1000).toFixed(1) : value.toFixed(0);
  const textUnit = max >= 10000 ? "k" + unit : unit;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="92" height="92" className="-rotate-90">
        <circle cx="46" cy="46" r="36" stroke="currentColor" strokeWidth="7" fill="none" className="text-ocean-800" />
        <circle
          cx="46"
          cy="46"
          r="36"
          stroke={color}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease-out", filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
        <div className="text-[10px] text-ocean-400 mb-0.5">{icon}</div>
        <div className="font-mono text-xl font-bold text-white leading-none">{textValue}</div>
        <div className="text-[10px] text-ocean-400 mt-0.5">{textUnit}</div>
      </div>
      <div className="mt-2 text-xs text-ocean-200 font-medium">{label}</div>
    </div>
  );
}

export default function EnergyDashboard({ result, current }: Props) {
  const totalEnergy = result?.totalEnergy ?? 0;
  const peakPower = result?.peakPower ?? 0;
  const efficiency = result?.averageEfficiency ?? 0;
  const discardVolume = result?.waterDiscarded.reduce((s, w) => s + w.volume, 0) ?? 0;

  const power = current?.power ?? 0;
  const temp = current?.unitTemp ?? 0;
  const tempOver = current ? temp > 85 : false;
  const tempCritical = current ? temp > 95 : false;

  const alerts = current?.alerts?.length ?? 0;

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-ocean-800/60 to-ocean-900/40 border border-ocean-700/50 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-ocean-100">发电仪表盘</h3>
        {tempCritical && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-tide-shutdown bg-red-950/60 px-3 py-1 rounded-full animate-pulse-slow border border-tide-shutdown/40">
            <AlertTriangle className="w-3 h-3" />
            过热保护
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-5">
        <RingGauge value={totalEnergy} max={10000} color="#00C9A7" label="累计发电" unit="Wh" icon={<Zap className="w-3.5 h-3.5 mx-auto" />} />
        <RingGauge value={power} max={600} color="#FFB703" label="瞬时功率" unit="kW" icon={<Gauge className="w-3.5 h-3.5 mx-auto" />} />
        <RingGauge value={peakPower} max={600} color="#3B82B9" label="峰值功率" unit="kW" icon={<TrendingUp className="w-3.5 h-3.5 mx-auto" />} />
        <RingGauge value={efficiency} max={100} color="#2EC4B6" label="平均效率" unit="%" icon={<Zap className="w-3.5 h-3.5 mx-auto" />} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-ocean-900/60 border border-ocean-700/40 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] text-ocean-400">
              <ThermometerSun className="w-3.5 h-3.5" />
              机组温度
            </div>
            <div className={`font-mono text-sm font-bold ${
              tempCritical ? "text-tide-shutdown animate-pulse" : tempOver ? "text-tide-warning" : "text-ocean-200"
            }`}>
              {temp.toFixed(1)}°C
            </div>
          </div>
          <div className="h-2 rounded-full bg-ocean-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                tempCritical ? "bg-gradient-to-r from-tide-danger to-tide-shutdown" :
                tempOver ? "bg-gradient-to-r from-tide-warning to-tide-danger" :
                "bg-gradient-to-r from-tide-green to-tide-teal"
              }`}
              style={{ width: `${Math.min(100, (temp / 105) * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ocean-500 font-mono">
            <span>40°C</span>
            <span className={tempOver ? "text-tide-warning" : ""}>85°C</span>
            <span className={tempCritical ? "text-tide-shutdown" : ""}>阈值 95°C</span>
          </div>
        </div>

        <div className="rounded-xl bg-ocean-900/60 border border-ocean-700/40 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] text-ocean-400">
              <Droplets className="w-3.5 h-3.5" />
              累计弃水
            </div>
            <div className={`font-mono text-sm font-bold ${
              discardVolume > 0 ? "text-tide-danger" : "text-tide-green"
            }`}>
              {(discardVolume / 1000).toFixed(1)} km³
            </div>
          </div>
          <div className="h-2 rounded-full bg-ocean-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                discardVolume > 0
                  ? "bg-gradient-to-r from-tide-danger/60 to-tide-danger"
                  : "bg-tide-green/50"
              }`}
              style={{ width: `${Math.min(100, (discardVolume / 5_000_000) * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ocean-500 font-mono">
            <span>0</span>
            <span className={alerts > 0 ? "text-tide-warning" : ""}>告警: {alerts}</span>
            <span>500万 m³</span>
          </div>
        </div>
      </div>
    </div>
  );
}
