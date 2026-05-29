import React from 'react';

interface GateControlProps {
  selectedGate: number;
  upstreamLevel: number;
  onSelect: (gate: number) => void;
  disabled: boolean;
}

const options = [0, 25, 50, 75, 100];

export default function GateControl({ selectedGate, upstreamLevel, onSelect, disabled }: GateControlProps) {
  const flow = (selectedGate / 100) * 15 * Math.max(upstreamLevel - 20, 0);

  return (
    <div className="rounded-2xl bg-slate-800 p-4 space-y-3">
      <span className="text-sm font-medium text-slate-300">闸门开度</span>
      <div className="flex gap-1 rounded-xl bg-slate-900 p-1">
        {options.map((opt) => {
          const active = selectedGate === opt;
          return (
            <button
              key={opt}
              disabled={disabled}
              onClick={() => onSelect(opt)}
              className={`flex flex-1 flex-col items-center rounded-lg py-2 transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`text-xs ${active ? 'font-bold' : ''}`}>{opt}%</span>
              <div className="mt-1 h-3 w-8 overflow-hidden rounded-sm bg-slate-900/40">
                <div
                  className="h-full bg-current transition-all"
                  style={{ width: `${opt}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 text-center">
        预估下泄流量: {flow.toFixed(1)} m³/s
      </p>
    </div>
  );
}
