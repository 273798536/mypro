import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { FilterBar } from '@/components/common/FilterBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getExceptionTypeLabel, getRecordTypeLabel, getStatusLabel } from '@/utils/colorRules';
import { formatDateTime } from '@/utils/helpers';
import { Eye, ChevronRight, FileText, User, Clock } from 'lucide-react';

export function ExceptionList() {
  const [searchParams] = useSearchParams();
  const {
    exceptions,
    exceptionSummary,
    fetchExceptions,
    filters,
    setFilters,
    toggleSelected,
    selectedIds,
    clearSelected,
    selectAll,
    loading,
    fetchConsistencyCheck,
    consistencyResult
  } = useAppStore();

  useEffect(() => {
    const layerParam = searchParams.get('layer');
    if (layerParam) {
      setFilters({ layerId: layerParam });
    }
  }, [searchParams, setFilters]);

  useEffect(() => {
    fetchExceptions();
    fetchConsistencyCheck();
  }, [fetchExceptions, fetchConsistencyCheck, filters]);

  const toggleSelectAll = () => {
    if (selectedIds.length === exceptions.length) {
      clearSelected();
    } else {
      selectAll(exceptions.map(e => e.id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">异常记录</h2>
        <p className="text-sm text-gray-500 mt-1">
          导入后自动筛出异常，支持按状态、类型、来源多维度筛选
        </p>
      </div>

      {consistencyResult && !consistencyResult.valid && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-xs">!</span>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800">数据一致性检查发现 {consistencyResult.issues.length} 个问题</p>
              <ul className="mt-2 space-y-1">
                {consistencyResult.issues.slice(0, 3).map((issue, idx) => (
                  <li key={idx} className="text-xs text-amber-700">
                    · {issue.message}
                  </li>
                ))}
                {consistencyResult.issues.length > 3 && (
                  <li className="text-xs text-amber-600">
                    ...还有 {consistencyResult.issues.length - 3} 个问题
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <FilterBar />

      {exceptionSummary && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              共找到 <span className="font-semibold text-gray-800">{exceptionSummary.totalCount}</span> 条记录
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <span className="text-sm text-gray-500">
                  已选 <span className="font-medium text-blue-600">{selectedIds.length}</span> 条
                </span>
              )}
              {selectedIds.length > 0 && (
                <Link
                  to="/review"
                  className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 border border-blue-300 rounded-md"
                >
                  批量复核
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading.exceptions ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : exceptions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">暂无异常记录</p>
            <p className="text-sm text-gray-400 mt-1">尝试调整筛选条件或导入新数据</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === exceptions.length && exceptions.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">异常类型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据类型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">来源</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {exceptions.map(exception => (
                    <tr key={exception.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(exception.id)}
                          onChange={() => toggleSelected(exception.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={exception.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          <p className="text-sm font-medium text-gray-800 truncate">{exception.title}</p>
                          {exception.description && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{exception.description}</p>
                          )}
                          {(exception.offlineMissing || exception.isDuplicate) && (
                            <div className="flex items-center gap-2 mt-1">
                              {exception.offlineMissing && (
                                <span className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">离线缺失</span>
                              )}
                              {exception.isDuplicate && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">重复导入</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{getExceptionTypeLabel(exception.type)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{getRecordTypeLabel(exception.recordType)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="text-gray-700 truncate max-w-[180px]">{exception.source?.fileName || '-'}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <User size={10} />
                            <span>{exception.source?.importer || '未知'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={12} />
                          <span>{formatDateTime(exception.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/exceptions/${exception.id}`}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Eye size={14} />
                          详情
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
