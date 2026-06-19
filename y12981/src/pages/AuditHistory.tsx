import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import {
  History, ArrowLeft, RotateCcw, User, Clock, FileText,
  ChevronDown, ChevronUp, GitCompare
} from 'lucide-react';
import { AuditLog, OperationType } from '../../shared/types';

const operationTypeLabels: Record<OperationType, string> = {
  import: '导入数据',
  diagnose: '执行诊断',
  modify: '修正数据',
  confirm: '确认结果',
  rollback: '回滚版本',
  permission: '权限变更',
  dictionary_change: '字典变更'
};

const operationTypeColors: Record<OperationType, string> = {
  import: 'bg-blue-500',
  diagnose: 'bg-green-500',
  modify: 'bg-yellow-500',
  confirm: 'bg-purple-500',
  rollback: 'bg-orange-500',
  permission: 'bg-pink-500',
  dictionary_change: 'bg-cyan-500'
};

const AuditHistory: React.FC = () => {
  const {
    auditLogs,
    auditTotal,
    loading,
    fetchAuditLogs,
    rollbackBatch,
    compareBatches,
    versionComparison,
    batches
  } = useStore();

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<OperationType | ''>('');
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [rollbackBatchId, setRollbackBatchId] = useState<string | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');
  const [compareBatchId1, setCompareBatchId1] = useState<string>('');
  const [compareBatchId2, setCompareBatchId2] = useState<string>('');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    fetchAuditLogs({ operationType: filterType || undefined });
  }, [filterType]);

  const handleRollback = async () => {
    if (rollbackBatchId && rollbackReason) {
      await rollbackBatch(rollbackBatchId, rollbackReason);
      setShowRollbackModal(false);
      setRollbackBatchId(null);
      setRollbackReason('');
    }
  };

  const handleCompare = () => {
    if (compareBatchId1 && compareBatchId2) {
      compareBatches(compareBatchId1, compareBatchId2);
      setShowCompareModal(true);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">审计历史</h1>
          <p className="text-navy-400 mt-1 text-sm">所有操作记录完整留痕，可追溯、可回滚</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as OperationType | '')}
            className="bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">全部操作类型</option>
            {Object.entries(operationTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <Button
            variant="secondary"
            icon={<GitCompare size={16} />}
            onClick={() => setShowCompareModal(true)}
          >
            版本对比
          </Button>
        </div>
      </div>

      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <div className="p-4 border-b border-navy-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">操作流水</h3>
          <span className="text-sm text-navy-400">共 {auditTotal} 条记录</span>
        </div>

        <div className="relative">
          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-navy-400">
              <History size={48} className="mx-auto mb-3 opacity-50" />
              <p>暂无审计记录</p>
            </div>
          ) : (
            <div className="relative pl-8 py-4">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-navy-700"></div>
              
              {auditLogs.map((log, idx) => (
                <div
                  key={log.id}
                  className={`relative mb-6 last:mb-0 ${
                    expandedLogId === log.id ? 'animate-slide-up' : ''
                  }`}
                >
                  <div
                    className={`absolute left-[-28px] w-6 h-6 rounded-full border-4 border-navy-800 ${
                      operationTypeColors[log.operationType]
                    } ${idx === 0 ? 'animate-pulse-slow' : ''}`}
                  ></div>

                  <div
                    className="bg-navy-700/50 rounded-xl p-4 border border-navy-700 hover:border-navy-600 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={log.operationType === 'rollback' ? 'warning' : 'normal' as any}>
                          {operationTypeLabels[log.operationType]}
                        </StatusBadge>
                        <span className="text-sm font-medium text-white">{log.description}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-navy-400 flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(log.timestamp).toLocaleString('zh-CN')}
                        </span>
                        {expandedLogId === log.id ? (
                          <ChevronUp size={16} className="text-navy-400" />
                        ) : (
                          <ChevronDown size={16} className="text-navy-400" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-navy-400">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        操作人: {log.operatorName}
                      </span>
                      {log.approverName && (
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          审批人: {log.approverName}
                        </span>
                      )}
                      {log.batchId && (
                        <span className="flex items-center gap-1 font-mono">
                          <FileText size={12} />
                          批次: {log.batchId.slice(0, 16)}...
                        </span>
                      )}
                    </div>

                    {expandedLogId === log.id && (
                      <div className="mt-4 pt-4 border-t border-navy-600 space-y-3 animate-fade-in">
                        {log.reason && (
                          <div>
                            <p className="text-xs text-navy-400 mb-1">操作原因</p>
                            <p className="text-sm text-navy-200 bg-navy-800 rounded-lg p-3">{log.reason}</p>
                          </div>
                        )}

                        {log.changes && log.changes.length > 0 && (
                          <div>
                            <p className="text-xs text-navy-400 mb-2">变更详情</p>
                            <div className="bg-navy-800 rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-navy-700/50">
                                  <tr>
                                    <th className="text-left p-2 text-xs text-navy-300">字段</th>
                                    <th className="text-left p-2 text-xs text-navy-300">变更前</th>
                                    <th className="text-left p-2 text-xs text-navy-300">变更后</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {log.changes.map((change, cidx) => (
                                    <tr key={cidx} className="border-t border-navy-700">
                                      <td className="p-2 font-mono text-white">{change.field}</td>
                                      <td className="p-2 text-red-400 font-mono">{change.oldValue}</td>
                                      <td className="p-2 text-green-400 font-mono">{change.newValue}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {log.batchId && log.operationType !== 'rollback' && (
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="danger"
                              icon={<RotateCcw size={14} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRollbackBatchId(log.batchId!);
                                setShowRollbackModal(true);
                              }}
                            >
                              回滚此版本
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showRollbackModal}
        onClose={() => setShowRollbackModal(false)}
        title="回滚确认"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <RotateCcw size={20} className="text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-400 font-medium">此操作将回滚到历史版本</p>
                <p className="text-sm text-navy-300 mt-1">
                  回滚操作会生成新的审计记录，原始数据将被保留用于备份校验。
                  请谨慎操作，回滚后需要重新执行诊断。
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-navy-300 mb-1 block">回滚原因</label>
            <textarea
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
              placeholder="请输入回滚原因，便于后续追溯..."
              rows={4}
              className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRollbackModal(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={handleRollback}
              disabled={!rollbackReason.trim()}
            >
              确认回滚
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        title="选择对比版本"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-navy-300 mb-2 block">版本 1（基准）</label>
              <select
                value={compareBatchId1}
                onChange={(e) => setCompareBatchId1(e.target.value)}
                className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">选择版本...</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {new Date(b.timestamp).toLocaleString('zh-CN')} - {b.operator}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-navy-300 mb-2 block">版本 2（对比）</label>
              <select
                value={compareBatchId2}
                onChange={(e) => setCompareBatchId2(e.target.value)}
                className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">选择版本...</option>
                {batches.filter(b => b.id !== compareBatchId1).map(b => (
                  <option key={b.id} value={b.id}>
                    {new Date(b.timestamp).toLocaleString('zh-CN')} - {b.operator}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {versionComparison && (
            <div className="border border-navy-700 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-navy-700/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-white">{versionComparison.summary.totalChanges}</p>
                  <p className="text-xs text-navy-400">总变更</p>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/30">
                  <p className="text-xl font-bold text-red-400">{versionComparison.summary.criticalChanges}</p>
                  <p className="text-xs text-navy-400">严重</p>
                </div>
                <div className="bg-orange-500/10 rounded-lg p-3 text-center border border-orange-500/30">
                  <p className="text-xl font-bold text-orange-400">{versionComparison.summary.warningChanges}</p>
                  <p className="text-xs text-navy-400">警告</p>
                </div>
              </div>

              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-navy-700 sticky top-0">
                    <tr>
                      <th className="text-left p-2 text-xs text-navy-300">字段</th>
                      <th className="text-left p-2 text-xs text-navy-300">类型</th>
                      <th className="text-left p-2 text-xs text-navy-300">版本 1</th>
                      <th className="text-left p-2 text-xs text-navy-300">版本 2</th>
                      <th className="text-left p-2 text-xs text-navy-300">级别</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versionComparison.differences.map((diff, idx) => (
                      <tr key={idx} className="border-t border-navy-700">
                        <td className="p-2 font-mono text-white text-xs">{diff.field}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            diff.changeType === 'added' ? 'bg-green-500/20 text-green-400' :
                            diff.changeType === 'removed' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {diff.changeType === 'added' ? '新增' : diff.changeType === 'removed' ? '删除' : '修改'}
                          </span>
                        </td>
                        <td className="p-2 text-xs text-navy-300 font-mono">
                          {diff.value1 != null ? String(diff.value1) : '-'}
                        </td>
                        <td className="p-2 text-xs text-navy-300 font-mono">
                          {diff.value2 != null ? String(diff.value2) : '-'}
                        </td>
                        <td className="p-2">
                          {diff.severity && (
                            <StatusBadge status={diff.severity}>
                              {diff.severity === 'critical' ? '严重' : diff.severity === 'warning' ? '警告' : '正常'}
                            </StatusBadge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCompareModal(false)}>
              关闭
            </Button>
            <Button
              variant="primary"
              onClick={handleCompare}
              disabled={!compareBatchId1 || !compareBatchId2}
            >
              开始对比
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AuditHistory;
