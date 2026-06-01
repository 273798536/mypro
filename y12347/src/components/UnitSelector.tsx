import { TimeUnit, UNIT_CONVERSIONS } from '../types';
import { useAppStore } from '../store/useAppStore';

export function UnitSelector() {
  const { currentTimeUnit, setTimeUnit } = useAppStore();

  return (
    <div className="flex items-center gap-2">
      <label className="text-lab-muted text-sm">时间单位：</label>
      <div className="flex gap-1">
        {UNIT_CONVERSIONS.map(({ unit, label }) => (
          <button
            key={unit}
            onClick={() => setTimeUnit(unit as TimeUnit)}
            className={`px-3 py-1 text-sm rounded border transition-all duration-200 ${
              currentTimeUnit === unit
                ? 'bg-lab-info border-lab-info text-white'
                : 'bg-transparent border-lab-border text-lab-muted hover:border-lab-info hover:text-lab-text'
            }`}
          >
            {label.split(' ')[1]?.replace(/[()]/g, '') || label}
          </button>
        ))}
      </div>
    </div>
  );
}
