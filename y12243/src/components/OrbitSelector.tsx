import { useGameStore } from '@/store/gameStore';
import { Circle, Zap, Clock, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OrbitSelector() {
  const orbitRings = useGameStore(s => s.orbitRings);
  const spacecraft = useGameStore(s => s.spacecraft);
  const selectedSpacecraftId = useGameStore(s => s.selectedSpacecraftId);
  const selectedOrbitRingId = useGameStore(s => s.selectedOrbitRingId);
  const selectOrbitRing = useGameStore(s => s.selectOrbitRing);
  const assignOrbit = useGameStore(s => s.assignOrbit);

  const handleRingClick = (ringId: string) => {
    const ring = orbitRings.find(r => r.id === ringId);
    if (!ring || ring.isAssigned) return;

    selectOrbitRing(ringId);

    if (!selectedSpacecraftId) return;
    assignOrbit(selectedSpacecraftId, ringId);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="font-orbitron text-star-blue text-lg mb-4 tracking-wider">轨道环选择</h2>

      {!selectedSpacecraftId && (
        <div className="mb-3 px-3 py-2 rounded bg-warning-red/10 border border-warning-red/30 text-warning-red text-sm text-center">
          请先选择航天器
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto scrollbar-thin">
        {orbitRings.map(ring => {
          const isAssigned = ring.isAssigned;
          const isSelected = selectedOrbitRingId === ring.id;
          const assignedSc = isAssigned ? spacecraft.find(s => s.id === ring.assignedTo) : null;

          return (
            <div
              key={ring.id}
              onClick={() => handleRingClick(ring.id)}
              className={cn(
                'relative rounded-lg border p-3 transition-all duration-200 cursor-pointer',
                'bg-space-panel',
                isAssigned
                  ? 'border-orbit-green/60'
                  : isSelected
                    ? 'border-star-blue shadow-[0_0_12px_rgba(79,195,247,0.4)]'
                    : 'border-space-border hover:border-star-blue/60 hover:shadow-[0_0_8px_rgba(79,195,247,0.2)]',
              )}
            >
              <div className="font-orbitron text-sm text-white mb-2 truncate">{ring.name}</div>

              <div className="space-y-1.5 text-xs text-gray-400 mb-3">
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className="text-engine-orange" />
                  <span>燃料 <span className="text-engine-orange">{ring.fuelCost}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowRight size={12} className="text-star-blue" />
                  <span>推力 <span className="text-star-blue">+{ring.thrustGain}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-late-blue" />
                  <span>窗口 {ring.windowOpen}-{ring.windowClose}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle size={12} className="text-gray-500" />
                  <span>高度 {ring.altitude.toLocaleString()} km</span>
                </div>
              </div>

              <div className="flex justify-center mb-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 animate-orbit-spin',
                    isAssigned ? 'border-orbit-green/70 shadow-[0_0_8px_rgba(0,230,118,0.3)]' : 'border-star-blue/40 shadow-[0_0_6px_rgba(79,195,247,0.15)]',
                  )}
                />
              </div>

              {isAssigned && assignedSc && (
                <div className="flex items-center justify-center gap-1 text-xs text-orbit-green">
                  <Check size={12} />
                  <span className="truncate">{assignedSc.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
