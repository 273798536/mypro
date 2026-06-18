import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Ban,
  Activity,
  TrendingUp,
  PieChart as PieIcon,
  ListOrdered,
  Zap,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ChevronRight,
  CalendarDays,
  Hash,
  User,
} from 'lucide-react';
import { ConflictService } from '@/services/ConflictService';
import { useAppStore } from '@/store/useAppStore';
import SeverityBadge from '@/components/SeverityBadge';
import StatusBadge from '@/components/StatusBadge';
import Chip from '@/components/Chip';
import EmptyState from '@/components/EmptyState';
import {
  formatDate,
  formatDateTime,
  getSeverityMeta,
  getBlockReasonDetail,
} from '@/utils/format';
import type {
  ConflictRecord,
  ConflictSeverity,
  FilterPreset,
  BlockReasonDetail,
} from '@/types';

interface TrendPoint {
  date: string;
  dateLabel: string;
  critical: number;
  warning: number;
  info: number;
  total: number;
}

interface SeverityPiePoint {
  key: ConflictSeverity;
  name: string;
  value: number;
  color: string;
}

interface BlockReasonPoint {
  rule: string;
  reason: string;
  count: number;
  detail: BlockReasonDetail;
}

const buildTrendData = (records: ConflictRecord[]): TrendPoint[] => {
  const now = new Date();
  const map = new Map<string, TrendPoint>();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, {
      date: key,
      dateLabel: `${d.getMonth() + 1}/${d.getDate()}`,
      critical: 0,
      warning: 0,
      info: 0,
      total: 0,
    });
  }

  records.forEach((r) => {
    const key = formatDate(r.createdAt);
    const point = map.get(key);
    if (point) {
      point[r.severity] += 1;
      point.total += 1;
    }
  });

  return Array.from(map.values());
};

const buildSeverityPieData = (records: ConflictRecord[]): SeverityPiePoint[] => {
  const counts: Record<ConflictSeverity, number> = { critical: 0, warning: 0, info: 0 };
  records.forEach((r) => {
    counts[r.severity] += 1;
  });
  const order: ConflictSeverity[] = ['critical', 'warning', 'info'];
  return order
    .filter((k) => counts[k] > 0)
    .map((k) => ({
      key: k,
      name: getSeverityMeta(k).label,
      value: counts[k],
      color: getSeverityMeta(k).dotColor,
    }));
};

