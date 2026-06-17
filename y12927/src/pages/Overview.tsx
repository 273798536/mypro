import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Search,
  Calendar,
  FileQuestion,
  ArrowRight,
  Filter,
  RefreshCw,
  Database,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import { AnomalyTypeTag, SeverityTag, StatusTag } from '@/components/Tags';
import {
  ANOMALY_TYPE_COLOR,
  ANOMALY_TYPE_LABEL,
  type AnomalyType,
} from '../../shared/types';
import { formatDate, getTimeFromNow } from '@/utils/format';
import { cn } from '@/lib/utils';

export default function OverviewPage() {
  const {
    currentBatchId,
    setCurrentBatchId,
    batches,
    setBatches,
    anomalies,
    setAnomalies,
    filterType,
    filterStatus,
    setFilterType,
    setFilterStatus,
  } = useStore();

  useEffect(() => {
    api.getBatches().then(setBatches);
  }, [setBatches]);

  useEffect(() => {
    api
      .getAnomalies({ batchId: currentBatchId, type: filterType, status: filterStatus })
      .then(setAnomalies);
  }, [currentBatchId, filterType, filterStatus, setAnomalies]);

  const currentBatch = batches.find((b) => b.id === currentBatchId);

  const pieData = useMemo(() => {
    const groups: Record<string, number> = {};
    anomalies.forEach((a) => {
      groups[a.type] = (groups[a.type] || 0) + 1;
    });
    return Object.entries(groups).map(([type, value]) => ({
      name: ANOMALY_TYPE_LABEL[type as AnomalyType] || type,
      value,
      color: ANOMALY_TYPE_COLOR[type as AnomalyType] || '#9ca3af',
    }));
  }, [anomalies]);

  const severityData = useMemo(() => {
    const groups: Record<string, number> = { high: 0, medium: 0, low: 0 };
    anomalies.forEach((a) => {
      groups[a.severity] = (groups[a.severity] || 0) + 1;
    });
    const labelMap = { high: '严重', medium: '中等', low: '轻微' };
    const colorMap = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
    return Object.entries(groups).map(([k, v]) => ({
      name: labelMap[k as keyof typeof labelMap] || k,
      count: v,
      fill: colorMap[k as keyof typeof colorMap] || '#6b7280',
    }));
  }, [anomalies]);

  const stats = useMemo(() => {
    const total = anomalies.length;
    const pending = anomalies.filter((a) => a.status === 'pending').length;
    const resolved = anomalies.filter((a) => a.status === 'resolved').length;
    return { total, pending, resolved };
  }, [anomalies]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">检查概览</h1>
          <p className="text-sm text-gray-500 mt-1">
            选择运行批次，查看异常分布和待处理问题
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <RefreshCw className="w-4 h-4" />
            刷新数据
          </button>
          <Link to="/export" className="btn-primary">
            <FileQuestion className="w-4 h-4" />
            导出报告
          </Link>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          运行批次（文件名一眼区分新旧）
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {batches.map((b) => {
            const isActive = b.id === currentBatchId;
            return (
              <button
                key={b.id}
                onClick={() => setCurrentBatchId(b.id)}
                className={cn(
                  'card p-5 text-left relative overflow-hidden transition-all',
                  isActive && 'ring-2 ring-brand-400',
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-gray-400 truncate">
                      {b.fileName}
                    </p>
                    <p className="text-sm font-medium mt-1">{b.id}</p>
                  </div>
                  <span className="tag bg-brand-50 text-brand-600 whitespace-nowrap">
                    {getTimeFromNow(b.runAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">{b.summary}</p>
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                  <span>
                    <Database className="w-3 h-3 inline mr-1" />
                    {b.totalSamples.toLocaleString()} 样本
                  </span>
                  <span className="text-red-500 font-medium">{b.anomalyCount} 异常</span>
                  <span>{formatDate(b.runAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: '异常总数', value: stats.total, color: '#1e3a5f' },
          { label: '待处理', value: stats.pending, color: '#f59e0b' },
          { label: '已解决', value: stats.resolved, color: '#10b981' },
          {
            label: '异常率',
            value: currentBatch
              ? ((currentBatch.anomalyCount / currentBatch.totalSamples) * 100).toFixed(2) +
                '%'
              : '-',
            color: '#ef4444',
          },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-serif font-semibold mt-2" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-serif mb-2">异常类型分布</h3>
          <p className="text-xs text-gray-500 mb-4">看看哪种问题最多</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="45%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-serif mb-2">严重程度分布</h3>
          <p className="text-xs text-gray-500 mb-4">优先处理高严重度问题</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f3ed" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {severityData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-lg font-serif">异常列表</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="select w-36"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">全部类型</option>
                <option value="duplicate">脏样本重复</option>
                <option value="rule_missing">安全规则漏配</option>
                <option value="format_error">格式错误</option>
                <option value="leak">训练验证泄漏</option>
              </select>
              <select
                className="select w-32"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">全部状态</option>
                <option value="pending">待处理</option>
                <option value="processing">处理中</option>
                <option value="resolved">已解决</option>
                <option value="ignored">已忽略</option>
              </select>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9 w-56" placeholder="搜索异常ID或原文..." />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-sand-200">
                <th className="py-3 px-3 font-medium w-16">严重度</th>
                <th className="py-3 px-3 font-medium w-24">异常ID</th>
                <th className="py-3 px-3 font-medium w-28">类型</th>
                <th className="py-3 px-3 font-medium">原因说明（人话版）</th>
                <th className="py-3 px-3 font-medium w-24">状态</th>
                <th className="py-3 px-3 font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a, idx) => (
                <tr
                  key={a.id}
                  className={cn(
                    'border-b border-sand-100 align-top',
                    idx % 2 === 0 ? 'bg-white' : 'bg-sand-50/40',
                    'hover:bg-brand-50/50 transition-colors',
                  )}
                >
                  <td className="py-3 px-3">
                    <SeverityTag severity={a.severity} />
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-gray-600">{a.id}</td>
                  <td className="py-3 px-3">
                    <AnomalyTypeTag type={a.type} />
                  </td>
                  <td className="py-3 px-3">
                    <p className="text-gray-700 leading-relaxed">{a.humanReason}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                      原文：{a.originalText}
                    </p>
                  </td>
                  <td className="py-3 px-3">
                    <StatusTag status={a.status} />
                  </td>
                  <td className="py-3 px-3">
                    <Link
                      to={`/anomaly/${a.id}`}
                      className="text-brand-500 hover:text-brand-700 text-sm inline-flex items-center gap-1"
                    >
                      查看详情
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
