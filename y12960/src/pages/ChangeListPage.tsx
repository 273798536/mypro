import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Upload,
  Download,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { changeApi } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { AnomalyBadge } from '../components/AnomalyBadge';
import { ChangeTypeBadge } from '../components/ChangeTypeBadge';
import { formatDate, truncateText, statusConfig } from '../utils/formatters';
import type { RecordStatus, Anomaly } from '../../shared/types';

export function ChangeListPage() {
  const {
    changes,
    totalChanges,
    filters,
    page,
    pageSize,
    loading,
    selectedIds,
    currentRole,
    setChanges,
    setFilters,
    resetFilters,
    setPage,
    setPageSize,
    setLoading,
    toggleSelected,
    selectAll,
    clearSelected,
    updateChangeStatus,
    bulkUpdateStatus,
  } = useStore();

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<unknown>(null);
  const [showBulkAction, setShowBulkAction] = useState(false);
  const [showEndOfMonthModal, setShowEndOfMonthModal] = useState(false);
  const [transferResult, setTransferResult] = useState<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadChanges();
  }, [filters, page, pageSize]);

  const loadChanges = async () => {
    setLoading(true);
    try {
      const res = await changeApi.getChanges({
        ...filters,
        page,
        pageSize,
      });
      if (res.success) {
        setChanges(res.data, res.pagination?.total || res.data.length);
      }
    } catch (error) {
      console.error('加载变更记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setLoading(true);
    try {
      const res = await changeApi.importChanges(importFile);
      setImportResult(res);
      if (res.success) {
        loadChanges();
      }
    } catch (error) {
      console.error('导入失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async (status: RecordStatus) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await changeApi.bulkUpdate(selectedIds, status);
      if (res.success) {
        bulkUpdateStatus(selectedIds, status);
        setShowBulkAction(false);
      }
    } catch (error) {
      console.error('批量更新失败:', error);
    }
  };

  const handleEndOfMonthTransfer = async () => {
    try {
      const res = await changeApi.endOfMonthTransfer();
      if (res.success) {
        setTransferResult(res.data);
        loadChanges();
      }
    } catch (error) {
      console.error('月底转交失败:', error);
    }
  };

  const handleExport = async () => {
    try {
      const data = selectedIds.length > 0
        ? { ids: selectedIds, format: 'excel' as const }
        : { filters, format: 'excel' as const };
      await changeApi.exportChanges(data);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const statusStats = {
    AVAILABLE: changes.filter((c) => c.status === 'AVAILABLE').length,
    PENDING_REVIEW: changes.filter((c) => c.status === 'PENDING_REVIEW').length,
    UNAVAILABLE: changes.filter((c) => c.status === 'UNAVAILABLE').length,
  };

  const anomalyCount = changes.reduce(
    (sum, c) => sum + (c.anomalyCount || 0),
    0
  );

  const totalPages = Math.ceil(totalChanges / pageSize);
  const allSelected = changes.length > 0 && changes.every((c) => selectedIds.includes(c.id));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">全部记录</p>
              <p className="text-2xl font-bold text-gray-900">{totalChanges}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">可用</p>
              <p className="text-2xl font-bold text-green-600">{statusStats.AVAILABLE}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待复核</p>
              <p className="text-2xl font-bold text-amber-600">{statusStats.PENDING_REVIEW}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">异常数量</p>
              <p className="text-2xl font-bold text-red-600">{anomalyCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">筛选条件</span>
          </div>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置筛选
          </button>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              placeholder="搜索记录号/表名/字段名..."
              value={filters.keyword || ''}
              onChange={(e) => setFilters({ keyword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ status: (e.target.value as RecordStatus) || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部状态</option>
              <option value="AVAILABLE">可用</option>
              <option value="PENDING_REVIEW">待复核</option>
              <option value="UNAVAILABLE">不可用</option>
            </select>
          </div>
          <div>
            <select
              value={filters.hasAnomalies === true ? 'true' : filters.hasAnomalies === false ? 'false' : ''}
              onChange={(e) =>
                setFilters({
                  hasAnomalies: e.target.value === '' ? undefined : e.target.value === 'true',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部异常</option>
              <option value="true">有异常</option>
              <option value="false">无异常</option>
            </select>
          </div>
          <div>
            <select
              value={filters.anomalyType || ''}
              onChange={(e) => setFilters({ anomalyType: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">异常类型</option>
              <option value="NULL_VALUE">空值问题</option>
              <option value="DUPLICATE">重复记录</option>
              <option value="MIXED_NOTES">备注混写</option>
              <option value="BACKUP_GAP">备份缺口</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {currentRole === 'dev' ? (
              <button
                onClick={() => setShowEndOfMonthModal(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                月底转交
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  导入
                </button>
                <button
                  onClick={handleExport}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-800">
              已选择 <strong>{selectedIds.length}</strong> 条记录
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentRole !== 'dev' && (
              <>
                <button
                  onClick={() => handleBulkUpdate('AVAILABLE')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  标记可用
                </button>
                <button
                  onClick={() => handleBulkUpdate('PENDING_REVIEW')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
                >
                  <Clock className="w-4 h-4" />
                  标记待复核
                </button>
                <button
                  onClick={() => handleBulkUpdate('UNAVAILABLE')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  标记不可用
                </button>
              </>
            )}
            <button
              onClick={clearSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  {currentRole !== 'dev' && (
                    <button
                      onClick={() => (allSelected ? clearSelected() : selectAll(changes.map((c) => c.id)))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {allSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  记录号
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  表名 / 字段名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  变更类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  异常
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  处理意见
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  更新时间
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : changes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    暂无变更记录
                  </td>
                </tr>
              ) : (
                changes.map((record) => (
                  <tr
                    key={record.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      record.status === 'UNAVAILABLE' ? 'bg-red-50/50' : ''
                    } ${selectedIds.includes(record.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      {currentRole !== 'dev' && (
                        <button
                          onClick={() => toggleSelected(record.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {selectedIds.includes(record.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-900">{record.recordNo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{record.tableName}</p>
                        <p className="text-sm text-gray-500">{record.fieldName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ChangeTypeBadge type={record.changeType} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {record.anomalies && record.anomalies.length > 0 ? (
                          record.anomalies.slice(0, 2).map((anomaly: Anomaly, idx: number) => (
                            <AnomalyBadge
                              key={idx}
                              type={anomaly.type}
                              severity={anomaly.severity}
                              showIcon={false}
                            />
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">无异常</span>
                        )}
                        {record.anomalies && record.anomalies.length > 2 && (
                          <span className="text-xs text-gray-400">+{record.anomalies.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600" title={record.handlingOpinion || ''}>
                        {truncateText(record.handlingOpinion, 20)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{formatDate(record.updatedAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/changes/${record.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          详情
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">每页显示</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-500">条</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                第 {page} 页 / 共 {totalPages} 页（{totalChanges} 条）
              </span>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">导入变更记录</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {importResult ? (
                <div className="text-center py-8">
                  {(importResult as { success: boolean }).success ? (
                    <>
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">导入成功</h4>
                      <p className="text-gray-500">
                        共导入 {(importResult as { data: { imported: number } }).data.imported} 条记录，
                        发现 {(importResult as { data: { anomaliesFound: number } }).data.anomaliesFound} 个异常
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">导入失败</h4>
                      <p className="text-gray-500">{(importResult as { error: string }).error}</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-700 font-medium mb-1">
                      {importFile ? importFile.name : '点击选择文件或拖拽上传'}
                    </p>
                    <p className="text-sm text-gray-500">支持 .xlsx, .xls, .csv 格式</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <button
                      onClick={() => changeApi.downloadTemplate()}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      下载导入模板
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {importResult ? '关闭' : '取消'}
              </button>
              {!importResult && importFile && (
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '导入中...' : '开始导入'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* End of Month Transfer Modal */}
      {showEndOfMonthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">月底转交 - 研发团队视角</h3>
              <button
                onClick={() => {
                  setShowEndOfMonthModal(false);
                  setTransferResult(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {transferResult ? (
                <div>
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">月底转交完成</h4>
                    <p className="text-gray-500">已同步至研发团队</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {(transferResult as { transferred: number }).transferred}
                      </p>
                      <p className="text-sm text-green-700">已转交</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {(transferResult as { unavailable: number }).unavailable}
                      </p>
                      <p className="text-sm text-red-700">不可用</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-amber-600">
                        {(transferResult as { pendingReview: number }).pendingReview}
                      </p>
                      <p className="text-sm text-amber-700">待复核</p>
                    </div>
                  </div>

                  <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <p className="font-medium text-gray-700">不可用记录详情</p>
                      <p className="text-sm text-gray-500">这些记录不能直接使用，需要联系BI分析师复核</p>
                    </div>
                    <div className="max-h-60 overflow-auto">
                      {(transferResult as { details: Array<{ recordNo: string; tableName: string; fieldName: string; status: string }> }).details
                        .filter((d) => d.status === 'UNAVAILABLE')
                        .map((detail, idx) => (
                          <div key={idx} className="px-4 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <div>
                                <p className="font-mono text-sm text-gray-900">{detail.recordNo}</p>
                                <p className="text-xs text-gray-500">
                                  {detail.tableName} / {detail.fieldName}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-red-600 font-medium">不可用</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ArrowRight className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">月底转交至研发团队</h4>
                  <p className="text-gray-500 mb-6">
                    系统将按状态分类整理所有记录，重点突出不可用记录
                    <br />
                    研发团队拿到结果时，能一眼分清哪些能直接用、哪些需要复核
                  </p>
                  <button
                    onClick={handleEndOfMonthTransfer}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                    开始月底转交
                  </button>
                </div>
              )}
            </div>
            {transferResult && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    setShowEndOfMonthModal(false);
                    setTransferResult(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
