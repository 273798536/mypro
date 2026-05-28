import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getStatusLabel } from '@/utils/formatters';
import type { RefundOrder, RefundStatus } from '@/types';

interface RefundCorrectionModalProps {
  refund: RefundOrder;
  isOpen: boolean;
  onClose: () => void;
}

const availableStatuses: RefundStatus[] = ['pending', 'approved', 'rejected', 'frozen', 'processed', 'failed'];

export function RefundCorrectionModal({ refund, isOpen, onClose }: RefundCorrectionModalProps) {
  const correctRefund = useAppStore(state => state.correctRefund);
  const updateRefundStatus = useAppStore(state => state.updateRefundStatus);
  
  const [status, setStatus] = useState<RefundStatus>(refund.status);
  const [amount, setAmount] = useState(refund.amount.toString());
  const [duplicateExplanation, setDuplicateExplanation] = useState(refund.duplicateExplanation || '');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!reason.trim()) {
      newErrors.reason = '请填写修正原因';
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = '请输入有效的金额';
    }
    
    if (refund.isDuplicate && !duplicateExplanation.trim() && status !== 'rejected') {
      newErrors.duplicateExplanation = '该退款单存在重复退款，必须填写解释后方可继续处理';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const updates: Partial<RefundOrder> = {
      status,
      amount: parseFloat(amount),
    };

    if (duplicateExplanation.trim()) {
      updates.duplicateExplanation = duplicateExplanation.trim();
    }

    if (status !== refund.status) {
      updateRefundStatus(refund.id, status, reason);
    } else {
      correctRefund(refund.id, updates, reason);
    }

    onClose();
  };

  const handleStatusChange = (newStatus: RefundStatus) => {
    setStatus(newStatus);
    
    if (newStatus === 'rejected') {
      setErrors(prev => {
        const { duplicateExplanation, ...rest } = prev;
        return rest;
      });
    } else if (refund.isDuplicate && !duplicateExplanation.trim()) {
      setErrors(prev => ({
        ...prev,
        duplicateExplanation: '该退款单存在重复退款，必须填写解释后方可继续处理'
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b-2 border-slate-200">
          <h3 className="text-lg font-black font-mono text-slate-800">
            修正退款单
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-mono font-medium text-amber-800">修正操作将被永久记录</p>
                <p className="text-xs text-amber-600 mt-1">所有修改将记录到操作历史中，包含变更前后对比</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-mono font-medium text-slate-700 mb-2">
                退款单号
              </label>
              <code className="block w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded font-mono text-sm text-slate-600">
                {refund.id}
              </code>
            </div>

            <div>
              <label className="block text-sm font-mono font-medium text-slate-700 mb-2">
                当前状态 → 新状态
              </label>
              <div className="flex items-center gap-3">
                <StatusBadge status={refund.status} size="md" />
                <span className="text-slate-400">→</span>
                <select
                  value={status}
                  onChange={e => handleStatusChange(e.target.value as RefundStatus)}
                  className="px-3 py-2 border-2 border-slate-300 rounded font-mono text-sm focus:border-amber-500 focus:outline-none transition-colors"
                >
                  {availableStatuses.map(s => (
                    <option key={s} value={s}>{getStatusLabel(s)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono font-medium text-slate-700 mb-2">
                退款金额
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">¥</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value);
                    setErrors(prev => {
                      const { amount, ...rest } = prev;
                      return rest;
                    });
                  }}
                  step="0.01"
                  min="0"
                  className={`w-full pl-8 pr-3 py-2 border-2 rounded font-mono text-sm focus:border-amber-500 focus:outline-none transition-colors ${
                    errors.amount ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-red-600 mt-1 font-mono">{errors.amount}</p>
              )}
            </div>

            {refund.isDuplicate && (
              <div>
                <label className="block text-sm font-mono font-medium text-slate-700 mb-2">
                  重复退款解释 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={duplicateExplanation}
                  onChange={e => {
                    setDuplicateExplanation(e.target.value);
                    if (e.target.value.trim()) {
                      setErrors(prev => {
                        const { duplicateExplanation, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  placeholder="请说明为什么同一订单存在多笔退款申请..."
                  rows={3}
                  className={`w-full px-3 py-2 border-2 rounded font-mono text-sm focus:border-amber-500 focus:outline-none transition-colors resize-none ${
                    errors.duplicateExplanation ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.duplicateExplanation && (
                  <p className="text-xs text-red-600 mt-1 font-mono">{errors.duplicateExplanation}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-mono font-medium text-slate-700 mb-2">
                修正原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => {
                  setReason(e.target.value);
                  if (e.target.value.trim()) {
                    setErrors(prev => {
                      const { reason, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                placeholder="请详细说明修正原因，以便后续审计..."
                rows={3}
                className={`w-full px-3 py-2 border-2 rounded font-mono text-sm focus:border-amber-500 focus:outline-none transition-colors resize-none ${
                  errors.reason ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
              />
              {errors.reason && (
                <p className="text-xs text-red-600 mt-1 font-mono">{errors.reason}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t-2 border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-mono text-slate-600 bg-white border-2 border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-mono font-semibold text-white bg-amber-600 border-2 border-amber-700 rounded hover:bg-amber-700 transition-colors"
          >
            确认修正
          </button>
        </div>
      </div>
    </div>
  );
}
