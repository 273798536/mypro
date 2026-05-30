import { useGameStore } from "@/store/gameStore";
import { OXYGEN_MAX } from "@/physics/constants";
import {
  Gauge,
  Weight,
  ArrowUpDown,
  Droplets,
  Clock,
  Thermometer,
} from "lucide-react";

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  progress,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  color: string;
  progress?: number;
}) {
  return (
    <div className="bg-[#0a1628]/80 backdrop-blur-sm border border-[#1b4965]/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color }} />
        <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-lg font-mono font-bold"
          style={{ color, fontFamily: "'JetBrains Mono', monospace" }}
        >
          {value}
        </span>
        <span className="text-[10px] text-[#667788]">{unit}</span>
      </div>
      {progress !== undefined && (
        <div className="mt-1.5 h-1.5 bg-[#1a2a3a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.max(0, Math.min(100, progress * 100))}%`,
              backgroundColor: color,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const engine = useGameStore((s) => s.engine);
  const { buoyancy, submarine, ballastTank, environment, treasureChest } = engine;

  const oxygenFrac = environment.oxygenRemaining / OXYGEN_MAX;
  const oxygenColor =
    oxygenFrac > 0.5 ? "#4cd137" : oxygenFrac > 0.2 ? "#ffa500" : "#d8315b";

  const tankFrac = ballastTank.currentWater / ballastTank.maxVolume;

  const netColor =
    Math.abs(buoyancy.netForce) < 500
      ? "#4cd137"
      : buoyancy.netForce > 0
        ? "#3e92cc"
        : "#d8315b";

  return (
    <div className="grid grid-cols-2 gap-2">
      <MetricCard
        icon={Gauge}
        label="浮力"
        value={buoyancy.buoyantForce.toFixed(1)}
        unit="N"
        color="#3e92cc"
      />
      <MetricCard
        icon={Weight}
        label="重力"
        value={buoyancy.gravitationalForce.toFixed(1)}
        unit="N"
        color="#d8315b"
      />
      <MetricCard
        icon={ArrowUpDown}
        label="合力"
        value={buoyancy.netForce.toFixed(1)}
        unit="N"
        color={netColor}
      />
      <MetricCard
        icon={Thermometer}
        label="水密度"
        value={buoyancy.fluidDensity.toFixed(0)}
        unit="kg/m³"
        color="#5dade2"
      />
      <MetricCard
        icon={Droplets}
        label="压载舱"
        value={(tankFrac * 100).toFixed(0)}
        unit="%"
        color="#3498db"
        progress={tankFrac}
      />
      <MetricCard
        icon={Clock}
        label="氧气"
        value={Math.ceil(environment.oxygenRemaining).toString()}
        unit="s"
        color={oxygenColor}
        progress={oxygenFrac}
      />

      <div className="col-span-2 bg-[#0a1628]/80 backdrop-blur-sm border border-[#1b4965]/50 rounded-lg p-3">
        <div className="flex items-center justify-between text-xs text-[#8899aa] mb-1">
          <span>深度</span>
          <span className="font-mono" style={{ color: "#e9b44c", fontFamily: "'JetBrains Mono', monospace" }}>
            {submarine.y.toFixed(1)} m
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-[#8899aa] mb-1">
          <span>总质量</span>
          <span className="font-mono" style={{ color: "#e9b44c", fontFamily: "'JetBrains Mono', monospace" }}>
            {buoyancy.totalMass.toFixed(0)} kg
          </span>
        </div>
        {treasureChest?.collected && (
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-[#e9b44c]">★ 宝箱影响</span>
            <span
              className="font-mono"
              style={{ color: "#e9b44c", fontFamily: "'JetBrains Mono', monospace" }}
            >
              +{buoyancy.treasureImpact.toFixed(1)} N
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
