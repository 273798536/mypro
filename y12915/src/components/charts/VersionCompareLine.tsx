import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ErrorBar,
  ReferenceLine,
  Scatter,
  ZAxis,
} from 'recharts';
import type { GroupedCI } from '@/types';

interface Props {
  groups: GroupedCI[];
}

type SigLevel = '***' | '**' | '*' | 'ns';

function getSigBetween(prev: GroupedCI, curr: GroupedCI): SigLevel {
  const overlap = !(curr.ci.lower > prev.ci.upper || prev.ci.lower > curr.ci.upper);
  if (overlap) return 'ns';
  const diff = Math.abs(curr.ci.mean - prev.ci.mean);
  const pooledSE = Math.sqrt(
    Math.pow(curr.ci.std / Math.sqrt(curr.ci.n), 2) +
    Math.pow(prev.ci.std / Math.sqrt(prev.ci.n), 2)
  );
  if (pooledSE === 0) return 'ns';
  const z = diff / pooledSE;
  if (z >= 3.291) return '***';
  if (z >= 2.576) return '**';
  if (z >= 1.96) return '*';
  return 'ns';
}

export default function VersionCompareLine({ groups }: Props) {
  const chartData = groups.map((g) => ({
    name: g.group,
    mean: g.ci.mean,
    lower: g.ci.lower,
    upper: g.ci.upper,
    err: [g.ci.mean - g.ci.lower, g.ci.upper - g.ci.mean],
    n: g.ci.n,
    std: g.ci.std,
    size: 36,
  }));

  const significanceMarks: { x: number; sig: SigLevel; y: number }[] = [];
  groups.forEach((g, idx) => {
    if (idx === 0) return;
    const sig = getSigBetween(groups[idx - 1], g);
    if (sig !== 'ns') {
      const yTop = Math.max(groups[idx - 1].ci.upper, g.ci.upper) + 5;
      significanceMarks.push({
        x: idx - 0.5,
        sig,
        y: Math.min(yTop, 98),
      });
    }
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-800/95 backdrop-blur text-white px-4 py-3 rounded-lg shadow-xl border border-slate-600 text-sm">
          <div className="font-semibold text-sky-300 mb-2 border-b border-slate-600 pb-1.5">
            版本: {d.name}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">均值:</span>
              <span className="font-mono font-bold text-amber-300">{d.mean.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">95% CI:</span>
              <span className="font-mono text-emerald-300">
                [{d.lower.toFixed(2)}, {d.upper.toFixed(2)}]
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">样本数:</span>
              <span className="font-mono text-slate-200">{d.n}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">标准差:</span>
              <span className="font-mono text-slate-200">{d.std.toFixed(3)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const maxUpper = Math.max(...groups.map((g) => g.ci.upper), 60);
  const yDomainMax = Math.min(Math.ceil(maxUpper / 10) * 10 + 10, 100);

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 50, right: 30, left: 10, bottom: 20 }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#0891B2" />
            </linearGradient>
            <linearGradient id="pointGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

          <XAxis
            dataKey="name"
            stroke="#94A3B8"
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            label={{ value: '版本号', position: 'insideBottom', offset: -10, fill: '#94A3B8', fontSize: 13 }}
          />
          <YAxis
            domain={[0, yDomainMax]}
            stroke="#94A3B8"
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            label={{ value: '分数', angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 13 }}
          />
          <ZAxis range={[36, 36]} />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          <Line
            type="monotone"
            dataKey="mean"
            stroke="url(#lineGradient)"
            strokeWidth={3}
            dot={{
              fill: 'url(#pointGradient)',
              stroke: '#1E293B',
              strokeWidth: 2,
              r: 6,
            }}
            activeDot={{
              r: 9,
              fill: '#F59E0B',
              stroke: '#1E293B',
              strokeWidth: 3,
            }}
          >
            <ErrorBar
              dataKey="err"
              direction="y"
              stroke="#A855F7"
              strokeWidth={2}
              width={8}
            />
          </Line>

          {significanceMarks.map((m, idx) => (
            <ReferenceLine
              key={idx}
              segment={[
                { x: chartData[idx].name, y: m.y },
                { x: chartData[idx + 1].name, y: m.y },
              ]}
              stroke="#F43F5E"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          ))}

          <Scatter dataKey="mean" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="absolute top-2 left-0 right-0 pointer-events-none flex justify-around px-12">
        {significanceMarks.map((m, idx) => (
          <div
            key={idx}
            className="text-rose-400 font-bold text-lg"
            style={{
              transform: `translateX(${(m.x - (groups.length - 1) / 2) * (100 / (groups.length - 1))}%)`,
            }}
          >
            {m.sig}
          </div>
        ))}
      </div>
    </div>
  );
}
