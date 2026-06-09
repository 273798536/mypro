import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import type { Draft, DataRow } from '@/types';

export function SpectrumChart({ draft }: { draft: Draft }) {
  const data = draft.dataRows
    .filter((r) => r.xValue !== null)
    .map((r) => ({
      频率: r.xValue,
      原始振幅: r.fftAmplitude ?? 0,
      滤波后: r.filteredAmplitude ?? 0,
    }));

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-serif text-sm font-bold text-slate-800">频谱对比：滤波前 vs 滤波后</h3>
          <p className="text-xs text-slate-500">数据来源与明细表同源</p>
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          {draft.fourierConfig.windowFunction.toUpperCase()} · N={draft.fourierConfig.windowSize}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 15, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="频率" tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: '频率 (Hz)', position: 'insideBottom', offset: -8, fontSize: 11, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: '振幅', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569' }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="原始振幅"
              stroke="#6366f1"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="滤波后"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ErrorDistributionChart({ rows }: { rows: DataRow[] }) {
  const data = rows
    .filter((r) => r.fftAmplitude !== null && r.filteredAmplitude !== null)
    .slice(0, 30)
    .map((r) => ({
      idx: `#${r.index}`,
      误差: Number(((r.fftAmplitude ?? 0) - (r.filteredAmplitude ?? 0)).toFixed(3)),
    }));

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="font-serif text-sm font-bold text-slate-800">误差分布</h3>
        <p className="text-xs text-slate-500">原始振幅 − 滤波后振幅</p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 25, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="idx" tick={{ fontSize: 9, fill: '#64748b' }} angle={-45} textAnchor="end" height={40} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="误差" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.误差 > 20 ? '#dc2626' : entry.误差 > 8 ? '#f59e0b' : '#6366f1'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
