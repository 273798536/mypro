import { useState } from 'react';
import type { BallastTank } from '@/types';

interface BallastControlProps {
  tanks: BallastTank[];
  onAdjust: (tankId: string, amount: number, isRetroactive?: boolean) => void;
  submitted: boolean;
}

export default function BallastControl({ tanks, onAdjust, submitted }: BallastControlProps) {
  const [retroactive, setRetroactive] = useState(false);

  const portTanks = tanks.filter((t) => t.side === 'port');
  const starboardTanks = tanks.filter((t) => t.side === 'starboard');

  const tankLabel = (tank: BallastTank) => {
    const prefix = tank.side === 'port' ? '左舷' : '右舷';
    const index = (tank.side === 'port' ? portTanks : starboardTanks).indexOf(tank) + 1;
    return `${prefix} ${index}号舱`;
  };

  const handleAdjust = (tankId: string, amount: number) => {
    onAdjust(tankId, amount, retroactive);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-orange-400 text-xs font-bold uppercase tracking-wider">压载水控制</h3>
        <button
          onClick={() => setRetroactive(!retroactive)}
          disabled={submitted}
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all ${
            retroactive
              ? 'bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)] ring-1 ring-amber-500/50'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          } ${submitted ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-3 w-3 rounded-full transition-all ${
              retroactive ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]' : 'bg-slate-500'
            }`}
          />
          补录模式
        </button>
      </div>

      {([['port', '左舷', portTanks], ['starboard', '右舷', starboardTanks]] as const).map(
        ([side, label, sideTanks]) => (
          <div key={side}>
            <h4 className="text-orange-400/80 mb-2 text-[10px] font-semibold uppercase tracking-widest">
              {label}
            </h4>
            <div className="space-y-2">
              {sideTanks.map((tank) => {
                const fillPct = Math.min((tank.current / tank.capacity) * 100, 100);
                return (
                  <div key={tank.id} className="bg-slate-800 rounded-lg p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-300">{tankLabel(tank)}</span>
                      <span className="text-[10px] text-slate-500">
                        当前: {tank.current}吨 / 最大: {tank.capacity}吨
                      </span>
                    </div>

                    <div className="bg-blue-500/30 mb-2 h-4 w-full overflow-hidden rounded">
                      <div
                        className="bg-blue-500 h-full rounded transition-all duration-500"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAdjust(tank.id, 100)}
                        disabled={submitted}
                        className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1 text-sm text-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +100吨
                      </button>
                      <button
                        onClick={() => handleAdjust(tank.id, 50)}
                        disabled={submitted}
                        className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1 text-sm text-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +50吨
                      </button>
                      <button
                        onClick={() => handleAdjust(tank.id, -50)}
                        disabled={submitted}
                        className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1 text-sm text-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        -50吨
                      </button>
                      <button
                        onClick={() => handleAdjust(tank.id, -100)}
                        disabled={submitted}
                        className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1 text-sm text-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        -100吨
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
