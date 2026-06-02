import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, Filter } from 'lucide-react';
import ExceptionList from '../components/features/ExceptionList';
import FilterPanel from '../components/features/FilterPanel';
import { useExceptionStore, exceptionEngine } from '../engines/ExceptionEngine';
import { useQueueStore } from '../store/useQueueStore';
import { useFilterStore } from '../engines/FilterSyncEngine';
import { ExceptionStatus } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const Exceptions: React.FC = () => {
  const { loadData, getFilteredData, isLoading } = useQueueStore();
  const { exceptions, setExceptions, updateExceptionStatus, batchUpdateStatus } = useExceptionStore();
  const { dateRange, keyword, setKeyword } = useFilterStore();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredData = useMemo(() => getFilteredData(), [getFilteredData]);

  useEffect(() => {
    if (filteredData.records.length > 0) {
      const detectedExceptions = exceptionEngine.processAllExceptions(
        filteredData.records,
        filteredData.appointments,
        filteredData.windows
      );
      setExceptions(detectedExceptions);
    }
  }, [filteredData, setExceptions]);

  const filteredExceptions = useMemo(() => {
    return exceptions.filter((ex) => {
      if (typeFilter !== 'all' && ex.type !== typeFilter) return false;
      if (severityFilter !== 'all' && ex.severity !== severityFilter) return false;
      if (keyword) {
        const searchText = [
          ex.description,
          exceptionEngine.getExceptionTypeLabel(ex.type),
          ex.originalJudgment,
          ex.handler,
        ].join(' ').toLowerCase();
        if (!searchText.includes(keyword.toLowerCase())) return false;
      }
      return true;
    });
  }, [exceptions, typeFilter, severityFilter, keyword]);

  const stats = useMemo(() => {
    const pending = exceptions.filter((e) => e.status === 'pending');
    const confirmed = exceptions.filter((e) => e.status === 'confirmed');
    const resolved = exceptions.filter((e) => e.status === 'resolved');

    const byType = {
      missed_appointment: exceptions.filter((e) => e.type === 'missed_appointment').length,
      abnormal_duration: exceptions.filter((e) => e.type === 'abnormal_duration').length,
      window_pause: exceptions.filter((e) => e.type === 'window_pause').length,
    };

    const bySeverity = {
      high: exceptions.filter((e) => e.severity === 'high').length,
      medium: exceptions.filter((e) => e.severity === 'medium').length,
      low: exceptions.filter((e) => e.severity === 'low').length,
    };

    return { pending, confirmed, resolved, byType, bySeverity };
  }, [exceptions]);

  const handleUpdateStatus = (id: string, status: ExceptionStatus, remark?: string) => {
    updateExceptionStatus(id, status, '管理员', remark);
  };

  const handleBatchUpdate = (ids: string[], status: ExceptionStatus) => {
    batchUpdateStatus(ids, status, '管理员');
  };

  const typeOptions = [
    { value: 'all', label: '全部类型' },
    { value: 'missed_appointment', label: '预约爽约' },
    { value: 'abnormal_duration', label: '时长异常' },
    { value: 'window_pause', label: '窗口临停' },
  ];

  const severityOptions = [
    { value: 'all', label: '全部级别' },
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 font-serif">异常清单</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {format(dateRange[0], 'yyyy年MM月dd日', { locale: zhCN })} -{' '}
            {format(dateRange[1], 'yyyy年MM月dd日', { locale: zhCN })} 异常记录管理
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-warning-50 border-warning-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-warning-500" />
            </div>
            <div>
              <div className="text-sm text-warning-700">待确认</div>
              <div className="text-3xl font-bold text-warning-800 font-serif">
                {stats.pending.length}
              </div>
            </div>
          </div>
          {stats.pending.length > 0 && (
            <div className="mt-3 text-xs text-warning-600">
              含 {stats.pending.filter((e) => e.severity === 'high').length} 条高优先级
            </div>
          )}
        </div>

        <div className="card bg-danger-50 border-danger-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-danger-500" />
            </div>
            <div>
              <div className="text-sm text-danger-700">已确认异常</div>
              <div className="text-3xl font-bold text-danger-800 font-serif">
                {stats.confirmed.length}
              </div>
            </div>
          </div>
          {stats.confirmed.length > 0 && (
            <div className="mt-3 text-xs text-danger-600">
              需要及时处理，不可混入正常明细
            </div>
          )}
        </div>

        <div className="card bg-success-50 border-success-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-success-500" />
            </div>
            <div>
              <div className="text-sm text-success-700">已处理</div>
              <div className="text-3xl font-bold text-success-800 font-serif">
                {stats.resolved.length}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-success-600">
            异常已妥善处理，记录归档
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card">
          <div className="text-sm text-neutral-500 mb-1">预约爽约</div>
          <div className="text-2xl font-bold text-neutral-800 font-serif">{stats.byType.missed_appointment}</div>
        </div>
        <div className="card">
          <div className="text-sm text-neutral-500 mb-1">时长异常</div>
          <div className="text-2xl font-bold text-neutral-800 font-serif">{stats.byType.abnormal_duration}</div>
        </div>
        <div className="card">
          <div className="text-sm text-neutral-500 mb-1">窗口临停</div>
          <div className="text-2xl font-bold text-neutral-800 font-serif">{stats.byType.window_pause}</div>
        </div>
        <div className="card">
          <div className="text-sm text-neutral-500 mb-1">高优先级</div>
          <div className="text-2xl font-bold text-danger-600 font-serif">{stats.bySeverity.high}</div>
        </div>
        <div className="card">
          <div className="text-sm text-neutral-500 mb-1">中优先级</div>
          <div className="text-2xl font-bold text-warning-600 font-serif">{stats.bySeverity.medium}</div>
        </div>
        <div className="card">
          <div className="text-sm text-neutral-500 mb-1">低优先级</div>
          <div className="text-2xl font-bold text-neutral-600 font-serif">{stats.bySeverity.low}</div>
        </div>
      </div>

      <FilterPanel />

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-neutral-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input-base text-sm pr-8"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="input-base text-sm pr-8"
            >
              {severityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="搜索异常描述、处理人..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="input-base pl-9 w-full text-sm"
            />
          </div>

          <div className="text-sm text-neutral-500">
            共 {filteredExceptions.length} 条异常记录
          </div>
        </div>

        {filteredExceptions.length === 0 ? (
          <div className="py-16 text-center text-neutral-400">
            <AlertTriangle size={48} className="mx-auto mb-2 opacity-50" />
            <p>暂无符合条件的异常记录</p>
          </div>
        ) : (
          <ExceptionList
            exceptions={filteredExceptions}
            onUpdateStatus={handleUpdateStatus}
            onBatchUpdate={handleBatchUpdate}
          />
        )}
      </div>

      <div className="card bg-neutral-50 border border-neutral-200">
        <h3 className="font-semibold text-neutral-800 mb-3">异常处理说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-white rounded-lg border border-neutral-100">
            <h4 className="font-medium text-warning-700 mb-2">待确认</h4>
            <p className="text-neutral-600">
              系统自动检测到的异常，需要人工核实确认。请仔细核对原始判断和实际情况后进行处理。
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-neutral-100">
            <h4 className="font-medium text-danger-700 mb-2">已确认异常</h4>
            <p className="text-neutral-600">
              已核实的真实异常，独立于正常明细进行管理，确保不被数据补录或其他操作覆盖。
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-neutral-100">
            <h4 className="font-medium text-success-700 mb-2">已处理</h4>
            <p className="text-neutral-600">
              异常已妥善处理，记录完整归档。保留原始判断快照，确保全程可追溯。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exceptions;
