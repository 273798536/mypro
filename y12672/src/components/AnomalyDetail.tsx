import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useExport } from '../utils/export';
import { X, User, Calendar, FileText, AlertTriangle, MessageSquare, Download, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProcessingRecord, HistoryLog } from '../types';

export default function AnomalyDetail() {
  const selectedAnomaly = useAppStore((state) => state.selectedAnomaly);
  const setSelectedAnomaly = useAppStore((state) => state.setSelectedAnomaly);
  const getProcessingRecordsByAnomalyId = useAppStore((state) => state.getProcessingRecordsByAnomalyId);
  const getHistoryLogsByTargetId = useAppStore((state) => state.getHistoryLogsByTargetId);
  const addProcessingRecord = useAppStore((state) => state.addProcessingRecord);
  const addHistoryLog = useAppStore((state) => state.addHistoryLog);
  const updateAnomalyStatus = useAppStore((state) => state.updateAnomalyStatus);

  const { exportAnomalyDetail } = useExport();

  const [showRiskNote, setShowRiskNote] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [riskNoteText, setRiskNoteText] = useState('');
  const [suggestionText, setSuggestionText] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [showRiskHistory, setShowRiskHistory] = useState(false);
  const [showSuggestionHistory, setShowSuggestionHistory] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'add_risk_note' | 'add_suggestion' | 'change_status' | 'review';
    newStatus?: 'pending' | 'processing' | 'processed' | 'reviewed';
  } | null>(null);

  if (!selectedAnomaly) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>选择一个异常记录查看详情</p>
        </div>
      </div>
    );
  }

  const processingRecords = getProcessingRecordsByAnomalyId(selectedAnomaly.id);
  const historyLogs = getHistoryLogsByTargetId(selectedAnomaly.id);

  const riskNoteHistory = historyLogs.filter((log) => log.action === 'add_risk_note').sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const suggestionHistory = historyLogs.filter((log) => log.action === 'add_suggestion').sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'processing':
        return '处理中';
      case 'processed':
        return '已处理';
      case 'reviewed':
        return '已复核';
      default:
        return status;
    }
  };

  const handleAddRiskNote = () => {
    setShowRiskNote(true);
    setShowSuggestion(false);
  };

  const handleAddSuggestion = () => {
    setShowSuggestion(true);
    setShowRiskNote(false);
  };

  const confirmAction = (type: 'add_risk_note' | 'add_suggestion' | 'change_status' | 'review', newStatus?: 'pending' | 'processing' | 'processed' | 'reviewed') => {
    setPendingAction({ type, newStatus });
    setShowReasonModal(true);
  };

  const executeAction = () => {
    if (!pendingAction || !reasonText.trim()) return;

    const operator = '当前用户';
    const operatorRole = 'operations_team';

    if (pendingAction.type === 'add_risk_note') {
      const newRecord: ProcessingRecord = {
        id: `pr_${Date.now()}`,
        anomalyId: selectedAnomaly.id,
        operator,
        operatorRole,
        action: 'add_risk_note',
        beforeValue: selectedAnomaly.riskNote,
        afterValue: riskNoteText,
        timestamp: new Date(),
      };
      addProcessingRecord(newRecord);

      const newLog: HistoryLog = {
        id: `log_${Date.now()}`,
        targetType: 'anomaly',
        targetId: selectedAnomaly.id,
        operator,
        operatorRole,
        action: 'add_risk_note',
        beforeState: { riskNote: selectedAnomaly.riskNote || '' },
        afterState: { riskNote: riskNoteText },
        reason: reasonText,
        timestamp: new Date(),
      };
      addHistoryLog(newLog);

      selectedAnomaly.riskNote = riskNoteText;
      selectedAnomaly.updatedAt = new Date();
    } else if (pendingAction.type === 'add_suggestion') {
      const newRecord: ProcessingRecord = {
        id: `pr_${Date.now()}`,
        anomalyId: selectedAnomaly.id,
        operator,
        operatorRole,
        action: 'add_suggestion',
        beforeValue: selectedAnomaly.processingSuggestion,
        afterValue: suggestionText,
        timestamp: new Date(),
      };
      addProcessingRecord(newRecord);

      const newLog: HistoryLog = {
        id: `log_${Date.now()}`,
        targetType: 'anomaly',
        targetId: selectedAnomaly.id,
        operator,
        operatorRole,
        action: 'add_suggestion',
        beforeState: { processingSuggestion: selectedAnomaly.processingSuggestion || '' },
        afterState: { processingSuggestion: suggestionText },
        reason: reasonText,
        timestamp: new Date(),
      };
      addHistoryLog(newLog);

      selectedAnomaly.processingSuggestion = suggestionText;
      selectedAnomaly.updatedAt = new Date();
    } else if (pendingAction.type === 'change_status' && pendingAction.newStatus) {
      const newRecord: ProcessingRecord = {
        id: `pr_${Date.now()}`,
        anomalyId: selectedAnomaly.id,
        operator,
        operatorRole,
        action: 'change_status',
        beforeValue: selectedAnomaly.status,
        afterValue: pendingAction.newStatus,
        timestamp: new Date(),
      };
      addProcessingRecord(newRecord);

      const newLog: HistoryLog = {
        id: `log_${Date.now()}`,
        targetType: 'anomaly',
        targetId: selectedAnomaly.id,
        operator,
        operatorRole,
        action: 'change_status',
        beforeState: { status: selectedAnomaly.status },
        afterState: { status: pendingAction.newStatus },
        reason: reasonText,
        timestamp: new Date(),
      };
      addHistoryLog(newLog);

      updateAnomalyStatus(selectedAnomaly.id, pendingAction.newStatus);
    } else if (pendingAction.type === 'review') {
      const newRecord: ProcessingRecord = {
        id: `pr_${Date.now()}`,
        anomalyId: selectedAnomaly.id,
        operator,
        operatorRole,
        action: 'review',
        beforeValue: selectedAnomaly.status,
        afterValue: 'reviewed',
        timestamp: new Date(),
      };
      addProcessingRecord(newRecord);

      const newLog: HistoryLog = {
        id: `log_${Date.now()}`,
        targetType: 'anomaly',
        targetId: selectedAnomaly.id,
        operator,
        operatorRole,
        action: 'review',
        beforeState: { status: selectedAnomaly.status },
        afterState: { status: 'reviewed' },
        reason: reasonText,
        timestamp: new Date(),
      };
      addHistoryLog(newLog);

      updateAnomalyStatus(selectedAnomaly.id, 'reviewed');
    }

    setShowReasonModal(false);
    setShowRiskNote(false);
    setShowSuggestion(false);
    setRiskNoteText('');
    setSuggestionText('');
    setReasonText('');
    setPendingAction(null);
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'add_risk_note':
        return '添加风险备注';
      case 'add_suggestion':
        return '填写处理意见';
      case 'change_status':
        return '修改状态';
      case 'update_status':
        return '更新状态';
      case 'review':
        return '复核确认';
      case 'review_confirm':
        return '复核通过';
      case 'export':
        return '导出记录';
      case 'position_modified':
        return '位置修改';
      default:
        return action;
    }
  };

  const handleExportDetail = () => {
    exportAnomalyDetail(selectedAnomaly.id);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">异常详情</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDetail}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            导出追溯报告
          </button>
          <button
            onClick={() => setSelectedAnomaly(null)}
            className="p-1 hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">基本信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">异常类型：</span>
                <span className="font-semibold text-slate-800">
                  {selectedAnomaly.type === 'model_overlap'
                    ? '模型重叠'
                    : selectedAnomaly.type === 'camera_lost'
                    ? '相机视角丢失'
                    : selectedAnomaly.type === 'size_exceed'
                    ? '尺寸超限'
                    : '位置偏移'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">严重程度：</span>
                <span
                  className={`font-semibold ${
                    selectedAnomaly.severity === 'high'
                      ? 'text-red-600'
                      : selectedAnomaly.severity === 'medium'
                      ? 'text-amber-600'
                      : 'text-yellow-600'
                  }`}
                >
                  {selectedAnomaly.severity === 'high'
                    ? '高危'
                    : selectedAnomaly.severity === 'medium'
                    ? '中危'
                    : '低危'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">处理状态：</span>
                <span className="font-semibold text-slate-800">
                  {getStatusLabel(selectedAnomaly.status)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">创建时间：</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedAnomaly.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              来源信息
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">导入批次：</span>
                <span className="font-mono text-slate-800">{selectedAnomaly.sourceInfo.importBatch}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">源文件：</span>
                <span className="text-slate-800">{selectedAnomaly.sourceInfo.sourceFile}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">导入时间：</span>
                <span className="text-slate-800">
                  {new Date(selectedAnomaly.sourceInfo.importTime).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                风险备注
              </h3>
              {riskNoteHistory.length > 0 && (
                <button
                  onClick={() => setShowRiskHistory(!showRiskHistory)}
                  className="flex items-center gap-1 text-sm text-red-700 hover:text-red-900"
                >
                  {riskNoteHistory.length} 条变更记录
                  {showRiskHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>
            <div className="bg-white rounded p-3 border border-red-100 mb-4">
              <p className="text-slate-800">{selectedAnomaly.riskNote || '暂无风险备注'}</p>
            </div>

            {showRiskHistory && riskNoteHistory.length > 0 && (
              <div className="mb-4 space-y-2">
                {riskNoteHistory.map((log, index) => (
                  <div key={log.id} className="bg-white rounded p-3 border border-red-100">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-slate-700">{log.operator}</span>
                      </div>
                      <span className="text-slate-500">
                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    {index < riskNoteHistory.length - 1 && (
                      <div className="flex items-start gap-2 text-xs mb-2 text-slate-600">
                        <div className="flex-1">
                          <span className="text-slate-500">之前：</span>
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                            {(log.beforeState as { riskNote?: string }).riskNote || '(空)'}
                          </span>
                        </div>
                        <ArrowRight className="w-3 h-3 mt-1 text-slate-400" />
                        <div className="flex-1">
                          <span className="text-slate-500">之后：</span>
                          <span className="font-mono bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            {(log.afterState as { riskNote?: string }).riskNote || '(空)'}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold">原因：</span>{log.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showRiskNote ? (
              <div className="space-y-2">
                <textarea
                  value={riskNoteText}
                  onChange={(e) => setRiskNoteText(e.target.value)}
                  placeholder="输入风险备注..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmAction('add_risk_note')}
                    disabled={!riskNoteText.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    确认
                  </button>
                  <button
                    onClick={() => setShowRiskNote(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleAddRiskNote}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {selectedAnomaly.riskNote ? '修改风险备注' : '添加风险备注'}
              </button>
            )}
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                处理意见
              </h3>
              {suggestionHistory.length > 0 && (
                <button
                  onClick={() => setShowSuggestionHistory(!showSuggestionHistory)}
                  className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900"
                >
                  {suggestionHistory.length} 条变更记录
                  {showSuggestionHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>
            <div className="bg-white rounded p-3 border border-green-100 mb-4">
              <p className="text-slate-800">{selectedAnomaly.processingSuggestion || '暂无处理意见'}</p>
            </div>

            {showSuggestionHistory && suggestionHistory.length > 0 && (
              <div className="mb-4 space-y-2">
                {suggestionHistory.map((log, index) => (
                  <div key={log.id} className="bg-white rounded p-3 border border-green-100">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-slate-700">{log.operator}</span>
                      </div>
                      <span className="text-slate-500">
                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    {index < suggestionHistory.length - 1 && (
                      <div className="flex items-start gap-2 text-xs mb-2 text-slate-600">
                        <div className="flex-1">
                          <span className="text-slate-500">之前：</span>
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                            {(log.beforeState as { processingSuggestion?: string }).processingSuggestion || '(空)'}
                          </span>
                        </div>
                        <ArrowRight className="w-3 h-3 mt-1 text-slate-400" />
                        <div className="flex-1">
                          <span className="text-slate-500">之后：</span>
                          <span className="font-mono bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            {(log.afterState as { processingSuggestion?: string }).processingSuggestion || '(空)'}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold">原因：</span>{log.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showSuggestion ? (
              <div className="space-y-2">
                <textarea
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  placeholder="输入处理意见..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmAction('add_suggestion')}
                    disabled={!suggestionText.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    确认
                  </button>
                  <button
                    onClick={() => setShowSuggestion(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleAddSuggestion}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {selectedAnomaly.processingSuggestion ? '修改处理意见' : '填写处理意见'}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {selectedAnomaly.status === 'pending' && (
              <button
                onClick={() => confirmAction('change_status', 'processing')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                开始处理
              </button>
            )}
            {selectedAnomaly.status === 'processing' && (
              <button
                onClick={() => confirmAction('change_status', 'processed')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                标记已处理
              </button>
            )}
            {selectedAnomaly.status === 'processed' && (
              <button
                onClick={() => confirmAction('review')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                复核确认
              </button>
            )}
            {selectedAnomaly.status === 'reviewed' && (
              <div className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-semibold">
                已复核完成
              </div>
            )}
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              完整处理历史追溯
            </h3>
            {processingRecords.length === 0 && historyLogs.length === 0 ? (
              <p className="text-slate-600 text-sm">暂无处理记录</p>
            ) : (
              <div className="space-y-3">
                {[
                  ...processingRecords.map((r) => ({ ...r, __type: 'processing' as const })),
                  ...historyLogs
                    .filter((h) => !processingRecords.some((p) => p.action === h.action))
                    .map((h) => ({ ...h, __type: 'history' as const })),
                ]
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  .map((record) => {
                    const isHistory = record.__type === 'history';
                    
                    return (
                      <div key={record.id} className="bg-white rounded p-3 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-800">{record.operator}</span>
                            <span className="text-xs text-slate-500">
                              {record.operatorRole === 'simulation_engineer' ? '仿真工程师' : '运维人员'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(record.timestamp).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 mb-1">
                          <span className="font-semibold">{getActionLabel(record.action)}：</span>
                          {record.action === 'change_status' || record.action === 'update_status' ? (
                            <span>
                              {getStatusLabel(
                                isHistory
                                  ? ((record.beforeState as { status?: string }).status || '')
                                  : ((record as ProcessingRecord).beforeValue || '')
                              )}
                              {' → '}
                              {getStatusLabel(
                                isHistory
                                  ? ((record.afterState as { status?: string }).status || '')
                                  : ((record as ProcessingRecord).afterValue || '')
                              )}
                            </span>
                          ) : record.action === 'review' || record.action === 'review_confirm' ? (
                            <span>
                              {getStatusLabel(
                                isHistory
                                  ? ((record.beforeState as { status?: string }).status || '')
                                  : ((record as ProcessingRecord).beforeValue || '')
                              )}
                              {' → 已复核通过'}
                            </span>
                          ) : isHistory && (record.action === 'add_risk_note' || record.action === 'add_suggestion') ? (
                            <span className="text-slate-600">
                              修改前 → 修改后（原因：{(record as HistoryLog).reason}）
                            </span>
                          ) : !isHistory ? (
                            (record as ProcessingRecord).afterValue
                          ) : (
                            JSON.stringify(record.afterState)
                          )}
                        </p>
                        {isHistory && (record as HistoryLog).reason && record.action !== 'add_risk_note' && record.action !== 'add_suggestion' && (
                          <p className="text-xs text-slate-500">
                            原因：{(record as HistoryLog).reason}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">填写操作原因</h3>
            <p className="text-sm text-slate-600 mb-3">
              所有操作都会记录到历史追溯中，方便后续审计。
            </p>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="请输入操作原因（必填）..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              rows={4}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setReasonText('');
                  setPendingAction(null);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                取消
              </button>
              <button
                onClick={executeAction}
                disabled={!reasonText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认操作
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
