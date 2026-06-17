import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ReviewStatus } from '@/types';

interface StatusCounts {
  direct_use: number;
  need_review: number;
  rejected: number;
  pending: number;
}

interface Props {
  counts: StatusCounts;
}

const COLORS: Record<ReviewStatus, string> = {
  direct_use: '#10B981',
  need_review: '#F59E0B',
  rejected: '#F43F5E',
  pending: '#64748B',
};

const EMOJI: Record<ReviewStatus, string> = {
  direct_use: '✅',
  need_review: '⚠️',
  rejected: '❌',
  pending: '🔄',
};

const LABELS: Record<ReviewStatus, string> = {
  direct_use: '直接可用',
  need_review: '需复核',
  rejected: '不合格',
  pending: '需补测',
};

export default function StatusPieChart({ counts }: Props) {
  const entries: ReviewStatus[] = ['direct_use', 'need_review', 'rejected', 'pending'];
  const total = entries.reduce((sum, k) => sum + counts[k], 0);

  const data = entries.map((k) => ({
    name: k,
    label: LABELS[k],
    value: counts[k],
    percent: total > 0 ? (counts[k] / total) * 100 : 0,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-800/95 backdrop-blur text-white px-4 py-3 rounded-lg shadow-xl border border-slate-600 text-sm">
          <div className="font-semibold mb-1.5 flex items-center gap-2" style={{ color: COLORS[d.name as ReviewStatus] }}>
            <span>{EMOJI[d.name as ReviewStatus]}</span>
            <span>{d.label}</span>
          </div>
          <div className="text-slate-200">
            数量: <span className="font-mono font-bold text-amber-300">{d.value}</span>
          </div>
          <div className="text-slate-200">
            占比: <span className="font-mono font-bold text-sky-300">{d.percent.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-2">
        {payload.map((entry: any, idx: number) => {
          const status = entry.dataKey as ReviewStatus;
          const d = data[idx];
          return (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span className="text-base">{EMOJI[status]}</span>
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-300">{LABELS[status]}</span>
              <span className="font-mono text-slate-400">
                {d.value} ({d.percent.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const RADIAN = Math.PI / 180;
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-bold"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius="80%"
              innerRadius="55%"
              paddingAngle={2}
              dataKey="value"
              stroke="#1E293B"
              strokeWidth={2}
            >
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={COLORS[entry.name as ReviewStatus]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              content={renderLegend}
              verticalAlign="bottom"
              align="center"
              iconSize={10}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-3xl font-bold text-white font-mono">{total}</div>
            <div className="text-xs text-slate-400 mt-0.5">总数</div>
          </div>
        </div>
      </div>
    </div>
  );
}
