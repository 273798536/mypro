import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { CategoryResult, GROUP_LABELS } from '@/types';
import { formatPercent } from '@/utils/statistics';

interface CategoryCoverageChartProps {
  categoryResults: CategoryResult[];
  targetCoverage: number;
  categoryGroups: Map<string, string>;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export default function CategoryCoverageChart({
  categoryResults,
  targetCoverage,
  categoryGroups,
  selectedCategory,
  onSelectCategory,
}: CategoryCoverageChartProps) {
  const getGroupColor = (group: string) => {
    switch (group) {
      case 'hot': return '#E94560';
      case 'cold': return '#64748B';
      default: return '#0F3460';
    }
  };

  const chartData = categoryResults.map(cat => ({
    ...cat,
    coverage: cat.coverage * 100,
    target: targetCoverage * 100,
    group: categoryGroups.get(cat.category) || 'normal',
    groupLabel: GROUP_LABELS[categoryGroups.get(cat.category) as keyof typeof GROUP_LABELS] || '普通品类',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white rounded-lg shadow-lg border border-neutral-200 p-4">
          <p className="font-semibold text-neutral-800 mb-2">{data.category}</p>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between gap-8">
              <span className="text-neutral-500">分组:</span>
              <span className="font-medium" style={{ color: getGroupColor(data.group) }}>
                {data.groupLabel}
              </span>
            </p>
            <p className="flex justify-between gap-8">
              <span className="text-neutral-500">覆盖率:</span>
              <span className="font-medium text-primary">{data.coverage.toFixed(1)}%</span>
            </p>
            <p className="flex justify-between gap-8">
              <span className="text-neutral-500">样本量:</span>
              <span className="font-medium">{data.validSampleSize}</span>
            </p>
            <p className="flex justify-between gap-8">
              <span className="text-neutral-500">低估次数:</span>
              <span className="font-medium text-accent-danger">{data.underCoverageCount}</span>
            </p>
            <p className="flex justify-between gap-8">
              <span className="text-neutral-500">高估次数:</span>
              <span className="font-medium text-accent-warning">{data.overCoverageCount}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
          onClick={(data) => {
            if (data?.activePayload?.[0]) {
              const clicked = data.activePayload[0].payload.category;
              onSelectCategory(clicked === selectedCategory ? null : clicked);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="category"
            angle={-45}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 11, fill: '#64748B' }}
            interval={0}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#64748B' }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
          <ReferenceLine
            y={targetCoverage * 100}
            stroke="#E94560"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: `目标 ${formatPercent(targetCoverage)}`,
              position: 'right',
              fill: '#E94560',
              fontSize: 11,
            }}
          />
          <Bar
            dataKey="coverage"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getGroupColor(entry.group)}
                opacity={selectedCategory && entry.category !== selectedCategory ? 0.3 : 1}
                stroke={entry.category === selectedCategory ? '#0F3460' : 'none'}
                strokeWidth={entry.category === selectedCategory ? 2 : 0}
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
