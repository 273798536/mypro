import { useState, useMemo } from 'react';
import {
  Clock,
  User,
  CheckCircle,
  XCircle,
  Send,
  Edit3,
  FileCheck,
  ChevronDown,
  ChevronUp,
  GitCompare,
  ArrowLeftRight,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency } from '../utils/calculationEngine';
import type { ApprovalLog, VersionSnapshot, VersionChange } from '../types';

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; badgeClass: string; dotClass: string; lineClass: string }
> = {
  submit: {
    label: '提交审批',
    icon: <Send className="w-4 h-4" />,
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
    lineClass: 'bg-blue-200',
  },
  approve: {
    label: '审批通过',
    icon: <CheckCircle className="w-4 h-4" />,
    badgeClass: 'bg-green-100 text-green-700 border-green-200',
    dotClass: 'bg-green-500',
    lineClass: 'bg-green-200',
  },
  reject: {
    label: '审批驳回',
    icon: <XCircle className="w-4 h-4" />,
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
    lineClass: 'bg-red-200',
  },
  modify: {
    label: '修改调整',
    icon: <Edit3 className="w-4 h-4" />,
    badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-500',
    lineClass: 'bg-orange-200',
  },
  complete: {
    label: '退款完成',
    icon: <FileCheck className="w-4 h-4" />,
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
    lineClass: 'bg-purple-200',
  },
};

const STATUS_STEPS = ['draft', 'pending_approval', 'approved', 'completed'] as const;
const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending_approval: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  completed: '已完成',
};

const FIELD_LABELS: Record<string, string> = {
  contractTotal: '合同总额',
  verifiedTotal: '已核销金额',
  unverifiedTotal: '未核销金额',
  treatmentCompletedCount: '已完成治疗次数',
  treatmentTotalCount: '总治疗次数',
  totalFee: '手续费总额',
  customerFeeShare: '客户承担手续费',
  storeFeeShare: '门店承担手续费',
  giftTotalValue: '赠品总价值',
  giftReturnedValue: '已归还赠品价值',
  giftDeduction: '赠品扣回金额',
  baseRefund: '基础退款',
  feeDeduction: '手续费扣除',
  finalRefund: '最终退款',
  paidAmount: '已付款金额',
  actualRefund: '实际退款金额',
};

