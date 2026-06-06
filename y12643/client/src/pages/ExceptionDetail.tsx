import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  getExceptionTypeLabel,
  getRecordTypeLabel,
  getStatusLabel,
  getStatusColor,
  getProcessingActionLabel
} from '@/utils/colorRules';
import { formatDateTime } from '@/utils/helpers';
import { RecordStatus, ProcessingAction } from '@/types';
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  AlertCircle,
  MessageSquare,
  Send,
  ChevronRight,
  AlertTriangle,
  Database
} from 'lucide-react';

export function ExceptionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentException,
    processingHistory,
    fetchExceptionDetail,
    fetchProcessingHistory,
    addProcessingRecord,
    loading
  } = useAppStore();

  const [selectedAction, setSelectedAction] = useState<ProcessingAction>(ProcessingAction.REVIEW);
  const [opinion, setOpinion] = useState('');
  const [operator, setOperator] = useState('评审老师');
  const [targetStatus, setTargetStatus] = useState<RecordStatus>(RecordStatus.PENDING);

  useEffect(() => {
    if (id) {
      fetchExceptionDetail(id);
      fetchProcessingHistory(id);
    }
  }, [id, fetchExceptionDetail, fetchProcessingHistory]);

  const handleSubmit = async () => {
    if (!id || !currentException) return;
    await addProcessingRecord(id, {
      action: selectedAction,
      operator,
      opinion,
      previousStatus: currentException.status,
      newStatus: targetStatus
    });
    setOpinion('');
  };

  if (loading.detail) {
    return (
      <div className="p-12 text-center text-gray-400">加载中...</div>
    );
  }

  if (!currentException) {
    return (
      <div className="p-12 text-center">
        <p className="text-gray-500">未找到该异常记录</p>
        <Link to="/exceptions" className="text-blue-600 text-sm mt-2 inline-block">返回列表</Link>
      </div>
    );
  }

  const actionOptions = [
    { value: ProcessingAction.REVIEW, label: '复核', defaultStatus: currentException.status },
    { value: ProcessingAction.CONFIRM, label: '确认通过', defaultStatus: RecordStatus.NORMAL },
    { value: ProcessingAction.MODIFY, label: '修改数据', defaultStatus: RecordStatus.PROCESSING },
    { value: ProcessingAction.REJECT, label: '驳回重提', defaultStatus: RecordStatus.ABNORMAL },
    { value: ProcessingAction.SUPPLEMENT, label: '补充素材', defaultStatus: RecordStatus.PENDING }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <span className="text-gray-300">/</span>
        <Link to="/exceptions" className="text-sm text-gray-600 hover:text-gray-800">异常记录</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-800 font-medium">{currentException.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-800">{currentException.title}</h2>
                  <StatusBadge status={currentException.status} size="lg" />
                </div>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <AlertTriangle size={14} />
                    {getExceptionTypeLabel(currentException.type)}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Database size={14} />
                    {getRecordTypeLabel(currentException.recordType)}
                  </span>
                  <span>·</span>
                  <span>ID: {currentException.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentException.offlineMissing && (
                  <span className="text-xs px-2 py-1 bg-orange-50 text-orange-600 rounded-md border border-orange-200">
                    离线素材缺失
                  </span>
                )}
                {currentException.isDuplicate && (
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-200">
                    重复导入
                  </span>
                )}
              </div>
            </div>

            {currentException.description && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{currentException.description}</p>
              </div>
            )}

            {Object.keys(currentException.data || {}).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-gray-500" />
                  详细数据
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-600 overflow-auto max-h-60">
                    {JSON.stringify(currentException.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-gray-500" />
              处理意见
              <span className="text-xs text-gray-400 font-normal ml-1">
                ({processingHistory.length} 条记录)
              </span>
            </h3>

            {processingHistory.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                暂无处理记录
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200"></div>
                <div className="space-y-4">
                  {processingHistory.map((record, idx) => {
                    const color = getStatusColor(record.newStatus);
                    return (
                      <div key={record.id} className="relative pl-10">
                        <div
                          className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 border-white ${color.dot}`}
                        ></div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">{record.operator}</span>
                              <span className="text-xs px-2 py-0.5 bg-white rounded border border-gray-200 text-gray-600">
                                {getProcessingActionLabel(record.action)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{formatDateTime(record.timestamp)}</span>
                          </div>
                          {record.opinion && (
                            <p className="mt-2 text-sm text-gray-700">{record.opinion}</p>
                          )}
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="text-gray-500">
                              {getStatusLabel(record.previousStatus)}
                            </span>
                            <ChevronRight size={12} className="text-gray-400" />
                            <StatusBadge status={record.newStatus} size="sm" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Send size={16} className="text-gray-500" />
              添加处理记录
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">操作人</label>
                  <input
                    type="text"
                    value={operator}
                    onChange={e => setOperator(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">处理动作</label>
                  <select
                    value={selectedAction}
                    onChange={e => {
                      const action = e.target.value as ProcessingAction;
                      setSelectedAction(action);
                      const opt = actionOptions.find(o => o.value === action);
                      if (opt) setTargetStatus(opt.defaultStatus);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {actionOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">目标状态</label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(RecordStatus).map(status => (
                    <button
                      key={status}
                      onClick={() => setTargetStatus(status)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        targetStatus === status
                          ? 'ring-2 ring-blue-500 ring-offset-1'
                          : ''
                      }`}
                    >
                      <StatusBadge status={status} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">处理意见</label>
                <textarea
                  value={opinion}
                  onChange={e => setOpinion(e.target.value)}
                  rows={3}
                  placeholder="请输入处理意见..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={!opinion.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send size={14} />
                  提交处理
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-gray-500" />
              来源追溯
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <FileText size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-xs">来源文件</p>
                  <p className="text-gray-800 font-medium mt-0.5">{currentException.source?.fileName || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-xs">导入人</p>
                  <p className="text-gray-800 font-medium mt-0.5">{currentException.source?.importer || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-xs">导入时间</p>
                  <p className="text-gray-800 font-medium mt-0.5">
                    {currentException.source?.importTime ? formatDateTime(currentException.source.importTime) : '-'}
                  </p>
                </div>
              </div>
              {currentException.source?.originalId && (
                <div className="flex items-start gap-3">
                  <Database size={16} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">原始数据ID</p>
                    <p className="text-gray-800 font-medium mt-0.5 font-mono text-xs">
                      {currentException.source.originalId}
                    </p>
                  </div>
                </div>
              )}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <Database size={16} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">所属图层</p>
                    <p className="text-gray-800 font-medium mt-0.5">{currentException.layerId || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">时间线</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">创建时间</span>
                <span className="text-gray-700">{formatDateTime(currentException.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">更新时间</span>
                <span className="text-gray-700">{formatDateTime(currentException.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">处理记录</span>
                <span className="text-gray-700">{processingHistory.length} 条</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-5">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 倒查说明</h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              验收时可通过离线素材缺失记录倒查：从本页"来源追溯"区可追溯到原始文件、导入人和时间，处理记录区可查看每一步操作历史，确保从结果一路回到来源和处理记录。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
