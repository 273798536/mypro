import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ErrorBar,
  Cell,
  LabelList,
} from 'recharts';
import type { GroupedCI } from '@/types';

interface Props {
  groups: GroupedCI[];
}

type SignificanceLevel = '***' | '**' | '*' | 'ns';

function calcSignificance(
  prev: GroupedCI['ci'],
  curr: GroupedCI['ci']
): { level: SignificanceLevel; isSignificant: boolean } {
  const diff = Math.abs(curr.mean - prev.mean);
  const pooledSE = Math.sqrt(
    Math.pow(curr.std / Math.sqrt(curr.n), 2) + Math.pow(prev.std / Math.sqrt(prev.n), 2)
  );
  if (pooledSE === 0) return { level: 'ns', isSignificant: false };
  const z = diff / pooledSE;
  if (z >= 3.291) return { level: '***', isSignificant: true };
  if (z >= 2.576) return { level: '**', isSignificant: true };
  if (z >= 1.96) return { level: '*', isSignificant: true };
  return { level: 'ns', isSignificant: false };
}

export default function ConfidenceErrorBar({ groups }: Props) {
  const chartData = groups.map((g, idx) => {
    const sig = idx === 0
      ? { level: 'ns' as SignificanceLevel, isSignificant: false }
      : calcSignificance(groups[idx - 1].ci, g.ci);
    const marginOfError = g.ci.upper - g.ci.mean;
    const err = [g.ci.mean - g.ci.lower, g.ci.upper - g.ci.mean];
    return {
      name: g.group,
      mean: g.ci.mean,
      err,
      n: g.ci.n,
      std: g.ci.std,
      lower: g.ci.lower,
      upper: g.ci.upper,
      marginOfError,
      significance: sig.level,
      isSignificant: sig.isSignificant,
      fill: sig.isSignificant ? '#0891B2' : '#64748B',
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-800/95 backdrop-blur text-white px-4 py-3 rounded-lg shadow-xl border border-slate-600 text-sm min-w-[220px]">
          <div className="font-semibold text-sky-300 mb-2 border-b border-slate-600 pb-1.5">{d.name}</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">均值:</span>
              <span className="font-mono font-bold text-amber-300">{d.mean.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">样本数 (n):</span>
              <span className="font-mono text-slate-200">{d.n}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">标准差 (σ):</span>
              <span className="font-mono text-slate-200">{d.std.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">95% CI 下界:</span>
              <span className="font-mono text-emerald-300">{d.lower.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">95% CI 上界:</span>
              <span className="font-mono text-emerald-300">{d.upper.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 mt-1 border-t border-slate-600">
              <span className="text-slate-400">Margin of Error:</span>
              <span className="font-mono text-purple-300">±{d.marginOfError.toFixed(2)}</span>
            </div>
            {d.significance !== 'ns' && (
              <div className="flex justify-between">
                <span className="text-slate-400">显著性:</span>
                <span className="font-bold text-rose-400">{d.significance}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 40, right: 30, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#94A3B8"
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#94A3B8"
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            label={{ value: '分数', angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 13 }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Bar
            dataKey="mean"
            radius={[6, 6, 0, 0]}
            barSize={48}
          >
            <ErrorBar
              dataKey="err"
              direction="y"
              stroke="#E2E8F0"
              strokeWidth={2}
              width={10}
            />
            {chartData.map((d, idx) => (
              <Cell key={idx} fill={d.fill} />
            ))}
            <LabelList
              dataKey="significance"
              position="top"
              offset={12}
              fill="#F43F5E"
              fontWeight="bold"
              fontSize={16}
              formatter={(val: string) => (val === 'ns' ? '' : val)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
