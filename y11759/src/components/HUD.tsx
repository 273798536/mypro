import React from 'react';
import { Gauge, Zap, Timer, Fuel, CircleDot } from 'lucide-react';
import type { EngineSnapshot } from '../game/engine';
import type { Level } from '../game/types';
import { getLevel } from '../game/levels';

interface HUDProps {
  snapshot: EngineSnapshot;
  levelId: string;
}

const HUD: React.FC<HUDProps> = ({ snapshot, levelId }) => {
  const level = getLevel(levelId);
  const speed = Math.sqrt(snapshot.vx ** 2 + snapshot.vy ** 2);
  const fuelPercent = level ? (snapshot.fuel / level.fuelBudget) * 100 : 0;
  const isLow = fuelPercent < 15;

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-xl p-4 space-y-3 text-white">
      <div className="flex items-center gap-2">
        <CircleDot className="w-4 h-4 text-violet-400" />
        <span className="text-xs text-slate-300">时间</span>
        <span className="ml-auto font-mono text-sm">{snapshot.t.toFixed(2)} s</span>
      </div>
      <div className="flex items-center gap-2">
        <Gauge className="w-4 h-4 text-cyan-400" />
        <span className="text-xs text-slate-300">速度</span>
        <span className="ml-auto font-mono text-sm">{speed.toFixed(1)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-orange-400" />
        <span className="text-xs text-slate-300">推力</span>
        <span className="ml-auto font-mono text-sm">{(snapshot.thrust * 100).toFixed(0)}%</span>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Fuel className={`w-4 h-4 ${isLow ? 'text-red-400' : 'text-emerald-400'}`} />
          <span className="text-xs text-slate-300">燃料</span>
          <span className="ml-auto font-mono text-xs">{snapshot.fuel.toFixed(1)}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
          <div
            className={`h-full transition-all ${isLow ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}
            style={{ width: `${Math.max(0, fuelPercent)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default HUD;
