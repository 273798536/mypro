import React from 'react';

interface RadarChartProps {
  data: Array<{
    name: string;
    scores: { price: number; energyConsumption: number; afterSales: number; deliveryPeriod: number };
    eliminated: boolean;
    hasAnomaly: boolean;
  }>;
  size?: number;
}

const AXES = [
  { key: 'price' as const, label: '价格', angle: -Math.PI / 2 },
  { key: 'energyConsumption' as const, label: '能耗', angle: 0 },
  { key: 'afterSales' as const, label: '售后', angle: Math.PI / 2 },
  { key: 'deliveryPeriod' as const, label: '交付期', angle: Math.PI },
];

const PALETTE = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'];

const RadarChart: React.FC<RadarChartProps> = ({ data, size = 400 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.35;

  const pt = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const polyStr = (scores: RadarChartProps['data'][number]['scores']) =>
    AXES.map(a => { const p = pt(a.angle, (scores[a.key] / 100) * maxR); return `${p.x},${p.y}`; }).join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size + 40}`} width="100%" style={{ maxWidth: size }}>
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={AXES.map(a => { const p = pt(a.angle, maxR * level); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="#e2e8f0"
        />
      ))}

      {AXES.map(a => {
        const p = pt(a.angle, maxR);
        return <line key={a.key} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" />;
      })}

      {AXES.map(a => {
        const p = pt(a.angle, maxR + 16);
        return (
          <text key={a.key} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#475569">
            {a.label}
          </text>
        );
      })}

      {data.map((item, i) => {
        const color = item.hasAnomaly ? '#ef4444' : PALETTE[i % PALETTE.length];
        return (
          <g key={item.name}>
            <polygon
              points={polyStr(item.scores)}
              fill={color}
              fillOpacity={item.eliminated ? 0.1 : 0.15}
              stroke={color}
              strokeWidth={2}
              strokeOpacity={item.eliminated ? 0.4 : 1}
              strokeDasharray={item.eliminated ? '6 4' : undefined}
            />
            {AXES.map(a => {
              if (item.scores[a.key] === 0 && !item.eliminated) {
                const p = pt(a.angle, maxR);
                return <circle key={a.key} cx={p.x} cy={p.y} r={3} fill="#ef4444" />;
              }
              return null;
            })}
            {(() => {
              const labelPt = pt(AXES[0].angle, (item.scores[AXES[0].key] / 100) * maxR);
              return (
                <text x={labelPt.x} y={labelPt.y - 8} textAnchor="middle" fontSize={10} fill={color}>
                  {item.name}
                </text>
              );
            })()}
          </g>
        );
      })}

      <g transform={`translate(0, ${size + 10})`}>
        {data.map((item, i) => {
          const color = item.hasAnomaly ? '#ef4444' : PALETTE[i % PALETTE.length];
          return (
            <g key={item.name} transform={`translate(${(i % 3) * (size / 3)}, ${Math.floor(i / 3) * 16})`}>
              <rect width={10} height={10} fill={color} opacity={0.7} />
              <text x={14} y={9} fontSize={11} fill="#475569">{item.name}{item.eliminated ? ' (已淘汰)' : ''}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default RadarChart;
