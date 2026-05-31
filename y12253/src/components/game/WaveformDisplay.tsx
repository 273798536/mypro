import React from 'react';

interface WaveformDisplayProps {
  data: number[];
  color?: string;
  label?: string;
  height?: number;
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  data,
  color = '#00d4ff',
  label,
  height = 80
}) => {
  const maxValue = Math.max(...data, 0.1);
  const normalizedData = data.map(v => v / maxValue);

  const pathData = normalizedData.reduce((acc, value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - value * 90;
    return acc + (index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  }, '');

  const areaData = pathData + ` L 100 100 L 0 100 Z`;

  return (
    <div className="waveform-container rounded-lg p-3">
      {label && (
        <div className="text-xs text-tech-cyan-500 mb-2 font-mono">{label}</div>
      )}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} className="w-full">
        <defs>
          <linearGradient id={`waveGrad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={areaData}
          fill={`url(#waveGrad-${color.replace('#', '')})`}
        />
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[0, 25, 50, 75, 100].map(tick => (
          <line
            key={tick}
            x1={tick}
            y1="0"
            x2={tick}
            y2="100"
            stroke={color}
            strokeOpacity="0.1"
            strokeWidth="0.5"
          />
        ))}
      </svg>
    </div>
  );
};

export default WaveformDisplay;
