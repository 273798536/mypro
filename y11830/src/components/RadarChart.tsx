import React from 'react';

interface RadarChartProps {
  upstreamRisk: number;
  downstreamRisk: number;
  warningDelayRisk: number;
  size?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({ upstreamRisk, downstreamRisk, warningDelayRisk, size = 200 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.35;
  const angles = [-90, 30, 150];
  const labels = ['溢坝风险', '洪峰风险', '预警延迟'];
  const values = [upstreamRisk, downstreamRisk, warningDelayRisk];

  const point = (angle: number, r: number) => [
    cx + r * Math.cos((angle * Math.PI) / 180),
    cy + r * Math.sin((angle * Math.PI) / 180),
  ];

  const polygon = (radii: number[]) =>
    radii.map((r, i) => point(angles[i], r).join(',')).join(' ');

  const gridLevels = [0.33, 0.66, 1];
  const dataRadii = values.map((v) => maxR * Math.min(v, 100) / 100);
  const avg = values.reduce((a, b) => a + b, 0) / 3;

  const fillColor = avg < 33
    ? `rgba(34,197,94,0.3)`
    : avg < 66
    ? `rgba(245,158,11,0.3)`
    : `rgba(239,68,68,0.3)`;
  const strokeColor = avg < 33
    ? 'rgb(34,197,94)'
    : avg < 66
    ? 'rgb(245,158,11)'
    : 'rgb(239,68,68)';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={polygon(angles.map(() => maxR * level))}
          fill="none"
          stroke="#4b5563"
          strokeWidth={1}
        />
      ))}
      {angles.map((angle, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={point(angle, maxR)[0]}
          y2={point(angle, maxR)[1]}
          stroke="#6b7280"
          strokeWidth={1}
        />
      ))}
      <polygon
        points={polygon(dataRadii)}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
      />
      {angles.map((angle, i) => {
        const [lx, ly] = point(angle, maxR + 16);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fill="#e2e8f0"
          >
            {labels[i]} {values[i]}
          </text>
        );
      })}
    </svg>
  );
};

export default RadarChart;
