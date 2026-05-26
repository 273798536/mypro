import { useWaterStore } from '@/store/useWaterStore';
import { Gauge } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function PressureGauge() {
  const { segments, selectedSegmentId, pressureThreshold } = useWaterStore();
  const [displayPressure, setDisplayPressure] = useState(0);

  const selectedSegment = segments.find(s => s.id === selectedSegmentId);
  const targetPressure = selectedSegment?.currentPressure ?? 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayPressure(prev => {
        const diff = targetPressure - prev;
        if (Math.abs(diff) < 0.001) return targetPressure;
        return prev + diff * 0.1;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [targetPressure]);

  const minPressure = 0;
  const maxPressure = 0.6;
  const angle = ((displayPressure - minPressure) / (maxPressure - minPressure)) * 270 - 135;

  const isLow = displayPressure < pressureThreshold && displayPressure >= 0;
  const isBad = displayPressure < 0;
  const isNormal = displayPressure >= pressureThreshold;

  const needleColor = isBad ? '#FF4444' : isLow ? '#FF6B6B' : '#00FF88';
  const gaugeColor = isBad ? 'border-red-500' : isLow ? 'border-amber-500' : 'border-emerald-500';

  return (
    <div className="p-4 border border-slate-700/50 rounded-lg bg-slate-900/50">
      <div className="flex items-center gap-2 mb-3">
        <Gauge size={16} className="text-cyan-400" />
        <span className="text-sm text-slate-300">压力监测</span>
      </div>

      <div className="relative w-full aspect-square max-w-48 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#1e3a5c" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={needleColor} strokeWidth="6"
            strokeDasharray="198 264"
            transform="rotate(135 50 50)"
            className="transition-all duration-300"
          />

          {[0, 0.15, 0.3, 0.45, 0.6].map((val, i) => {
            const a = ((val - minPressure) / (maxPressure - minPressure)) * 270 - 135;
            const rad = (a * Math.PI) / 180;
            const x1 = 50 + Math.cos(rad) * 32;
            const y1 = 50 + Math.sin(rad) * 32;
            const x2 = 50 + Math.cos(rad) * 38;
            const y2 = 50 + Math.sin(rad) * 38;
            const tx = 50 + Math.cos(rad) * 26;
            const ty = 50 + Math.sin(rad) * 26;
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="1" />
                <text x={tx} y={ty} fill="#64748b" fontSize="6" textAnchor="middle" dominantBaseline="middle">
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}

          <line
            x1="50" y1="50"
            x2={50 + Math.cos((angle * Math.PI) / 180) * 30}
            y2={50 + Math.sin((angle * Math.PI) / 180) * 30}
            stroke={needleColor} strokeWidth="2" strokeLinecap="round"
            className="transition-all duration-100"
          />
          <circle cx="50" cy="50" r="4" fill={needleColor} />
        </svg>

        <div className="absolute bottom-4 left-0 right-0 text-center">
          <div className={`text-2xl font-mono font-bold ${isBad ? 'text-red-400 animate-pulse' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
            {displayPressure < 0 ? '异常' : displayPressure.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500">MPa</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-500" />
          <span className="text-slate-400">低压 {`< ${pressureThreshold.toFixed(2)}`}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-emerald-500" />
          <span className="text-slate-400">正常</span>
        </div>
      </div>
    </div>
  );
}
