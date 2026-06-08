import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useStore';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import type { RecordStatus, ModelRecordSummary } from '../types';

const STATUS_FILTERS: { value: 'all' | RecordStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待复核' },
  { value: 'reviewed', label: '已复核' },
  { value: 'approved', label: '已通过' }
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} ~ ${e.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
}

function RecordCard({ record }: { record: ModelRecordSummary }) {
  return (
    <Link
      to={`/record/${record.id}`}
      className="block bg-white rounded-xl shadow-sm border border-border-light hover:shadow-md hover:border-primary/30 transition-all duration-200 overflow-hidden group"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-primary group-hover:text-primary-light transition-colors">
              {record.id}
            </h3>
            <p className="text-xs text-text-gray mt-1">运行时间：{formatDate(record.runTime)}</p>
          </div>
          <StatusBadge status={record.status} />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-text-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-text-gray">时间范围：</span>
            <span className="text-text-dark">{formatDateTimeRange(record.timeParameters.startTime, record.timeParameters.endTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-text-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-text-gray">采样间隔：</span>
            <span className="text-text-dark">{record.timeParameters.samplingInterval} 秒</span>
          </div>
          {record.unitConversionError.hasError && (
            <div className="flex items-start gap-2 text-sm bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-warning">存在单位换算错误</p>
                <p className="text-warning/80 text-xs mt-0.5 line-clamp-1">{record.unitConversionError.description}</p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border-light">
          <p className="text-sm text-text-dark line-clamp-2">{record.conclusion}</p>
          <p className="text-xs text-text-gray mt-2">更新于：{formatDate(record.updatedAt)}</p>
        </div>
      </div>
    </Link>
  );
}

export default function RecordListPage() {
  const { records, loading, error, fetchRecords } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<'all' | RecordStatus>('all');
  const [errorOnly, setErrorOnly] = useState(false);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (errorOnly && !r.unitConversionError.hasError) return false;
      if (keyword) {
        const k = keyword.toLowerCase();
        return (
          r.id.toLowerCase().includes(k) ||
          r.conclusion.toLowerCase().includes(k) ||
          r.unitConversionError.description.toLowerCase().includes(k)
        );
      }
      return true;
    });
  }, [records, statusFilter, errorOnly, keyword]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-dark mb-1">模型运行记录</h1>
        <p className="text-text-gray text-sm">复核隧道管片错缝模型运行结果，修正单位换算等问题</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border-light p-4 mb-5">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="搜索记录编号、结论、错误描述..."
                className="w-full pl-10 pr-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  statusFilter === f.value
                    ? 'bg-white text-primary font-medium shadow-sm'
                    : 'text-text-gray hover:text-text-dark'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-text-dark cursor-pointer select-none">
            <input
              type="checkbox"
              checked={errorOnly}
              onChange={e => setErrorOnly(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary/30"
            />
            <span>仅显示有单位换算错误</span>
          </label>
        </div>

        <div className="mt-3 text-xs text-text-gray">
          共 {filtered.length} 条记录
          {errorOnly && ` / ${records.length} 条全部`}
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchRecords} />}
      {loading && <Loading message="加载记录列表..." />}

      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-border-light p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-text-gray/50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-text-gray">暂无符合条件的记录</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <RecordCard key={r.id} record={r} />
          ))}
        </div>
      )}
    </div>
  );
}
