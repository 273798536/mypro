import { useState, useEffect } from 'react';
import { Search, Filter, X, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '@/utils/api';
import { useStore } from '@/store/useStore';
import RecordDetail from '@/components/RecordDetail';
import type { DeliveryRecord, FilterCriteria } from '@shared/types';
import { getStatusLabel, getSourceLabel, formatDateTime } from '@/utils/helpers';

export default function ListPage() {
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DeliveryRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);
  const filters = useStore((state) => state.filters);
  const setFilters = useStore((state) => state.setFilters);
  const resetFilters = useStore((state) => state.resetFilters);
  const setGlobalRecords = useStore((state) => state.setRecords);

  useEffect(() => {
    loadRecords();
  }, [filters]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api.records.list(filters);
      setRecords(data);
      setGlobalRecords(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterCriteria, value: string | boolean | undefined) => {
    setFilters({ [key]: value });
  };

  const activeFiltersCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length;

  const goodsTypes = Array.from(new Set(records.map((r) => r.goodsType).filter(Boolean)));

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-semibold text-gray-800 mb-2">清单列表</h2>
        <p className="text-gray-600">
          查看所有卸货记录，支持多条件筛选，街口冲突点高亮显示
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索菜场名称、地点、车牌号..."
                value={filters.searchText || ''}
                onChange={(e) => handleFilterChange('searchText', e.target.value || undefined)}
                className="pl-9 pr-4 py-2 w-80 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Filter className="w-4 h-4" />
              筛选
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <button
              onClick={loadRecords}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-gray-500">
            共 {records.length} 条记录
          </div>
        </div>

        {showFilters && (
          <div className="px-4 py-4 bg-gray-50 border-b border-gray-200 grid grid-cols-5 gap-4 animate-fade-in-up">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">状态</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">全部</option>
                <option value="pending">待处理</option>
                <option value="cleaned">已清洗</option>
                <option value="conflict">有冲突</option>
                <option value="merged">已归并</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">来源</label>
              <select
                value={filters.source || ''}
                onChange={(e) => handleFilterChange('source', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">全部</option>
                <option value="excel">Excel导入</option>
                <option value="manual">手工录入</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">货物类型</label>
              <select
                value={filters.goodsType || ''}
                onChange={(e) => handleFilterChange('goodsType', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">全部</option>
                {goodsTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">仅显示有问题</label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasIssues || false}
                  onChange={(e) => handleFilterChange('hasIssues', e.target.checked || undefined)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">仅显示有未解决问题的记录</span>
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                重置筛选
              </button>
            </div>
          </div>
        )}

        {activeFiltersCount > 0 && (
          <div className="px-4 py-2 bg-primary-50 border-b border-primary-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-primary-700 font-medium">当前筛选：</span>
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs">
                状态：{getStatusLabel(filters.status).label}
                <button onClick={() => handleFilterChange('status', undefined)} className="hover:text-primary-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.source && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs">
                来源：{getSourceLabel(filters.source)}
                <button onClick={() => handleFilterChange('source', undefined)} className="hover:text-primary-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.searchText && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs">
                关键词：{filters.searchText}
                <button onClick={() => handleFilterChange('searchText', undefined)} className="hover:text-primary-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.goodsType && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs">
                货物：{filters.goodsType}
                <button onClick={() => handleFilterChange('goodsType', undefined)} className="hover:text-primary-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.hasIssues && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning-100 text-warning-700 rounded text-xs">
                仅显示有问题
                <button onClick={() => handleFilterChange('hasIssues', undefined)} className="hover:text-warning-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        <div className="overflow-auto max-h-[calc(100vh-420px)]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">记录编号</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">菜场名称</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">卸货地点</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">坐标</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">卸货时间</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">车牌号</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">货物类型</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">来源</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => {
                const statusInfo = getStatusLabel(record.status);
                const hasUnresolvedIssues = record.issues.some((i) => !i.resolved);
                const isConflict = record.status === 'conflict';

                return (
                  <tr
                    key={record.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                      isConflict ? 'border-l-4 border-l-warning-500 animate-border-pulse' : ''
                    } hover:bg-primary-50 transition-colors`}
                  >
                    <td className="px-4 py-3 border-b border-gray-100 font-mono text-xs">{record.recordId}</td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        {record.marketName}
                        {record.marketName !== record.marketNameRaw && (
                          <span className="text-xs text-gray-400" title={`原始：${record.marketNameRaw}`}>
                            *
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="max-w-xs truncate" title={record.location}>
                        {record.location}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 font-mono text-xs">
                      {record.coordinates.lat.toFixed(4)}, {record.coordinates.lng.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                      {record.deliveryTime || '-'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">{record.truckNumber || '-'}</td>
                    <td className="px-4 py-3 border-b border-gray-100">{record.goodsType || '-'}</td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <span className={`px-2 py-0.5 text-xs border rounded ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-xs text-gray-500">
                      {getSourceLabel(record.source)}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-center gap-1">
                        {hasUnresolvedIssues && (
                          <AlertTriangle className="w-4 h-4 text-warning-500" title={`${record.issues.filter(i => !i.resolved).length}个未解决问题`} />
                        )}
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="p-1.5 text-primary-600 hover:bg-primary-100 rounded transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    暂无符合条件的记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord && (
        <RecordDetail
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdate={loadRecords}
        />
      )}
    </div>
  );
}
