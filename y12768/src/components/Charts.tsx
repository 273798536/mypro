import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import type { CorrosionTestRecord } from '../types';
import {
  getRatingStats,
  getStatusStats,
  getTrendData
} from '../utils/analysis';

const RATING_COLORS = [
  '#22c55e', '#4ade80', '#86efac', '#a3e635', '#eab308',
  '#f59e0b', '#fb923c', '#f97316', '#ef4444', '#dc2626', '#991b1b'
];

const STATUS_COLORS_MAP: Record<string, string> = {
  pass: '#22c55e',
  fail: '#ef4444',
  pending: '#f59e0b',
  confirmed: '#3b82f6'
};

interface Props {
  records: CorrosionTestRecord[];
}

export function RatingDistributionChart({ records }: Props) {
  const data = getRatingStats(records);

  return (
    <div className="card">
      <div className="card-title">
        腐蚀评级分布
        <span className="card-subtitle">展示所有记录的评级数量分布（0-10级）</span>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="rating"
              label={{ value: '腐蚀评级（级）', position: 'insideBottom', offset: -12 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis label={{ value: '记录数', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any, _name: any, props: any) => [
                `${value} 条（${props?.payload?.rating}级：${props?.payload?.description}）`,
                '数量'
              ]}
            />
            <Bar dataKey="count" name="记录数" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={RATING_COLORS[entry.rating] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function StatusPieChart({ records }: Props) {
  const data = getStatusStats(records).filter(d => d.count > 0);

  return (
    <div className="card">
      <div className="card-title">
        结论状态分布
        <span className="card-subtitle">通过 / 不通过 / 待确认 / 已确认 的占比</span>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="count"
              nameKey="label"
              label={({ label, count, percent }) => `${label}: ${count}条 (${(percent * 100).toFixed(0)}%)`}
              labelLine={{ stroke: '#94a3b8' }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STATUS_COLORS_MAP[entry.status] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} 条`, '记录数']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TrendLineChart({ records }: Props) {
  const data = getTrendData(records);

  return (
    <div className="card">
      <div className="card-title">
        试验趋势图
        <span className="card-subtitle">按日期展示平均评级和通过率变化趋势</span>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: '平均评级', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} label={{ value: '通过率(%)', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="avgRating" name="平均评级" stroke="#1e40af" strokeWidth={2} dot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="passRate" name="通过率(%)" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