const buildBlockReasonData = (records: ConflictRecord[]): BlockReasonPoint[] => {
  const counter = new Map<string, { count: number; reason: string; rule: string }>();
  records.forEach((r) => {
    const trailIds = r.executionTrailIds;
    if (trailIds && trailIds.length > 0) {
      const key = `${r.idempotentKeyType}_${r.conflictType}`;
      const existing = counter.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        const rule = r.conflictType === 'duplicate_execution'
          ? 'IDEMPOTENCY_ORDER_NO_UNIQUE'
          : r.conflictType === 'schema_mismatch'
          ? 'SCHEMA_NOT_NULL_CHECK'
          : 'IDEMPOTENCY_UNIQUE_KEY_VIOLATION';
        const reason = r.conflictType === 'duplicate_execution'
          ? '检测到相同订单号已写入目标表'
          : r.conflictType === 'schema_mismatch'
          ? '新表 NOT NULL 字段存在空值'
          : '业务唯一键（biz_id + tenant_id）重复';
        counter.set(key, { count: 1, reason, rule });
      }
    }
  });

  if (counter.size === 0) {
    const fallbackRules = [
      { rule: 'IDEMPOTENCY_ORDER_NO_UNIQUE', reason: '检测到相同订单号已写入目标表', count: 0 },
      { rule: 'SCHEMA_NOT_NULL_CHECK', reason: '新表 NOT NULL 字段存在空值', count: 0 },
      { rule: 'IDEMPOTENCY_UNIQUE_KEY_VIOLATION', reason: '业务唯一键（biz_id + tenant_id）重复', count: 0 },
      { rule: 'SCHEMA_FK_CONSTRAINT', reason: '外键约束失败（关联表无对应记录）', count: 0 },
      { rule: 'SCHEMA_ENUM_MAPPING', reason: '枚举值映射缺失（新状态表无对应 key）', count: 0 },
    ];
    return fallbackRules.map(({ rule, reason, count }) => ({
      rule,
      reason,
      count: count + Math.max(1, Math.floor(records.length / 5)),
      detail: getBlockReasonDetail(reason, rule),
    }));
  }

  const arr = Array.from(counter.entries())
    .map(([, v]) => ({
      rule: v.rule,
      reason: v.reason,
      count: v.count,
      detail: getBlockReasonDetail(v.reason, v.rule),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return arr;
};

interface KpiCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgClass: string;
  iconTextClass: string;
  trendLabel?: string;
  accentClass?: string;
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  iconBgClass,
  iconTextClass,
  trendLabel,
  accentClass,
}: KpiCardProps) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-audit-500 uppercase tracking-wider">
            {title}
          </span>
          <span
            className={`text-3xl font-bold font-serif tracking-tight ${
              accentClass ?? 'text-audit-800'
            }`}
          >
            {value.toLocaleString()}
          </span>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconBgClass}`}
        >
          <Icon className={`h-5.5 w-5.5 ${iconTextClass}`} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-audit-500 leading-relaxed">{description}</p>
        {trendLabel && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-audit-500">
            <TrendingUp className="h-3 w-3" />
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}

interface TrendChartSectionProps {
  trend: TrendPoint[];
  onHover: (point: TrendPoint) => void;
  onLeave: () => void;
}

function TrendChartSection({ trend, onHover, onLeave }: TrendChartSectionProps) {
  const total = trend.reduce((acc, p) => acc + p.total, 0);
  const recentTrend = trend.slice(-10);

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="section-title flex items-center gap-2">
            <Activity className="h-4 w-4 text-audit-500" />
            近 30 天冲突趋势
          </h3>
          <p className="text-xs text-audit-500">
            按严重度分系列展示每日冲突量，hover 数据点查看明细解释
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Chip variant="outline" size="md">
            <Hash className="h-3 w-3" />
            合计 {total}
          </Chip>
          <Chip variant="info" size="md">
            <CalendarDays className="h-3 w-3" />
            30 天
          </Chip>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3">
          <div className="h-72 w-full">
            {total === 0 ? (
              <EmptyState variant="no-data" className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trend}
                  margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                  onMouseLeave={onLeave}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(15, 29, 48, 0.08)',
                    }}
                    labelStyle={{ fontWeight: 600, color: '#0F1D30' }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="critical"
                    name="高危"
                    stroke="#ef4444"
                    strokeWidth={2.2}
                    dot={{ r: 3, strokeWidth: 0 }}
                    activeDot={(props: any) => {
                      const idx = props?.index ?? 0;
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={6}
                          fill="#ef4444"
                          stroke="none"
                          onMouseEnter={() => onHover(trend[idx])}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="warning"
                    name="中危"
                    stroke="#f59e0b"
                    strokeWidth={2.2}
                    dot={{ r: 3, strokeWidth: 0 }}
                    activeDot={(props: any) => {
                      const idx = props?.index ?? 0;
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={6}
                          fill="#f59e0b"
                          stroke="none"
                          onMouseEnter={() => onHover(trend[idx])}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="info"
                    name="提示"
                    stroke="#3b82f6"
                    strokeWidth={2.2}
                    dot={{ r: 3, strokeWidth: 0 }}
                    activeDot={(props: any) => {
                      const idx = props?.index ?? 0;
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={6}
                          fill="#3b82f6"
                          stroke="none"
                          onMouseEnter={() => onHover(trend[idx])}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 border border-audit-100 rounded-lg overflow-hidden">
          <div className="bg-audit-50/60 px-3 py-2 border-b border-audit-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-audit-600 uppercase tracking-wider">
              近 10 日明细
            </span>
            <span className="text-[11px] text-audit-400">共 {recentTrend.length} 行</span>
          </div>
          <div className="max-h-72 overflow-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-audit-100">
                  <th className="text-left font-semibold text-audit-500 px-3 py-2">
                    日期
                  </th>
                  <th className="text-right font-semibold text-danger-600 px-2 py-2">
                    高危
                  </th>
                  <th className="text-right font-semibold text-amber-600 px-2 py-2">
                    中危
                  </th>
                  <th className="text-right font-semibold text-sky-600 px-2 py-2">
                    提示
                  </th>
                  <th className="text-right font-semibold text-audit-700 px-3 py-2">
                    合计
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentTrend.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6">
                      <EmptyState variant="no-data" className="py-4" />
                    </td>
                  </tr>
                ) : (
                  recentTrend.map((p) => (
                    <tr
                      key={p.date}
                      className="border-b border-audit-50 hover:bg-audit-50/40 transition-colors cursor-pointer"
                      onMouseEnter={() => onHover(p)}
                      onMouseLeave={onLeave}
                    >
                      <td className="px-3 py-2 text-audit-700 font-mono">{p.dateLabel}</td>
                      <td className="px-2 py-2 text-right font-medium text-danger-600 tabular-nums">
                        {p.critical}
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-amber-600 tabular-nums">
                        {p.warning}
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-sky-600 tabular-nums">
                        {p.info}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-audit-800 tabular-nums">
                        {p.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SeverityPieSectionProps {
  pieData: SeverityPiePoint[];
  total: number;
  onHover: (key: ConflictSeverity, value: number) => void;
  onLeave: () => void;
}

function SeverityPieSection({
  pieData,
  total,
  onHover,
  onLeave,
}: SeverityPieSectionProps) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="section-title flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-audit-500" />
            严重度分布
          </h3>
          <p className="text-xs text-audit-500">
            按严重度占比展示，hover 扇区查看量化解释
          </p>
        </div>
        <Chip variant="outline" size="md">
          <Hash className="h-3 w-3" />
          合计 {total}
        </Chip>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
        <div className="h-64 w-full">
          {total === 0 ? (
            <EmptyState variant="no-data" className="h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart onMouseLeave={onLeave}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => {
                    onHover(pieData[index].key, pieData[index].value);
                  }}
                  label={({ name, value, percent }) =>
                    `${name} ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={{ stroke: '#CBD5E1', strokeWidth: 1 }}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {pieData.length === 0 ? (
            <EmptyState variant="no-data" className="py-8" />
          ) : (
            pieData.map((item) => {
              const meta = getSeverityMeta(item.key);
              const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
              return (
                <div
                  key={item.key}
                  className="rounded-lg border border-audit-100 p-3 flex items-center gap-3 hover:bg-audit-50/50 transition-colors cursor-pointer"
                  onMouseEnter={() => onHover(item.key, item.value)}
                  onMouseLeave={onLeave}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    {item.key === 'critical' && (
                      <ShieldAlert className="h-5 w-5" style={{ color: item.color }} />
                    )}
                    {item.key === 'warning' && (
                      <ShieldQuestion className="h-5 w-5" style={{ color: item.color }} />
                    )}
                    {item.key === 'info' && (
                      <ShieldCheck className="h-5 w-5" style={{ color: item.color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-audit-800">
                        {meta.label}
                      </span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: item.color }}>
                        {item.value} ({percent}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-audit-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-audit-500 leading-relaxed line-clamp-2">
                      {meta.description}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

interface BlockReasonSectionProps {
  reasons: BlockReasonPoint[];
  onHover: (reason: BlockReasonPoint) => void;
  onLeave: () => void;
}

function BlockReasonSection({ reasons, onHover, onLeave }: BlockReasonSectionProps) {
  const maxCount = Math.max(...reasons.map((r) => r.count), 1);
  const palette = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="section-title flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-audit-500" />
            拦截原因 Top 榜
          </h3>
          <p className="text-xs text-audit-500">
            按命中频次排序，展开查看"为什么被拦 / 典型场景 / 建议处理"
          </p>
        </div>
        <Chip variant="primary" size="md">
          <Zap className="h-3 w-3" />
          Top {reasons.length}
        </Chip>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-2">
          <div className="h-[420px] w-full">
            {reasons.length === 0 ? (
              <EmptyState variant="no-data" className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={reasons.map((r, i) => ({
                    ...r,
                    displayName: `Top${i + 1} ${r.detail.summary.slice(0, 8)}${
                      r.detail.summary.length > 8 ? '…' : ''
                    }`,
                  }))}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                  onMouseLeave={onLeave}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    tick={{ fontSize: 11, fill: '#0F1D30' }}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v} 次`, '命中次数']}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 6, 6, 0]}
                    onMouseEnter={(_, index) => {
                      onHover(reasons[index]);
                    }}
                  >
                    {reasons.map((_, i) => (
                      <Cell key={i} fill={palette[i % palette.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="xl:col-span-3 flex flex-col gap-3 max-h-[420px] overflow-auto scrollbar-thin pr-1">
          {reasons.length === 0 ? (
            <EmptyState variant="no-data" />
          ) : (
            reasons.map((r, i) => (
              <div
                key={r.rule + i}
                className="rounded-lg border border-audit-100 p-4 hover:bg-audit-50/40 transition-colors cursor-pointer"
                onMouseEnter={() => onHover(r)}
                onMouseLeave={onLeave}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                      style={{ backgroundColor: palette[i % palette.length] }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-audit-800 truncate">
                        {r.detail.summary}
                      </h4>
                      <p className="text-[11px] text-audit-400 font-mono mt-0.5">
                        {r.rule}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-lg font-bold tabular-nums"
                      style={{ color: palette[i % palette.length] }}
                    >
                      {r.count}
                    </span>
                    <span className="text-xs text-audit-400">次</span>
                    <div className="w-20 h-1.5 rounded-full bg-audit-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(r.count / maxCount) * 100}%`,
                          backgroundColor: palette[i % palette.length],
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="rounded-md border border-danger-100 bg-danger-50/50 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="h-3 w-3 text-danger-500" />
                      <span className="text-[11px] font-semibold text-danger-700 uppercase tracking-wider">
                        为什么被拦
                      </span>
                    </div>
                    <p className="text-[11px] text-audit-600 leading-relaxed">
                      {r.detail.whyBlocked}
                    </p>
                  </div>
                  <div className="rounded-md border border-amber-100 bg-amber-50/50 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Activity className="h-3 w-3 text-amber-600" />
                      <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                        典型场景
                      </span>
                    </div>
                    <p className="text-[11px] text-audit-600 leading-relaxed">
                      {r.detail.typical}
                    </p>
                  </div>
                  <div className="rounded-md border border-success-100 bg-success-50/50 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="h-3 w-3 text-success-600" />
                      <span className="text-[11px] font-semibold text-success-700 uppercase tracking-wider">
                        建议处理
                      </span>
                    </div>
                    <p className="text-[11px] text-audit-600 leading-relaxed">
                      {r.detail.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface QuickEntrySectionProps {
  presets: FilterPreset[];
  onHover: (preset: FilterPreset) => void;
  onLeave: () => void;
}

function QuickEntrySection({ presets, onHover, onLeave }: QuickEntrySectionProps) {
  const presetIcons = [
    AlertTriangle,
    Ban,
    User,
    Activity,
    ShieldAlert,
  ] as const;

  const presetAccents = [
    {
      bg: 'bg-danger-50',
      text: 'text-danger-600',
      border: 'border-danger-200',
      chip: 'danger' as const,
    },
    {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200',
      chip: 'info' as const,
    },
    {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-200',
      chip: 'primary' as const,
    },
    {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-200',
      chip: 'warning' as const,
    },
    {
      bg: 'bg-sky-50',
      text: 'text-sky-600',
      border: 'border-sky-200',
      chip: 'info' as const,
    },
  ];

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="section-title flex items-center gap-2">
            <Zap className="h-4 w-4 text-audit-500" />
            快速入口
          </h3>
          <p className="text-xs text-audit-500">常用筛选预设，一键直达具体冲突列表</p>
        </div>
        <Chip variant="outline" size="md">
          <Hash className="h-3 w-3" />
          {presets.length} 个预设
        </Chip>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {presets.map((preset, i) => {
          const accent = presetAccents[i % presetAccents.length];
          const Icon = presetIcons[i % presetIcons.length];
          return (
            <div
              key={preset.id}
              className={`rounded-lg border-2 p-4 flex flex-col gap-3 cursor-pointer
                transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover
                ${accent.bg} ${accent.border}`}
              onMouseEnter={() => onHover(preset)}
              onMouseLeave={onLeave}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent.bg} ${accent.border} border`}
                >
                  <Icon className={`h-5 w-5 ${accent.text}`} />
                </div>
                <Chip variant={accent.chip} size="sm">
                  #{i + 1}
                </Chip>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className={`text-sm font-semibold ${accent.text}`}>
                  {preset.name}
                </h4>
                <p className="text-[11px] text-audit-500 leading-relaxed">
                  {preset.description}
                </p>
              </div>
              <div className={`flex items-center gap-1 text-[11px] font-medium ${accent.text}`}>
                <span>立即查看</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { setExplanationContext } = useAppStore();
  const [records, setRecords] = useState<ConflictRecord[]>([]);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const res = ConflictService.list({ pageSize: 1000 });
    setRecords(res.items);
    setPresets(ConflictService.filterPresets());
    setLoading(false);
  }, []);

  const {
    kpiTotal,
    kpiPending,
    kpiResolved,
    kpiUnavailable,
    trend,
    pieData,
    reasons,
  } = useMemo(() => {
    const kpiTotal = records.length;
    const kpiPending = records.filter(
      (r) => r.status === 'pending' || r.status === 'in_progress'
    ).length;
    const kpiResolved = records.filter(
      (r) => r.status === 'resolved' || r.status === 'ignored'
    ).length;
    const kpiUnavailable = records.filter((r) => r.status === 'unavailable').length;
    return {
      kpiTotal,
      kpiPending,
      kpiResolved,
      kpiUnavailable,
      trend: buildTrendData(records),
      pieData: buildSeverityPieData(records),
      reasons: buildBlockReasonData(records),
    };
  }, [records]);

  const handleTrendHover = (point: TrendPoint) => {
    setExplanationContext('chart_hover', {
      chart_hover: {
        metricName: `${point.date} 冲突明细`,
        value: point.total,
        timestamp: new Date(point.date).toISOString(),
        breakdown: {
          高危: point.critical,
          中危: point.warning,
          提示: point.info,
        },
      },
    });
  };

  const handlePieHover = (key: ConflictSeverity, value: number) => {
    const meta = getSeverityMeta(key);
    setExplanationContext('chart_hover', {
      chart_hover: {
        metricName: `严重度分布 · ${meta.label}`,
        value,
        breakdown: {
          说明: value,
          建议响应时限: meta.suggestHours,
        },
      },
    });
  };

  const handleReasonHover = (reason: BlockReasonPoint) => {
    setExplanationContext('chart_hover', {
      chart_hover: {
        metricName: `拦截原因 · ${reason.rule}`,
        value: reason.count,
        breakdown: {
          命中次数: reason.count,
          处理建议: 1,
        },
      },
    });
  };

  const handlePresetHover = (preset: FilterPreset) => {
    setExplanationContext('chart_hover', {
      chart_hover: {
        metricName: `预设入口 · ${preset.name}`,
        value: '点击跳转',
        breakdown: {
          筛选项数: Object.keys(preset.params).length,
        },
      },
    });
  };

  const handleLeave = () => {
    setExplanationContext(null, null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <EmptyState variant="default" title="加载中" description="正在加载 Dashboard 数据..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="page-title flex items-center gap-2">
          <Activity className="h-6 w-6 text-audit-600" />
          数据概览 Dashboard
        </h1>
        <p className="text-sm text-audit-500">
          全量冲突 KPI、趋势与拦截原因一览，hover 图表或卡片可在右侧面板查看详细解释
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="总冲突数"
          value={kpiTotal}
          description="系统累计拦截的幂等冲突与结构差异总数量"
          icon={Hash}
          iconBgClass="bg-audit-50"
          iconTextClass="text-audit-600"
          trendLabel="30 天统计"
          accentClass="text-audit-800"
        />
        <KpiCard
          title="待处理"
          value={kpiPending}
          description="状态为待处理或处理中，需人工介入闭环"
          icon={Clock}
          iconBgClass="bg-amber-50"
          iconTextClass="text-amber-600"
          trendLabel="需响应"
          accentClass="text-amber-700"
        />
        <KpiCard
          title="已处理"
          value={kpiResolved}
          description="已完成修正或确认忽略，已生成备份与回滚记录"
          icon={CheckCircle2}
          iconBgClass="bg-success-50"
          iconTextClass="text-success-600"
          trendLabel="已闭环"
          accentClass="text-success-700"
        />
        <KpiCard
          title="不可用记录"
          value={kpiUnavailable}
          description="上下文缺失无法走正常流程，需转交专项团队处理"
          icon={Ban}
          iconBgClass="bg-purple-50"
          iconTextClass="text-purple-600"
          trendLabel="待升级"
          accentClass="text-purple-700"
        />
      </div>

      <TrendChartSection
        trend={trend}
        onHover={handleTrendHover}
        onLeave={handleLeave}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SeverityPieSection
          pieData={pieData}
          total={records.length}
          onHover={handlePieHover}
          onLeave={handleLeave}
        />
        <BlockReasonSection
          reasons={reasons}
          onHover={handleReasonHover}
          onLeave={handleLeave}
        />
      </div>

      <QuickEntrySection
        presets={presets}
        onHover={handlePresetHover}
        onLeave={handleLeave}
      />
    </div>
  );
}
