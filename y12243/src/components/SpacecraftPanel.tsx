import { useGameStore } from '@/store/gameStore';
import type { Spacecraft } from '@/types';
import { Rocket, Fuel, Orbit, ChevronRight } from 'lucide-react';

const statusConfig: Record<Spacecraft['status'], { label: string; className: string }> = {
  in_orbit: { label: '在轨', className: 'bg-orbit-green/20 text-orbit-green' },
  de_orbit: { label: '离轨', className: 'bg-warning-red/20 text-warning-red' },
  window_standby: { label: '窗口待命', className: 'bg-star-blue/20 text-star-blue' },
};

function getFuelColor(ratio: number) {
  if (ratio < 0.5) return 'bg-orbit-green';
  if (ratio < 0.8) return 'bg-engine-orange';
  return 'bg-warning-red';
}

export default function SpacecraftPanel() {
  const spacecraft = useGameStore((s) => s.spacecraft);
  const selectedSpacecraftId = useGameStore((s) => s.selectedSpacecraftId);
  const selectSpacecraft = useGameStore((s) => s.selectSpacecraft);
  const getOrbitRingsBySpacecraft = useGameStore((s) => s.getOrbitRingsBySpacecraft);

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto">
      {spacecraft.map((sc) => {
        const isSelected = selectedSpacecraftId === sc.id;
        const ratio = sc.fuelBudget > 0 ? sc.fuelUsed / sc.fuelBudget : 0;
        const status = statusConfig[sc.status];
        const assignedRings = getOrbitRingsBySpacecraft(sc.id);

        return (
          <div
            key={sc.id}
            onClick={() => selectSpacecraft(sc.id)}
            className={`relative rounded-lg border p-3 cursor-pointer transition-all duration-200 bg-space-panel
              ${isSelected ? 'border-star-blue shadow-[0_0_12px_rgba(59,130,246,0.4)]' : 'border-space-border hover:border-star-blue/40'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Rocket size={16} className="text-star-blue" />
                <span className="font-orbitron text-sm text-white">{sc.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                  {status.label}
                </span>
                <ChevronRight size={14} className="text-gray-500" />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Fuel size={14} className="text-engine-orange" />
              <div className="flex-1 h-1.5 rounded-full bg-deep-space">
                <div
                  className={`h-full rounded-full transition-all ${getFuelColor(ratio)}`}
                  style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">
                {sc.fuelUsed}/{sc.fuelBudget}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Orbit size={14} className="text-star-blue" />
              <span className="text-xs text-gray-300">轨道数: {sc.orbitCount}</span>
            </div>

            {assignedRings.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {assignedRings.map((ring) => (
                  <span
                    key={ring.id}
                    className="text-xs px-1.5 py-0.5 rounded bg-star-blue/10 text-star-blue border border-star-blue/20"
                  >
                    {ring.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
