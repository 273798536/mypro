import React from 'react';
import { Play, Pause, RotateCcw, Navigation } from 'lucide-react';
import type { GameEvent } from '../game/types';

interface ControlPanelProps {
  thrust: number;
  angle: number;
  paused: boolean;
  events: GameEvent[];
  onThrustChange: (v: number) => void;
  onAngleChange: (v: number) => void;
  onTogglePause: () => void;
  onRestart: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  thrust,
  angle,
  paused,
  events,
  onThrustChange,
  onAngleChange,
  onTogglePause,
  onRestart,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/80 backdrop-blur rounded-xl p-4 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={onTogglePause}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white py-2 transition-all"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span className="text-sm">{paused ? '继续' : '暂停'}</span>
          </button>
          <button
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white py-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm">重开</span>
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <Navigation className="w-3 h-3 text-orange-400" />
            推力
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={thrust}
            onChange={(e) => onThrustChange(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <Navigation className="w-3 h-3 text-cyan-400" />
            方向
          </div>
          <input
            type="range"
            min={-Math.PI}
            max={Math.PI}
            step={0.01}
            value={angle}
            onChange={(e) => onAngleChange(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
        </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur rounded-xl p-4 max-h-64 overflow-y-auto">
        <div className="text-xs text-slate-400 mb-2">事件日志</div>
        <div className="space-y-1">
          {events.length === 0 ? (
            <div className="text-slate-500 text-xs">暂无事件</div>
          ) : (
            events.slice(-12).reverse().map((e, i) => (
              <div
                key={i}
                className={`text-xs px-2 py-1 rounded ${
                  e.type === 'fuel-low' || e.type === 'collision' || e.type === 'escape'
                    ? 'bg-red-900/50 text-red-300'
                    : e.type === 'target-reached'
                    ? 'bg-emerald-900/50 text-emerald-300'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <span className="font-mono mr-2">[{e.t.toFixed(2)}s]</span>
                {e.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
