import type { ShipState, Violation, LevelConfig } from '@/types';

interface DashboardProps {
  shipState: ShipState;
  violations: Violation[];
  config: LevelConfig;
  loadedCount: number;
  totalCargo: number;
}

function buoyancyColor(pct: number): string {
  if (pct > 15) return '#22c55e';
  if (pct > 5) return '#eab308';
  return '#ef4444';
}

function heelColor(ratio: number): string {
  if (ratio < 0.7) return '#22c55e';
  if (ratio < 1) return '#eab308';
  return '#ef4444';
}

function arcPath(cx: number, cy: number, r: number, pct: number): string {
  if (pct <= 0) return '';
  const p = Math.min(pct, 1);
  const endAngle = Math.PI * (1 - p);
  const sx = cx - r;
  const sy = cy;
  const ex = cx + r * Math.cos(endAngle);
  const ey = cy - r * Math.sin(endAngle);
  return `M ${sx} ${sy} A ${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${ex} ${ey}`;
}

function SemiGauge({ pct, color }: { pct: number; color: string }) {
  return (
    <svg viewBox="0 0 120 70" className="w-full">
      <path
        d={arcPath(60, 60, 50, 1)}
        fill="none"
        stroke="#334155"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d={arcPath(60, 60, 50, pct)}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        style={{ transition: 'all 0.5s ease' }}
      />
    </svg>
  );
}

const SEVERITY_STYLE: Record<Violation['severity'], string> = {
  warning: 'text-yellow-400 border-yellow-500/30',
  danger: 'text-orange-400 border-orange-500/30',
  critical: 'text-red-400 border-red-500/30',
};

const RULE_ICON: Record<Violation['rule'], string> = {
  overload: '⚖️',
  gravity_shift: '↔️',
  ballast_omit: '💧',
  draft_exceed: '📏',
};

export default function Dashboard({
  shipState,
  violations,
  config,
  loadedCount,
  totalCargo,
}: DashboardProps) {
  const buoyancyPct =
    shipState.maxDisplacement > 0
      ? (shipState.buoyancyMargin / shipState.maxDisplacement) * 100
      : 100;
  const heelRatio =
    shipState.maxHeelAngle > 0
      ? Math.abs(shipState.currentHeelAngle) / shipState.maxHeelAngle
      : 0;
  const loadPct =
    shipState.maxDisplacement > 0
      ? (shipState.currentDisplacement / shipState.maxDisplacement) * 100
      : 0;
  const progressPct = totalCargo > 0 ? (loadedCount / totalCargo) * 100 : 0;
  const heelDir = shipState.currentHeelAngle >= 0 ? '右舷' : '左舷';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
            浮力余量
          </div>
          <SemiGauge
            pct={Math.min(buoyancyPct / 100, 1)}
            color={buoyancyColor(buoyancyPct)}
          />
          <div className="text-center mt-1">
            <span
              className="text-2xl font-bold font-['Oswald']"
              style={{ color: buoyancyColor(buoyancyPct) }}
            >
              {shipState.buoyancyMargin.toFixed(0)}
            </span>
            <span className="text-sm text-slate-400 ml-1">t</span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
            重心偏移
          </div>
          <SemiGauge pct={Math.min(heelRatio, 1)} color={heelColor(heelRatio)} />
          <div className="text-center mt-1">
            <span
              className="text-2xl font-bold font-['Oswald']"
              style={{ color: heelColor(heelRatio) }}
            >
              {Math.abs(shipState.currentHeelAngle).toFixed(1)}
            </span>
            <span className="text-sm text-slate-400 ml-1">° {heelDir}</span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
            载重比
          </div>
          <div className="mt-6 mb-3">
            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(loadPct, 100)}%`,
                  background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold font-['Oswald'] text-orange-400">
              {loadPct.toFixed(1)}
            </span>
            <span className="text-sm text-slate-400 ml-1">
              % / {shipState.currentDisplacement.toFixed(0)}t
            </span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
            装载进度
          </div>
          <div className="mt-6 mb-3">
            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${progressPct}%`, transition: 'width 0.5s ease' }}
              />
            </div>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold font-['Oswald'] text-blue-400">
              {loadedCount}
            </span>
            <span className="text-sm text-slate-400 ml-1">/ {totalCargo}</span>
          </div>
        </div>
      </div>

      {violations.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {violations.map((v, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-800/80 whitespace-nowrap ${SEVERITY_STYLE[v.severity]}`}
            >
              <span>{RULE_ICON[v.rule]}</span>
              <span className="text-xs">{v.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