export default function History() {
  const refundRequests = useStore((s) => s.refundRequests);
  const submitForApproval = useStore((s) => s.submitForApproval);
  const approveRefund = useStore((s) => s.approveRefund);
  const rejectRefund = useStore((s) => s.rejectRefund);
  const completeRefund = useStore((s) => s.completeRefund);

  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    refundRequests.length > 0 ? refundRequests[0].id : ''
  );
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [compareVersionA, setCompareVersionA] = useState<string>('');
  const [compareVersionB, setCompareVersionB] = useState<string>('');
  const [showCompare, setShowCompare] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRemark, setRejectRemark] = useState('');

  const selectedRequest = useMemo(
    () => refundRequests.find((r) => r.id === selectedRequestId),
    [refundRequests, selectedRequestId]
  );

  const sortedLogs = useMemo(() => {
    if (!selectedRequest) return [];
    return [...selectedRequest.approvalLogs].sort((a, b) => a.operateTime - b.operateTime);
  }, [selectedRequest]);

  const sortedVersions = useMemo(() => {
    if (!selectedRequest) return [];
    return [...selectedRequest.versionHistory].sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedRequest]);

  const currentStepIndex = useMemo(() => {
    if (!selectedRequest) return 0;
    const stepIndex = STATUS_STEPS.findIndex((s) => s === selectedRequest.status);
    return stepIndex === -1 ? 0 : stepIndex;
  }, [selectedRequest]);

  const toggleLogExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const handleCompare = () => {
    if (compareVersionA && compareVersionB && compareVersionA !== compareVersionB) {
      setShowCompare(true);
    }
  };

  const resetCompare = () => {
    setCompareVersionA('');
    setCompareVersionB('');
    setShowCompare(false);
  };

  const versionAData = useMemo(() => {
    if (!selectedRequest) return null;
    return selectedRequest.versionHistory.find((v) => v.version === compareVersionA);
  }, [selectedRequest, compareVersionA]);

  const versionBData = useMemo(() => {
    if (!selectedRequest) return null;
    return selectedRequest.versionHistory.find((v) => v.version === compareVersionB);
  }, [selectedRequest, compareVersionB]);

  const compareDiff = useMemo(() => {
    if (!versionAData || !versionBData) return [];
    const diffs: VersionChange[] = [];
    const fields = Object.keys(FIELD_LABELS) as Array<keyof typeof versionAData.calculation>;
    fields.forEach((field) => {
      const oldVal = versionAData.calculation[field];
      const newVal = versionBData.calculation[field];
      if (oldVal !== newVal) {
        diffs.push({
          field: field as string,
          oldValue: oldVal as number | string | boolean,
          newValue: newVal as number | string | boolean,
        });
      }
    });
    return diffs;
  }, [versionAData, versionBData]);

  const handleSubmit = () => {
    if (selectedRequestId) submitForApproval(selectedRequestId);
  };

  const handleApprove = () => {
    if (selectedRequestId) approveRefund(selectedRequestId);
  };

  const handleReject = () => {
    if (selectedRequestId && rejectRemark.trim()) {
      rejectRefund(selectedRequestId, rejectRemark.trim());
      setRejectModalOpen(false);
      setRejectRemark('');
    }
  };

  const handleComplete = () => {
    if (selectedRequestId) completeRefund(selectedRequestId);
  };

  const handleModify = () => {
    window.history.pushState({}, '', '/calculator');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">审批历史</h1>
          <p className="text-sm text-gray-500 mt-1">退款审批流程跟踪与版本管理</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-4 h-4" />
            <span>共 {sortedLogs.length} 条审批记录</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <User className="w-4 h-4" />
            <span>{sortedVersions.length} 个版本</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">选择退款申请：</label>
            <select
              value={selectedRequestId}
              onChange={(e) => {
                setSelectedRequestId(e.target.value);
                setExpandedLogId(null);
                resetCompare();
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#165DFF] focus:border-transparent bg-white min-w-64"
            >
              {refundRequests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.contract?.contractNo ?? r.contractId} - {r.contract?.customerName ?? '未知客户'} ({STATUS_LABELS[r.status]})
                </option>
              ))}
            </select>
          </div>

          {selectedRequest && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500">当前状态：</span>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  selectedRequest.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : selectedRequest.status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : selectedRequest.status === 'completed'
                    ? 'bg-purple-100 text-purple-700'
                    : selectedRequest.status === 'pending_approval'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {STATUS_LABELS[selectedRequest.status]}
              </span>
            </div>
          )}
        </div>

        {selectedRequest && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">审批流程进度</h3>
              <span className="text-xs text-gray-400">第 {currentStepIndex + 1} / {STATUS_STEPS.length} 步</span>
            </div>
            <div className="relative">
              <div className="absolute top-3 left-0 right-0 h-1 bg-gray-200 rounded-full" />
              <div
                className="absolute top-3 left-0 h-1 bg-[#165DFF] rounded-full transition-all duration-500"
                style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
              />
              <div className="relative flex justify-between">
                {STATUS_STEPS.map((step, idx) => {
                  const isActive = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <div key={step} className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 z-10 ${
                          isActive
                            ? 'bg-[#165DFF] text-white shadow-md shadow-[#165DFF]/30'
                            : 'bg-gray-200 text-gray-500'
                        } ${isCurrent ? 'ring-4 ring-[#165DFF]/20' : ''}`}
                      >
                        {idx + 1}
                      </div>
                      <span className={`text-xs mt-2 ${isActive ? 'text-[#165DFF] font-medium' : 'text-gray-400'}`}>
                        {STATUS_LABELS[step]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">审批时间线</h2>

          {sortedLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无审批记录</p>
            </div>
          ) : (
            <div className="relative">
              {sortedLogs.map((log, index) => {
                const config = ACTION_CONFIG[log.action];
                const isExpanded = expandedLogId === log.id;
                const isLast = index === sortedLogs.length - 1;
                const hasChanges = log.action === 'modify' && (log.beforeData || log.afterData);

                return (
                  <div key={log.id} className="relative pl-10 pb-8">
                    {!isLast && (
                      <div className={`absolute left-[15px] top-6 w-0.5 h-full ${config.lineClass}`} />
                    )}
                    <div
                      className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md ${config.dotClass}`}
                    >
                      {config.icon}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{log.operator}</span>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${config.badgeClass}`}
                          >
                            {config.icon}
                            {config.label}
                          </span>
                          <span className="text-xs text-gray-400">版本 {log.version}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.operateTime)}
                        </div>
                      </div>

                      {log.remark && (
                        <p className="mt-2 text-sm text-gray-600">{log.remark}</p>
                      )}

                      {hasChanges && (
                        <button
                          onClick={() => toggleLogExpand(log.id)}
                          className="mt-3 flex items-center gap-1 text-xs text-[#165DFF] hover:text-[#0E42CC] transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {isExpanded ? '收起修改详情' : '查看修改详情'}
                        </button>
                      )}

                      {isExpanded && hasChanges && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-2">修改前</p>
                              <div className="bg-white rounded border border-gray-200 p-3 space-y-1">
                                {log.beforeData &&
                                  Object.entries(log.beforeData).map(([key, value]) => (
                                    <div key={key} className="flex justify-between text-xs">
                                      <span className="text-gray-500">{FIELD_LABELS[key] ?? key}：</span>
                                      <span className="text-gray-700 font-medium">{typeof value === 'number' ? formatCurrency(value) : String(value)}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-2">修改后</p>
                              <div className="bg-white rounded border border-green-200 p-3 space-y-1">
                                {log.afterData &&
                                  Object.entries(log.afterData).map(([key, value]) => (
                                    <div key={key} className="flex justify-between text-xs">
                                      <span className="text-gray-500">{FIELD_LABELS[key] ?? key}：</span>
                                      <span className="text-green-700 font-medium">{typeof value === 'number' ? formatCurrency(value) : String(value)}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedRequest && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">版本历史</h2>
            <div className="flex items-center gap-2">
              {sortedVersions.length >= 2 && !showCompare && (
                <>
                  <select
                    value={compareVersionA}
                    onChange={(e) => setCompareVersionA(e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#165DFF]"
                  >
                    <option value="">选择版本A</option>
                    {sortedVersions.map((v) => (
                      <option key={v.version} value={v.version}>{v.version}</option>
                    ))}
                  </select>
                  <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                  <select
                    value={compareVersionB}
                    onChange={(e) => setCompareVersionB(e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#165DFF]"
                  >
                    <option value="">选择版本B</option>
                    {sortedVersions.map((v) => (
                      <option key={v.version} value={v.version}>{v.version}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCompare}
                    disabled={!compareVersionA || !compareVersionB || compareVersionA === compareVersionB}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#165DFF] text-white hover:bg-[#0E42CC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <GitCompare className="w-3 h-3" />
                    对比
                  </button>
                </>
              )}
              {showCompare && (
                <button
                  onClick={resetCompare}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  返回版本列表
                </button>
              )}
            </div>
          </div>

          {showCompare && versionAData && versionBData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#165DFF]/10 flex items-center justify-center">
                    <GitCompare className="w-5 h-5 text-[#165DFF]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">版本对比</p>
                    <p className="text-xs text-gray-500">{versionAData.version} ↔ {versionBData.version}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">共 {compareDiff.length} 处变更</p>
                </div>
              </div>

              {compareDiff.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  两个版本无差异
                </div>
              ) : (
                <div className="space-y-2">
                  {compareDiff.map((diff, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500 w-32">{FIELD_LABELS[diff.field] ?? diff.field}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-gray-700 bg-red-50 px-2 py-1 rounded line-through">
                          {typeof diff.oldValue === 'number' ? formatCurrency(diff.oldValue) : String(diff.oldValue)}
                        </span>
                        <ArrowLeftRight className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded font-medium">
                          {typeof diff.newValue === 'number' ? formatCurrency(diff.newValue) : String(diff.newValue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedVersions.map((v) => (
                <div
                  key={v.version}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    v.version === selectedRequest.currentVersion
                      ? 'border-[#165DFF] bg-[#165DFF]/5'
                      : 'border-gray-200 bg-white hover:border-[#165DFF]/30 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                        v.version === selectedRequest.currentVersion
                          ? 'bg-[#165DFF] text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {v.version}
                      </span>
                      {v.version === selectedRequest.currentVersion && (
                        <span className="text-xs text-[#165DFF]">当前版本</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDate(v.timestamp)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <User className="w-3 h-3" />
                    <span>{v.operator}</span>
                  </div>
                  {v.remark && (
                    <p className="text-xs text-gray-600 mb-2">{v.remark}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">实退金额</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(v.calculation.actualRefund)}</span>
                  </div>
                  {v.changes && v.changes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">变更字段：{v.changes.length} 项</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedRequest && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">操作</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleModify}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              返回修改
            </button>

            {selectedRequest.status === 'draft' && (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20"
              >
                <Send className="w-4 h-4" />
                提交审批
              </button>
            )}

            {selectedRequest.status === 'pending_approval' && (
              <>
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm shadow-green-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  审批通过
                </button>
                <button
                  onClick={() => setRejectModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm shadow-red-500/20"
                >
                  <XCircle className="w-4 h-4" />
                  驳回
                </button>
              </>
            )}

            {selectedRequest.status === 'approved' && (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors shadow-sm shadow-purple-500/20"
              >
                <FileCheck className="w-4 h-4" />
                完成退款
              </button>
            )}
          </div>
        </div>
      )}

      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setRejectModalOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">驳回审批</h3>
            <p className="text-sm text-gray-500 mb-4">请输入驳回原因</p>
            <textarea
              value={rejectRemark}
              onChange={(e) => setRejectRemark(e.target.value)}
              rows={4}
              placeholder="请详细说明驳回原因..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectRemark('');
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectRemark.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}