import React, { useEffect, useCallback } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

export default function WindowCountdown() {
  const windowCountdown = useGameStore((s) => s.windowCountdown);
  const setWindowCountdown = useGameStore((s) => s.setWindowCountdown);

  const tick = useCallback(() => {
    if (windowCountdown <= 0) return;
    setWindowCountdown(windowCountdown - 1);
  }, [windowCountdown, setWindowCountdown]);

  useEffect(() => {
    if (windowCountdown <= 0) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const total = 120;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = windowCountdown / total;
  const dashOffset = circumference * (1 - progress);

  let ringColor = '#4fc3f7';
  if (windowCountdown < 10) ringColor = '#ff1744';
  else if (windowCountdown < 30) ringColor = '#ff6d00';

  const isExpired = windowCountdown <= 0;
  const isCritical = windowCountdown < 10 && !isExpired;

  return (
    <div
      className={`flex flex-col items-center gap-2 ${
        isCritical ? 'animate-countdown-pulse' : ''
      }`}
    >
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={6}
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isExpired ? (
            <div className="flex flex-col items-center gap-1">
              <AlertTriangle className="w-5 h-5 text-[#ff1744]" />
              <span className="text-xs text-[#ff1744] font-medium">窗口已关闭</span>
            </div>
          ) : (
            <>
              <span
                className="font-orbitron text-3xl font-bold"
                style={{ color: ringColor }}
              >
                {windowCountdown}
              </span>
              <span className="text-[10px] text-slate-400">秒</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
        <Timer className="w-3.5 h-3.5" />
        <span>发射窗口</span>
      </div>
    </div>
  );
}
