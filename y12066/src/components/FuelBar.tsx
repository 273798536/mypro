import { useGameStore } from '@/store/gameStore';

export default function FuelBar() {
  const { fuel, maxFuel } = useGameStore(s => s.spacecraft);
  const pct = Math.max(0, Math.min(100, (fuel / maxFuel) * 100));
  const isCritical = pct < 30;

  const fillColor = pct > 50 ? '#22c55e' : pct > 30 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center w-12 h-full gap-1">
      <span className="font-body text-xs text-white/70">燃料</span>

      <div className="relative w-8 flex-1 bg-space-800 border border-white/10 rounded-sm overflow-hidden">
        <div
          className="absolute bottom-0 left-0 w-full transition-all duration-500"
          style={{
            height: `${pct}%`,
            background: `linear-gradient(to top, ${fillColor}, ${fillColor}dd)`,
          }}
        >
          {pct > 20 && (
            <div
              className="absolute top-0 left-0 right-0 h-2"
              style={{
                background: `linear-gradient(to bottom, ${fillColor}88, transparent)`,
              }}
            />
          )}
        </div>

        {isCritical && (
          <div
            className="absolute inset-0 animate-fuel-flash rounded-sm"
            style={{ backgroundColor: `${fillColor}22` }}
          />
        )}

        <div
          className="absolute left-0 right-0 h-px bg-white/20"
          style={{ bottom: '50%' }}
        />
        <div
          className="absolute left-0 right-0 h-px bg-white/10"
          style={{ bottom: '30%' }}
        />
      </div>

      <div className="flex flex-col items-center">
        <span
          className="font-display text-xs leading-none"
          style={{ color: fillColor }}
        >
          {Math.round(pct)}%
        </span>
        <span className="font-display text-[10px] text-white/50 leading-none mt-0.5">
          {fuel.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
