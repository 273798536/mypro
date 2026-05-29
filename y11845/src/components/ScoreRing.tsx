import { useEffect, useState } from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
  label?: string;
  showAnimation?: boolean;
}

export default function ScoreRing({
  score,
  size = 120,
  label,
  showAnimation = true,
}: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(showAnimation ? 0 : score);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const offset = circumference - progress;

  useEffect(() => {
    if (!showAnimation) {
      setAnimatedScore(score);
      return;
    }

    let start = 0;
    const duration = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      start = Math.round(eased * score);
      setAnimatedScore(start);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, showAnimation]);

  const getColor = (s: number) => {
    if (s >= 80) return '#10B981';
    if (s >= 60) return '#F59E0B';
    if (s >= 40) return '#F97316';
    return '#EF4444';
  };

  const color = getColor(animatedScore);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{ filter: `drop-shadow(0 0 6px ${color}33)` }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(100,116,139,0.2)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-100"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {animatedScore}
          </span>
          <span className="text-xs text-slate-400">分</span>
        </div>
      </div>
      {label && <span className="text-xs text-slate-400">{label}</span>}
    </div>
  );
}
