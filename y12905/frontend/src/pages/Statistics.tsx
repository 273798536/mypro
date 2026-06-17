import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import {
  usePromptVersions, useDistribution, useViolations, useTrend,
} from '../api/hooks';
import { parseError } from '../api/client';
import ActionableError from '../components/ActionableError';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Statistics() {
  const pvQ = usePromptVersions();
  const versions = pvQ.data ?? [];
  const [pvId, setPvId] = useState<number | null>(versions[0]?.id ?? null);
  const [metric, setMetric] = useState<'score' | 'status'>('score');

  if (versions.length > 0 && pvId == null) setPvId(versions[0].id);

  const distQ = useDistribution(pvId, metric);
  const violQ = useViolations(pvId);
  const trendQ = useTrend(versions.slice(0, 6).map(v => v.id));

  const pieData = useMemo(() => (violQ.data ?? []).map(d => ({ ...d, name: d.rule_id, value: d.count })), [violQ.data]);
  const trendData = useMemo(() => (trendQ.data ?? []).map(d => ({
    version: d.version_tag,
    平均评分: Number(d.metric.toFixed(2)),
    通过率: Number(((d.metric_pass_rate ?? 0) * 100).toFixed(1)),
  })), [trendQ.data]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">📈 分布统计</h1>
        <p className="text-xs text-text-secondary mt-1">评分分布、安全违规分布、多版本质量趋势，支持对照判断版本迭代成效</p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary p-3">
        <span className="text-xs text-text-secondary mr-1">分析版本:</span>
        <select
          value={pvId ?? ''}
          onChange={e => setPvId(Number(e.target.value))}
          className="bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-xs font-mono"
        >
          {versions.map(v => <option key={v.id} value={v.id}>{v.version_tag} · {v.change_log}</option>)}
        </select>
        <div className="ml-2 flex gap-1.5">
          <button
            onClick={() => setMetric('score')}
            className={`px-3 py-1.5 rounded text-xs border ${metric === 'score' ? 'border-accent bg-accent/15 text-accent' : 'border-border text-text-secondary'}`}
          >⭐ 评分分布</button>
          <button
            onClick={() => setMetric('status')}
            className={`px-3 py-1.5 rounded text-xs border ${metric === 'status' ? 'border-accent bg-accent/15 text-accent' : 'border-border text-text-secondary'}`}
          >✅ PASS/FAIL 分布</button>
        </div>
      </div>

      {pvQ.isError && <ActionableError error={parseError(pvQ.error)} onRetry={() => pvQ.refetch()} />}
      {distQ.isError && <ActionableError error={parseError(distQ.error)} onRetry={() => distQ.refetch()} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <div className="text-sm font-semibold mb-2">{metric === 'score' ? '⭐ 评分分布直方图' : '✅ 评测结果分布'}</div>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <BarChart data={distQ.data ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#374151" />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#374151" />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#f3f4f6' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <div className="text-sm font-semibold mb-2">🛡️ 安全违规类型分布（按规则 ID）</div>
          <div className="h-[280px]">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-xs">该版本无安全违规 ✅</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData} dataKey="value" nameKey="name"
                    outerRadius={90} innerRadius={55}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#4b5563' }}
                  >
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#f3f4f6' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg-secondary p-4">
        <div className="text-sm font-semibold mb-2">📈 多版本质量趋势曲线（按版本创建时间）</div>
        <div className="h-[320px]">
          <ResponsiveContainer>
            <LineChart data={trendData} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="version" tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#374151" />
              <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#374151" domain={[0, 5]} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#374151" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Line yAxisId="left" type="monotone" dataKey="平均评分" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
              <Line yAxisId="right" type="monotone" dataKey="通过率" stroke="#10b981" strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
