import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  CopyCheck,
  Search,
  MapPin,
  Eye,
  Loader2,
} from 'lucide-react';
import { useSeatStore } from '../store/useSeatStore';
import StatusBadge from '../components/StatusBadge';
import type { SeatRecord } from '../shared/types';

export default function RecordList() {
  const navigate = useNavigate();
  const {
    records,
    stats,
    filters,
    setFilters,
    loading,
    fetchRecords,
    fetchStats,
  } = useSeatStore();

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [fetchRecords, fetchStats]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filters.status && filters.status !== 'all' && r.status !== filters.status) return false;
      if (filters.street && !r.street.includes(filters.street)) return false;
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        if (
          !r.code.toLowerCase().includes(kw) &&
          !r.locationName.toLowerCase().includes(kw) &&
          !r.street.toLowerCase().includes(kw)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [records, filters]);

  const streets = useMemo(() => {
    const s = new Set(records.map((r) => r.street));
    return Array.from(s);
  }, [records]);

  const statCards = [
    {
      label: '待处理',
      value: stats.pending,
      icon: Clock,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
    },
    {
      label: '已通过',
      value: stats.approved,
      icon: CheckCircle2,
      color: 'text-primary',
      bg: 'bg-primary/5',
      border: 'border-primary/20',
    },
    {
      label: '异常',
      value: stats.exception,
      icon: AlertTriangle,
      color: 'text-accent',
      bg: 'bg-accent/5',
      border: 'border-accent',
    },
    {
      label: '待补证',
      value: stats.needEvidence,
      icon: FileWarning,
      color: 'text-yellow-700',
      bg: 'bg-warning/10',
      border: 'border-warning/40',
    },
  ];

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={clsx(
              'rounded-lg border p-4 bg-white transition-all hover:shadow-md animate-slideIn',
              card.bg,
              card.border,
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                <p className={clsx('text-3xl font-bold font-mono', card.color)}>{card.value}</p>
              </div>
              <card.icon className={clsx('w-6 h-6', card.color)} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索编号、地点、街道..."
              value={filters.keyword || ''}
              onChange={(e) => setFilters({ keyword: e.target.value })}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <select
              value={filters.street || ''}
              onChange={(e) => setFilters({ street: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-w-[140px]"
            >
              <option value="">全部街道</option>
              {streets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600">
                <th className="px-4 py-3 font-medium whitespace-nowrap">编号</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">地点</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">街道</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap text-center">GIS坐标</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">材料完整度</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">状态</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">最近操作</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    暂无符合条件的记录
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, idx) => (
                  <RecordRow key={record.id} record={record} index={idx} onView={() => navigate(`/record/${record.id}`)} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface RecordRowProps {
  record: SeatRecord;
  index: number;
  onView: () => void;
}

function RecordRow({ record, index, onView }: RecordRowProps) {
  return (
    <tr
      className={clsx(
        'border-b border-gray-100 last:border-0 transition-colors group relative',
        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
        record.status === 'exception' ? 'bg-accent/5 hover:bg-accent/10' : 'hover:bg-primary/5',
      )}
      style={{ animation: `fadeIn 0.3s ease-in-out ${index * 30}ms both` }}
    >
      <td className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-primary transition-colors" />
      <td className="px-4 py-3 pl-5 font-mono text-xs text-gray-600 whitespace-nowrap">{record.code}</td>
      <td className="px-4 py-3 font-serif font-medium text-text-dark">{record.locationName}</td>
      <td className="px-4 py-3 text-gray-600">{record.street}</td>
      <td className="px-4 py-3 text-center font-mono text-gray-700">{record.points.length}</td>
      <td className="px-4 py-3 min-w-[140px]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                record.materialCompleteness >= 80
                  ? 'bg-primary'
                  : record.materialCompleteness >= 50
                  ? 'bg-warning'
                  : 'bg-accent',
              )}
              style={{ width: `${record.materialCompleteness}%` }}
            />
          </div>
          <span className="font-mono text-xs text-gray-600 w-10 text-right">{record.materialCompleteness}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={record.status} size="sm" />
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">{record.latestJudgmentAt || record.updatedAt}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onView}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary border border-primary/30 rounded hover:bg-primary hover:text-white transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          查看
        </button>
      </td>
    </tr>
  );
}
