import { useState, useMemo } from 'react';
import {
  Table2,
  Filter,
  ChevronRight,
  Hash,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import useAppStore from '@/store/useAppStore';
import TraceButton from '@/components/common/TraceButton';
import type { EvaluationSample, ReviewStatus, ConfidenceLevel } from '@/types';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/common/StatusBadge';

type DimKey = 'reviewStatus' | 'confidenceLevel' | 'dataSource' | 'imageType' | 'dimension';

const DIMS: { key: DimKey; label: string }[] = [
  { key: 'reviewStatus', label: '复核状态' },
  { key: 'confidenceLevel', label: '置信等级' },
  { key: 'dataSource', label: '数据来源' },
  { key: 'imageType', label: '图片类型' },
  { key: 'dimension', label: '评测维度' },
];

const STATUS_COLORS: Record<ReviewStatus, string> = {
  direct_use: '#10B981',
  need_review: '#F59E0B',
  rejected: '#F43F5E',
  pending: '#64748B',
};

const CONF_COLORS: Record<ConfidenceLevel, string> = {
  high: '#10B981',
  medium: '#F59E0B',
  low: '#F43F5E',
};

function colorFor(dim: DimKey, key: string, idx: number): string {
  if (dim === 'reviewStatus') return STATUS_COLORS[key as ReviewStatus] ?? '#64748B';
  if (dim === 'confidenceLevel') return CONF_COLORS[key as ConfidenceLevel] ?? '#64748B';
  const palette = ['#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];
  return palette[idx % palette.length];
}

export default function DistributionPage() {
  const { currentSamples, showTrace } = useAppStore();
  const [dim, setDim] = useState<DimKey>('reviewStatus');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const aggregated = useMemo(() => {
    const map = new Map<string, {
      key: string;
      count: number;
      samples: EvaluationSample[];
      avgScore: number;
    }>();
    currentSamples.forEach((s) => {
      const k = String((s as any)[dim] ?? '未分类');
      if (!map.has(k)) {
        map.set(k, { key: k, count: 0, samples: [], avgScore: 0 });
      }
      const entry = map.get(k)!;
      entry.count++;
      entry.samples.push(s);
    });
    const arr = Array.from(map.values()).map((e) => ({
      ...e,
      avgScore:
        e.samples.reduce((sum, s) => sum + (s.humanCorrectedScore ?? s.modelScore), 0) /
        (e.samples.length || 1),
    }));
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [currentSamples, dim]);

  const pieData = aggregated.map((a, i) => ({
    name: a.key,
    value: a.count,
    color: colorFor(dim, a.key, i),
  }));

  const barData = aggregated.map((a, i) => ({
    分组: a.key.length > 8 ? a.key.slice(0, 8) + '…' : a.key,
    样本量: a.count,
    平均分: Number(a.avgScore.toFixed(3)),
    color: colorFor(dim, a.key, i),
  }));

  const activeSamples = activeGroup
    ? aggregated.find((a) => a.key === activeGroup)?.samples ?? []
    : [];

  function openTrace(s: EvaluationSample) {
    showTrace(s);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">
            分布统计
          </h1>
          <p className="text-slate-400 text-sm">
            按维度交叉切片，查看样本结构与分数分布；点击分组查看明细并追溯原始材料
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 animate-fade-in stagger-1">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter size={16} />
            <span className="text-sm">统计维度</span>
          </div>
          <div className="inline-flex rounded-lg bg-slate-800 p-1">
            {DIMS.map((d) => (
              <button
                key={d.key}
                onClick={() => {
                  setDim(d.key);
                  setActiveGroup(null);
                }}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm transition-all',
                  dim === d.key
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 animate-fade-in stagger-2">
        {aggregated.slice(0, 5).map((a, i) => {
          const color = colorFor(dim, a.key, i);
          const isActive = activeGroup === a.key;
          return (
            <button
              key={a.key}
              onClick={() => setActiveGroup(isActive ? null : a.key)}
              className={cn(
                'glass-card rounded-xl p-4 text-left transition-all border',
                isActive
                  ? 'scale-[1.02] border-sky-500/60 shadow-lg shadow-sky-500/10'
                  : 'border-transparent hover:border-slate-600'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium text-white truncate">{a.key}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-white tabular-nums">
                  {a.count}
                </span>
                <span className="text-xs text-slate-500">
                  {currentSamples.length === 0
                    ? '0%'
                    : `${((a.count / currentSamples.length) * 100).toFixed(1)}%`}
                </span>
              </div>
              <div className="mt-2 text-xs">
                <span className="text-slate-500">平均分 </span>
                <span className="font-mono text-sky-400 tabular-nums">{a.avgScore.toFixed(3)}</span>
              </div>
              {isActive && (
                <div className="mt-3 text-xs text-sky-400 flex items-center gap-1">
                  <ChevronRight size={12} /> 查看明细
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-5 animate-fade-in stagger-3">
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Hash size={18} className="text-violet-400" />
            构成饼图
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(d: any) =>
                    setActiveGroup(activeGroup === d.name ? null : d.name)
                  }
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      stroke="#1E293B"
                      strokeWidth={2}
                      opacity={activeGroup && activeGroup !== entry.name ? 0.4 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#F1F5F9',
                  }}
                  formatter={(v: any) => [
                    `${v} 条 (${currentSamples.length === 0 ? 0 : ((v / currentSamples.length) * 100).toFixed(1)}%)`,
                    '样本量',
                  ]}
                />
                <Legend
                  wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Table2 size={18} className="text-sky-400" />
            样本量 & 平均分
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="分组" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b"
                  fontSize={10}
                  domain={[0, 1]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#F1F5F9',
                  }}
                />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }} />
                <Bar yAxisId="left" dataKey="样本量" radius={[4, 4, 0, 0]}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={d.color} opacity={0.85} />
                  ))}
                </Bar>
                <Bar
                  yAxisId="right"
                  dataKey="平均分"
                  fill="#8B5CF6"
                  radius={[4, 4, 0, 0]}
                  opacity={0.85}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden animate-fade-in stagger-4">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeGroup ? (
              <>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: colorFor(
                      dim,
                      activeGroup,
                      aggregated.findIndex((a) => a.key === activeGroup)
                    ),
                  }}
                />
                <h2 className="text-lg font-semibold text-white">
                  「{activeGroup}」明细样本
                </h2>
                <span className="text-sm text-slate-500 ml-2">
                  共 {activeSamples.length} 条
                </span>
              </>
            ) : (
              <>
                <Hash size={18} className="text-slate-500" />
                <h2 className="text-lg font-semibold text-slate-400">
                  点击上方分组卡片或图表查看样本明细
                </h2>
              </>
            )}
          </div>
          {activeGroup && (
            <button
              onClick={() => setActiveGroup(null)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              清除筛选
            </button>
          )}
        </div>

        {activeGroup ? (
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 sticky top-0 z-10">
                <tr className="text-slate-400 text-left">
                  <th className="px-4 py-3 font-medium w-16">行号</th>
                  <th className="px-4 py-3 font-medium">图片</th>
                  <th className="px-4 py-3 font-medium w-28">状态</th>
                  <th className="px-4 py-3 font-medium w-28 text-right">模型分</th>
                  <th className="px-4 py-3 font-medium w-28 text-right">修正分</th>
                  <th className="px-4 py-3 font-medium w-28">批次</th>
                  <th className="px-4 py-3 font-medium w-32 text-center">来源追溯</th>
                </tr>
              </thead>
              <tbody>
                {activeSamples.slice(0, 100).map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-slate-700/40 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-sky-400 text-center">
                        #{s.originalRowNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{s.imageName ?? '—'}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {s.sourceFileName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.reviewStatus} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300 tabular-nums">
                      {s.modelScore.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.humanCorrectedScore !== undefined ? (
                        <span className="font-mono font-bold text-emerald-400 tabular-nums">
                          {s.humanCorrectedScore.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {s.batchId}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TraceButton sample={s} onTrace={openTrace} />
                    </td>
                  </tr>
                ))}
                {activeSamples.length > 100 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-4 text-center text-slate-500 text-xs border-t border-slate-700/40"
                    >
                      仅展示前 100 条 · 共 {activeSamples.length} 条
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center text-slate-500">
            👆 选择一个维度分组以查看具体样本列表
          </div>
        )}
      </div>
    </div>
  );
}
