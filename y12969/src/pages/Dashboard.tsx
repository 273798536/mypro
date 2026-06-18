import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  Database,
  Search,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';
import {
  ANOMALY_TYPE_LABEL,
  STATUS_LABEL,
  ACTION_LABEL,
  formatBytes,
} from '@/utils/api';
import type { Anomaly, CapacityTrendPoint } from '../../shared/types';
import { Link } from 'react-router-dom';

const STATUS_ORDER: Array<'pending' | 'reviewing' | 'resolved' | 'confirmed'> = [
  'pending',
  'reviewing',
  'resolved',
  'confirmed',
];

const anomalyConfig: Record<string, { color: string; icon: typeof AlertTriangle; action: string }> = {
  type_drift: { color: 'bg-rose', icon: AlertTriangle, action: '补材料：提交变更审批单' },
  data_mismatch: { color: 'bg-amber', icon: Database, action: '改口径：修正统计脚本' },
  slow_query: { color: 'bg-navy-600', icon: Search, action: '补材料：关联 DBA 工单' },
  missing_record: { color: 'bg-slatex-500', icon: FileText, action: '补材料：补录缺失记录' },
};

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const cfg = anomalyConfig[anomaly.type] ?? anomalyConfig.data_mismatch;
  const Icon = cfg.icon;
  return (
    <Link
      to="/review"
      className="card !p-4 block group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-lg ${cfg.color} text-white flex items-center justify-center shrink-0`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className={`badge-${anomaly.status}`}>{STATUS_LABEL[anomaly.status]}</span>
      </div>
      <div className="mt-3">
        <div className="text-sm font-semibold text-navy-800">
          {ANOMALY_TYPE_LABEL[anomaly.type] || anomaly.type}
        </div>
        <div className="text-xs text-slatex-500 mt-1 line-clamp-2 leading-relaxed">
          {anomaly.description}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slatex-100 flex items-center justify-between">
        <div className="text-[11px] text-slatex-500">建议下一步</div>
        <div className="text-xs font-medium text-amber flex items-center gap-1 group-hover:gap-1.5 transition-all">
          {ACTION_LABEL[anomaly.suggestedAction] || anomaly.suggestedAction}
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { trend, anomalies, records, logs } = useAuditStore();
  const [hoverPoint, setHoverPoint] = useState<CapacityTrendPoint | null>(null);

  useEffect(() => {
    if (trend.length > 0 && !hoverPoint) {
      setHoverPoint(trend[trend.length - 1]);
    }
  }, [trend]);

  const statusCounts = STATUS_ORDER.map((s) => ({
    status: s,
    count: anomalies.filter((a) => a.status === s).length,
  }));
  const totalAnomalies = anomalies.length;
  const totalRecords = records.length;
  const typeDriftCount = anomalies.filter((a) => a.type === 'type_drift').length;
  const dataMismatchCount = anomalies.filter((a) => a.type === 'data_mismatch').length;
  const slowQueryCount = anomalies.filter((a) => a.type === 'slow_query').length;

  const summaryCards = [
    {
      label: '备份记录总数',
      value: totalRecords,
      sub: '条记录已导入',
      Icon: Database,
      tone: 'text-navy-600',
      bg: 'bg-navy-50',
    },
    {
      label: '类型漂移异常',
      value: typeDriftCount,
      sub: '需要补材料或改口径',
      Icon: AlertTriangle,
      tone: 'text-rose',
      bg: 'bg-rose-soft/50',
    },
    {
      label: '容量不一致',
      value: dataMismatchCount,
      sub: '差异超过阈值 5%',
      Icon: Database,
      tone: 'text-amber',
      bg: 'bg-amber-soft/50',
    },
    {
      label: '慢查询归因',
      value: slowQueryCount,
      sub: '索引建议已生成',
      Icon: Search,
      tone: 'text-navy-700',
      bg: 'bg-navy-50',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">仪表盘总览</h1>
        <p className="muted text-sm mt-1">实时掌握本轮审计整体进度、异常分类和容量趋势</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((c) => {
          const Icon = c.Icon;
          return (
            <div key={c.label} className="card flex items-start gap-3">
              <div className={`w-11 h-11 rounded-lg ${c.bg} ${c.tone} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="label">{c.label}</div>
                <div className="mt-0.5 text-2xl font-bold text-navy-800 font-serif">{c.value}</div>
                <div className="text-xs text-slatex-500 mt-0.5">{c.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 card bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="section-title text-navy-100">容量趋势三维视图</div>
              <div className="text-xs text-navy-300 mt-0.5">总容量 = 数据容量 + 索引容量，Hover 查看明细解释</div>
            </div>
            <TrendingUp className="w-5 h-5 text-amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trend}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  onMouseMove={(e) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      setHoverPoint(e.activePayload[0].payload);
                    }
                  }}
                  onMouseLeave={() => setHoverPoint(trend[trend.length - 1] ?? null)}
                >
                  <defs>
                    <linearGradient id="gBackup" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gIndex" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v) => formatBytes(v as number).replace(' ', '')}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6 }}
                    labelStyle={{ color: '#cbd5e1' }}
                    formatter={(value: number, name: string) => [formatBytes(value), name]}
                  />
                  <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
                  <Area type="monotone" dataKey="backupSize" name="数据容量" stroke="#f59e0b" fill="url(#gBackup)" strokeWidth={2} />
                  <Area type="monotone" dataKey="indexSize" name="索引容量" stroke="#10b981" fill="url(#gIndex)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-navy-950/60 border border-navy-700/50 rounded-lg p-4">
              <div className="label text-navy-400">明细解释</div>
              {hoverPoint ? (
                <div className="mt-3 space-y-3 animate-fade-in">
                  <div>
                    <div className="text-xs text-navy-300">日期</div>
                    <div className="text-base font-semibold text-white mono">{hoverPoint.date}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-navy-300">数据容量</div>
                      <div className="text-sm font-semibold text-amber mono">{formatBytes(hoverPoint.backupSize)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-navy-300">索引容量</div>
                      <div className="text-sm font-semibold text-jade mono">{formatBytes(hoverPoint.indexSize)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-navy-300">总容量</div>
                      <div className="text-lg font-bold text-white mono">{formatBytes(hoverPoint.totalSize)}</div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-navy-700/50">
                    <div className="text-xs text-navy-400 mb-1.5">解释说明</div>
                    <p className="text-xs leading-relaxed text-navy-200">{hoverPoint.explanation}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-center text-navy-400 text-sm">
                  <Clock className="w-5 h-5 mx-auto mb-2 opacity-60" />
                  移动鼠标到图表上查看解释
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title mb-4">状态流转进度</div>
          <div className="space-y-3">
            {statusCounts.map((s, idx) => {
              const pct = totalAnomalies ? Math.round((s.count / totalAnomalies) * 100) : 0;
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        idx === 0 ? 'bg-amber-soft text-amber-700' :
                        idx === 1 ? 'bg-blue-100 text-blue-700' :
                        idx === 2 ? 'bg-jade-soft text-jade-700' :
                        'bg-navy-100 text-navy-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-navy-800">{STATUS_LABEL[s.status]}</span>
                    </div>
                    <div className="text-sm mono text-navy-600">
                      {s.count} <span className="text-slatex-400">/ {totalAnomalies}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slatex-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        idx === 0 ? 'bg-amber' :
                        idx === 1 ? 'bg-blue-500' :
                        idx === 2 ? 'bg-jade' :
                        'bg-navy-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-slatex-100">
            <div className="text-xs muted">最近处理痕迹</div>
            <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto scroll-thin">
              {logs.slice(0, 4).map((log) => (
                <div key={log.id} className="text-xs flex items-start gap-2 py-1.5 px-2 rounded hover:bg-slatex-50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-jade shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-navy-700 truncate">{log.remark || log.operator}</div>
                    <div className="text-slatex-400 mono text-[10px]">
                      {new Date(log.timestamp).toLocaleString()} · {log.operator}
                    </div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <div className="text-xs muted">暂无操作记录</div>}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-title">异常概览</div>
            <div className="text-xs muted mt-0.5">不只是一个红色数字，每条异常都标注了下一步建议</div>
          </div>
          <Link to="/review" className="btn-ghost text-sm">
            前往复核中心 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {anomalies.slice(0, 4).map((a) => (
            <AnomalyCard key={a.id} anomaly={a} />
          ))}
          {anomalies.length === 0 && (
            <div className="card sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-8 muted">
              暂无异常，所有记录正常
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
