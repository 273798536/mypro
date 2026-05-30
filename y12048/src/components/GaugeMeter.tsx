import React from 'react';
import { cn } from '@/lib/utils';

interface GaugeMeterProps {
  value: number;
  max: number;
  threshold: number;
  size?: number;
}

export const GaugeMeter: React.FC<GaugeMeterProps> = ({
  value,
  max,
  threshold,
  size = 180,
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const thresholdPercentage = (threshold / max) * 100;
  
  const getColor = () => {
    if (value <= threshold) return '#ef4444';
    if (value <= threshold * 1.1) return '#f97316';
    if (value <= threshold * 1.3) return '#fbbf24';
    return '#10b981';
  };

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const thresholdOffset = circumference - (thresholdPercentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size / 2 + 20 }}>
      <svg
        width={size}
        height={size / 2 + 20}
        className="transform"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference / 2}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
        
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={Math.max(strokeDashoffset, circumference / 2)}
          strokeLinecap="round"
          className="transition-all duration-500"
          style={{
            filter: `drop-shadow(0 0 8px ${getColor()}40)`,
          }}
        />
        
        <circle
          cx={size / 2 + radius * Math.cos(Math.PI - (thresholdPercentage / 100) * Math.PI)}
          cy={size / 2 - radius * Math.sin(Math.PI - (thresholdPercentage / 100) * Math.PI)}
          r={4}
          fill="#ef4444"
          className="animate-pulse"
        />
        
        <line
          x1={size / 2}
          y1={size / 2}
          x2={size / 2 + (radius - strokeWidth) * Math.cos(Math.PI - (percentage / 100) * Math.PI)}
          y2={size / 2 - (radius - strokeWidth) * Math.sin(Math.PI - (percentage / 100) * Math.PI)}
          stroke={getColor()}
          strokeWidth={2}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      
      <div className="absolute flex flex-col items-center" style={{ bottom: 10 }}>
        <span className={cn(
          'text-2xl font-bold font-mono transition-colors duration-300',
          value <= threshold ? 'text-red-400 animate-pulse' : 
          value <= threshold * 1.1 ? 'text-orange-400' : 
          value <= threshold * 1.3 ? 'text-yellow-400' : 'text-emerald-400'
        )}>
          {value.toFixed(1)}%
        </span>
        <span className="text-xs text-slate-400">清算线 {threshold}%</span>
      </div>
    </div>
  );
};
