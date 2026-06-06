import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  getExceptionTypeLabel,
  getRecordTypeLabel,
  getStatusLabel,
  getStatusColor
} from '@/utils/colorRules';
import { formatDateTime } from '@/utils/helpers';
import { RecordStatus, RecordType } from '@/types';
import {
  CheckSquare,
  Download,
  Eye,
  ChevronRight,
  AlertTriangle,
  FileCheck,
  Filter,
  Send,
  User,
  Clock
} from 'lucide-react';

export function ReviewManagement() {
  const {
    reviewData,
    fetchReviewData,
    fetchConsistencyCheck,
    consistencyResult,
    selectedIds,
    toggleSelected,
    clearSelected,
    selectAll,
    batchReview,
    exportReport,
    loading
  } = useAppStore();

  const [filterType, setFilterType] = useState<RecordType | 'all'>('all');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchConclusion, setBatchConclusion] = useState<RecordStatus>(RecordStatus.NORMAL);
  const [batchComment, setBatchComment] = useState('');
  const [reviewer, setReviewer] = useState('评审老师');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [showExportPreview, setShowExportPreview] = useState(false);

  useEffect(() => {
    fetchReviewData();
    fetchConsistencyCheck();
  }, [fetchReviewData, fetchConsistencyCheck]);

  const filteredRecords = useMemo(() => {
    if (!reviewData) return [];
    if (filterType === 'all') return reviewData.records;
    return reviewData.records.filter(r => r.recordType === filterType);
  }, [reviewData, filterType]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      clearSelected();
    } else {
      selectAll(filteredRecords.map(r => r.id));
    }
  };

  const handleBatchSubmit = async () => {
    await batchReview(selectedIds, batchConclusion, batchComment, reviewer);
    setShowBatchModal(false);
    setBatchComment('');
  };

  const handleExport = () => {
    exportReport(exportFormat);
    setShowExportPreview(false);
  };

  const typeColors: Record<RecordType, string> = {
    [RecordType.TRAJECTORY]: 'bg-blue-50 text-blue-700 border-blue-200',
    [RecordType.DEVICE_LIST]: 'bg-purple-50 text-purple-700 border-purple-200',
    [RecordType.SCALE_ERROR]: 'bg-amber-50 text-amber-700 border-amber-200'
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">复核管理</h2>
        <p className="text-sm text-gray-500 mt-1">
          轨迹记录、设备清单、比例尺错用 — 同一轮复核，确保导出与界面摘要一致
        </p>
      </div>

      {consistencyResult && (
        <div className={`rounded-lg p-4 ${consistencyResult.valid ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {consistencyResult.valid ? (
                <>
                  <FileCheck size={18} className="text-green-600" />
                  <span className="text-sm font-medium text-green-800">数据一致性检查通过</span>
                  <span className="text-xs text-green-600">界面摘要与导出内容一致</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={18} className="text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    发现 {consistencyResult.issues.length} 个一致性问题
                  </span>
                </>
              )}
            </div>
            {!consistencyResult.valid && (
              <button
                onClick={() => setShowExportPreview(true)}
                className="text-xs text-amber-700 hover:text-amber-800 underline"
              >
                查看详情
              </button>
            )}
          </div>
        </div>
      )}

      {reviewData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reviewData.layerStats.map(stat => {
            const typeLabel = getRecordTypeLabel(stat.recordType);
            const total = Object.values(stat.stats).reduce((a, b) => a + b, 0);
            return (
              <div
                key={stat.recordType}
                className={`rounded-lg border p-4 cursor-pointer transition-all ${
                  filterType === stat.recordType
                    ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/30'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => setFilterType(filterType === stat.recordType ? 'all' : stat.recordType)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-md border ${typeColors[stat.recordType]}`}>
                      {typeLabel}
                    </span>
                    <p className="text-2xl font-semibold text-gray-800 mt-2">{total}</p>
                  </div>
                  <CheckSquare size={24} className={filterType === stat.recordType ? 'text-blue-500' : 'text-gray-300'} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(stat.stats).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-1">
                      <StatusBadge status={status as RecordStatus} size="sm" showDot={false} />
                      <span className="text-xs text-gray-500">{count}</span>
                    </div>
                  ))}
                  {Object.keys(stat.stats).length === 0 && (
                    <span className="text-xs text-gray-400">暂无记录</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">当前筛选：</span>
              <button
                onClick={() => setFilterType('all')}
                className={`text-sm px-3 py-1 rounded-md border transition-colors ${
                  filterType === 'all'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                全部 ({reviewData?.batchInfo.totalCount || 0})
              </button>
              {Object.values(RecordType).map(type => {
                const count = reviewData?.records.filter(r => r.recordType === type).length || 0;
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`text-sm px-3 py-1 rounded-md border transition-colors ${
                      filterType === type
                        ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {getRecordTypeLabel(type)} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowBatchModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                <CheckSquare size={14} />
                批量复核 ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => setShowExportPreview(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              导出报告
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading.review ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">暂无复核记录</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数据类型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">异常类型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">来源文件</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">导入人</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map(record => {
                    const bgColor = getStatusColor(record.status);
                    return (
                      <tr
                        key={record.id}
                        className={`hover:bg-gray-50 ${selectedIds.includes(record.id) ? 'bg-blue-50/50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(record.id)}
                            onChange={() => toggleSelected(record.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-md border ${typeColors[record.recordType]}`}>
                            {getRecordTypeLabel(record.recordType)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <p className="text-sm font-medium text-gray-800">{record.title}</p>
                            {record.description && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{record.description}</p>
                            )}
                            {(record.offlineMissing || record.isDuplicate) && (
                              <div className="flex items-center gap-1 mt-1">
                                {record.offlineMissing && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">离线缺失</span>
                                )}
                                {record.isDuplicate && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">重复导入</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{getExceptionTypeLabel(record.type)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700 truncate max-w-[180px]">
                            {record.source?.fileName || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <User size={12} />
                            <span>{record.source?.importer || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={12} />
                            <span>{formatDateTime(record.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/exceptions/${record.id}`}
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <Eye size={14} />
                            详情
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {reviewData && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div>
                  批次时间：{formatDateTime(reviewData.batchInfo.generatedAt)} · 共 {filteredRecords.length} 条待复核记录
                </div>
                <div>
                  复核材料类型：{reviewData.batchInfo.recordTypes.map(t => getRecordTypeLabel(t)).join('、')}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">批量复核</h3>
              <p className="text-sm text-gray-500 mt-1">已选择 {selectedIds.length} 条记录</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">复核人</label>
                <input
                  type="text"
                  value={reviewer}
                  onChange={e => setReviewer(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">复核结论</label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(RecordStatus).map(status => (
                    <button
                      key={status}
                      onClick={() => setBatchConclusion(status)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                        batchConclusion === status ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                      }`}
                    >
                      <StatusBadge status={status} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">复核意见</label>
                <textarea
                  value={batchComment}
                  onChange={e => setBatchComment(e.target.value)}
                  rows={3}
                  placeholder="请输入复核意见..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                <p className="font-medium mb-1">⚠️ 一致性说明</p>
                <p>复核后，界面状态与导出内容将保持一致，避免"页面显示通过、文件写待确认"的情况。</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleBatchSubmit}
                disabled={!batchComment.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={14} />
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">导出复核报告</h3>
              <p className="text-sm text-gray-500 mt-1">导出内容与界面摘要保持一致</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">导出格式</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`flex-1 p-3 rounded-lg border text-sm transition-colors ${
                      exportFormat === 'csv'
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">CSV 格式</p>
                    <p className="text-xs mt-0.5 opacity-70">适合 Excel 打开</p>
                  </button>
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`flex-1 p-3 rounded-lg border text-sm transition-colors ${
                      exportFormat === 'json'
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">JSON 格式</p>
                    <p className="text-xs mt-0.5 opacity-70">包含完整处理历史</p>
                  </button>
                </div>
              </div>

              {reviewData && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">导出预览摘要</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">记录总数</span>
                      <span className="font-medium text-gray-800">{reviewData.batchInfo.totalCount}</span>
                    </div>
                    {Object.entries(reviewData.batchInfo.recordTypes.reduce((acc, t) => {
                      const count = reviewData.records.filter(r => r.recordType === t).length;
                      return { ...acc, [t]: count };
                    }, {} as Record<string, number>)).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="text-gray-500">{getRecordTypeLabel(type as RecordType)}</span>
                        <span className="font-medium text-gray-800">{count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">状态分布：</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(RecordStatus).map(status => {
                        const count = reviewData.records.filter(r => r.status === status).length;
                        if (count === 0) return null;
                        return (
                          <span key={status} className="flex items-center gap-1 text-xs">
                            <StatusBadge status={status} size="sm" />
                            <span className="text-gray-600">× {count}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {consistencyResult && (
                <div className={`rounded-lg p-3 text-xs ${
                  consistencyResult.valid
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-amber-50 border border-amber-200 text-amber-700'
                }`}>
                  <p className="font-medium">
                    {consistencyResult.valid ? '✓ 一致性检查通过' : `⚠ 存在 ${consistencyResult.issues.length} 个一致性问题`}
                  </p>
                  {!consistencyResult.valid && (
                    <ul className="mt-1 space-y-0.5">
                      {consistencyResult.issues.slice(0, 2).map((issue, i) => (
                        <li key={i}>· {issue.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowExportPreview(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download size={14} />
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
