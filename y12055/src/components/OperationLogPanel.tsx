import { useGameStore } from "@/store/gameStore";
import { AlertTriangle, Droplets, Wind, Move, Gem } from "lucide-react";

const opIcons: Record<string, React.ElementType> = {
  BALLAST_FILL: Droplets,
  BALLAST_DRAIN: Wind,
  MOVE_LEFT: Move,
  MOVE_RIGHT: Move,
  MOVE_UP: Move,
  MOVE_DOWN: Move,
  COLLECT_TREASURE: Gem,
  DENSITY_ZONE_ENTER: AlertTriangle,
  DENSITY_ZONE_EXIT: AlertTriangle,
};

const opColors: Record<string, string> = {
  BALLAST_FILL: "#3e92cc",
  BALLAST_DRAIN: "#5dade2",
  MOVE_LEFT: "#8899aa",
  MOVE_RIGHT: "#8899aa",
  MOVE_UP: "#8899aa",
  MOVE_DOWN: "#8899aa",
  COLLECT_TREASURE: "#e9b44c",
  DENSITY_ZONE_ENTER: "#ffa500",
  DENSITY_ZONE_EXIT: "#ffa500",
};

const opLabels: Record<string, string> = {
  BALLAST_FILL: "注水",
  BALLAST_DRAIN: "排水",
  MOVE_LEFT: "左移",
  MOVE_RIGHT: "右移",
  MOVE_UP: "上浮",
  MOVE_DOWN: "下潜",
  COLLECT_TREASURE: "收集宝箱",
  DENSITY_ZONE_ENTER: "进入密度突变区",
  DENSITY_ZONE_EXIT: "离开密度突变区",
  TICK: "时间推进",
};

export default function OperationLogPanel() {
  const session = useGameStore((s) => s.session);

  if (!session) return null;

  const ops = session.operations.slice(-20);

  return (
    <div className="bg-[#0a1628]/80 backdrop-blur-sm border border-[#1b4965]/50 rounded-lg p-3">
      <h3
        className="text-[10px] text-[#8899aa] uppercase tracking-wider mb-2"
        style={{ fontFamily: "'Orbitron', monospace" }}
      >
        操作日志
      </h3>
      <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {ops.length === 0 && (
          <div className="text-[10px] text-[#556677] text-center py-4">
            暂无操作记录
          </div>
        )}
        {ops.map((op, i) => {
          const Icon = opIcons[op.operation] || Move;
          const color = opColors[op.operation] || "#8899aa";
          const label = opLabels[op.operation] || op.operation;
          const calc = session.calculations.find(
            (c) => c.id === op.buoyancyCalculationId
          );

          return (
            <div
              key={`${op.id}-${i}`}
              className={`flex items-start gap-2 p-1.5 rounded text-[10px] ${
                op.treasureAffected
                  ? "bg-[#2a1f0a] border border-[#e9b44c]/20"
                  : "bg-[#0d1f33]"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <Icon size={12} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span style={{ color }} className="font-bold">
                    {label}
                  </span>
                  <span className="text-[#556677]">F#{op.frame}</span>
                  {op.treasureAffected && (
                    <span className="text-[#e9b44c] text-[9px]">★宝箱</span>
                  )}
                </div>
                <div className="text-[#778899] mt-0.5">{op.description}</div>
                {calc && (
                  <div className="text-[#556677] mt-0.5 font-mono">
                    F浮={calc.buoyantForce.toFixed(1)}N F合=
                    <span
                      style={{
                        color:
                          Math.abs(calc.netForce) < 500
                            ? "#4cd137"
                            : calc.netForce > 0
                              ? "#3e92cc"
                              : "#d8315b",
                      }}
                    >
                      {calc.netForce.toFixed(1)}N
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
