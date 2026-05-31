import { useGameStore } from "@/store/gameStore";
import { RISK_COLORS } from "@/engine/ruleEngine";
import type { RiskSlotState, RiskType } from "@/types";
import { ShieldAlert, Coins, Zap } from "lucide-react";

const RISK_ICONS: Record<RiskType, React.ReactNode> = {
  行业集中: <ShieldAlert size={14} />,
  手续费漏扣: <Coins size={14} />,
  恐慌卖出: <Zap size={14} />,
};

function RiskSlot({ slot }: { slot: RiskSlotState }) {
  const color = RISK_COLORS[slot.type];
  const pct = (slot.level / slot.maxLevel) * 100;
  const isActive = slot.level > 0;

  return (
    <div
      className={`relative rounded-lg p-3 border transition-all duration-500 ${
        isActive
          ? "animate-pulse-subtle"
          : ""
      }`}
      style={{
        borderColor: isActive ? `${color}60` : "rgba(255,255,255,0.06)",
        background: isActive
          ? `linear-gradient(135deg, ${color}15, transparent)`
          : "rgba(255,255,255,0.02)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span style={{ color }}>{RISK_ICONS[slot.type]}</span>
          <span className="text-xs font-bold" style={{ color: isActive ? color : "rgba(255,255,255,0.3)" }}>
            {slot.type}
          </span>
        </div>
        <span className="text-[10px] font-mono" style={{ color: isActive ? color : "rgba(255,255,255,0.2)" }}>
          {slot.level}/{slot.maxLevel}
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}90, ${color})`,
            boxShadow: isActive ? `0 0 8px ${color}60` : "none",
          }}
        />
      </div>

      {slot.triggers.length > 0 && (
        <div className="mt-2 space-y-1">
          {slot.triggers.slice(-2).map((t) => (
            <div key={t.id} className="text-[10px] text-white/40 leading-tight">
              <span className="font-mono" style={{ color: `${color}90` }}>{t.roundId}</span>{" "}
              {t.description.slice(0, 20)}...
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RiskSlotPanel() {
  const { riskSlots } = useGameStore();

  return (
    <div className="space-y-3">
      <div className="text-xs text-[#D4A843]/60 font-bold uppercase tracking-wider">风险指标</div>
      {riskSlots.map((slot) => (
        <RiskSlot key={slot.type} slot={slot} />
      ))}
    </div>
  );
}
