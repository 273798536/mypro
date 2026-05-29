import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

interface CoverageDonutProps {
  coverage: number;
  targetCoverage: number;
  size?: number;
  showLabel?: boolean;
}

export default function CoverageDonut({
  coverage,
  targetCoverage,
  size = 200,
  showLabel = true,
}: CoverageDonutProps) {
  const coveredPercent = coverage * 100;
  const notCoveredPercent = Math.max(0, 100 - coveredPercent);
  const targetPercent = targetCoverage * 100;

  const data = [
    { name: '覆盖', value: coveredPercent, color: '#0F3460' },
    { name: '未覆盖', value: notCoveredPercent, color: '#E2E8F0' },
  ];

  const isAboveTarget = coverage >= targetCoverage;
  const coverageColor = isAboveTarget ? '#16C79A' : '#E94560';

  const renderCustomLabel = () => {
    if (!showLabel) return null;
    return (
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="pointer-events-none"
      >
        <tspan
          x="50%"
          dy="-8"
          className="text-3xl font-bold"
          fill={coverageColor}
        >
          {coveredPercent.toFixed(1)}%
        </tspan>
        <tspan
          x="50%"
          dy="28"
          className="text-xs"
          fill="#94A3B8"
        >
          目标 {targetPercent.toFixed(0)}%
        </tspan>
      </text>
    );
  };

  const targetAngle = (targetCoverage * 360) - 90;
  const targetRadians = (targetAngle * Math.PI) / 180;
  const outerRadius = size / 2 - 10;
  const innerRadius = size / 2 - 30;
  const targetX1 = 50 + (outerRadius - 5) * Math.cos(targetRadians) * 0.5;
  const targetY1 = 50 + (outerRadius - 5) * Math.sin(targetRadians) * 0.5;
  const targetX2 = 50 + (outerRadius + 8) * Math.cos(targetRadians) * 0.5;
  const targetY2 = 50 + (outerRadius + 8) * Math.sin(targetRadians) * 0.5;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={0}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            labelLine={false}
            label={renderCustomLabel}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="none"
              />
            ))}
          </Pie>
          <line
            x1={`${targetX1}%`}
            y1={`${targetY1}%`}
            x2={`${targetX2}%`}
            y2={`${targetY2}%`}
            stroke="#E94560"
            strokeWidth={2}
            strokeDasharray="4,2"
          />
        </PieChart>
      </ResponsiveContainer>

      <div
        className="absolute top-0 right-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: isAboveTarget ? '#DCFCE7' : '#FEE2E2',
          color: isAboveTarget ? '#16A34A' : '#DC2626',
        }}
      >
        {isAboveTarget ? '✓ 达标' : '✗ 未达标'}
      </div>
    </div>
  );
}
