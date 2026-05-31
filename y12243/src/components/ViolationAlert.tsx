import { useGameStore } from '@/store/gameStore';
import { getRuleTypeLabel, getRuleTypeColor, getRuleTypeBg } from '@/utils/ruleEngine';
import { Shield, ShieldAlert, ShieldX } from 'lucide-react';

const ruleIconMap: Record<string, React.ReactNode> = {
  window_rule: <ShieldX className="w-5 h-5 text-red-400" />,
  fuel_settlement: <ShieldAlert className="w-5 h-5 text-orange-400" />,
  orbit_propulsion: <Shield className="w-5 h-5 text-yellow-400" />,
};

export default function ViolationAlert() {
  const currentViolations = useGameStore(s => s.currentViolations);

  if (currentViolations.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        <Shield className="w-5 h-5 text-emerald-400" />
        <span className="text-emerald-400 font-medium">当前无违规</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {currentViolations.map(v => (
        <div
          key={v.id}
          className={`animate-fade-in-up flex items-start gap-3 px-4 py-3 rounded-lg border ${getRuleTypeBg(v.ruleType)}`}
        >
          <div className="mt-0.5 shrink-0">{ruleIconMap[v.ruleType]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-bold ${getRuleTypeColor(v.ruleType)}`}>{v.ruleName}</span>
              <span className="text-xs text-slate-400">{getRuleTypeLabel(v.ruleType)}</span>
            </div>
            <p className="text-sm text-slate-300 mt-1">{v.description}</p>
          </div>
          {v.isOverridden ? (
            <span className="shrink-0 text-xs px-2 py-0.5 rounded bg-slate-600/50 text-slate-400">
              已被覆盖
            </span>
          ) : v.ruleType === 'window_rule' ? (
            <span className="shrink-0 text-xs px-2 py-0.5 rounded bg-red-600/60 text-red-200 animate-pulse-warning">
              不可覆盖
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
