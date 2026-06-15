import { useState } from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { ComplaintStatus } from '../utils/types';
import { STATUS_LABELS } from '../utils/constants';
import { Modal } from './Modal';
import { cn } from '../lib/utils';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, nextStep: string) => void;
  currentStatus: ComplaintStatus;
  newStatus: ComplaintStatus;
  requireConfirmation?: boolean;
}

export function StatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  newStatus,
  requireConfirmation = false,
}: StatusChangeModalProps) {
  const [reason, setReason] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (requireConfirmation) {
      if (!reason.trim()) newErrors.reason = '请填写变更原因';
      if (!nextStep.trim()) newErrors.nextStep = '请填写下一步计划';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    onConfirm(reason, nextStep);
    setReason('');
    setNextStep('');
    setErrors({});
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="状态变更确认" size="md">
      <div className="space-y-5">
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="text-center">
            <span className={cn(
              'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium',
              'bg-slate-100 text-slate-700'
            )}>
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>
          <ArrowRight className="w-6 h-6 text-slate-400" />
          <div className="text-center">
            <span className={cn(
              'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium',
              'bg-blue-100 text-blue-700'
            )}>
              {STATUS_LABELS[newStatus]}
            </span>
          </div>
        </div>

        {requireConfirmation && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 mb-1">需要人工确认</h4>
              <p className="text-sm text-amber-700">
                此状态变更涉及重要决策，请详细填写变更原因和下一步计划，
                以便后续追溯和跟进。
              </p>
            </div>
          </div>
        )}

        {requireConfirmation ? (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                变更原因 <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请说明状态变更的原因..."
                rows={3}
                className={cn(
                  'w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none',
                  errors.reason ? 'border-rose-300' : 'border-slate-300'
                )}
              />
              {errors.reason && (
                <p className="text-xs text-rose-500 mt-1">{errors.reason}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                下一步计划 <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="请说明下一步的具体安排..."
                rows={3}
                className={cn(
                  'w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none',
                  errors.nextStep ? 'border-rose-300' : 'border-slate-300'
                )}
              />
              {errors.nextStep && (
                <p className="text-xs text-rose-500 mt-1">{errors.nextStep}</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                变更原因（可选）
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请说明状态变更的原因..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                下一步计划（可选）
              </label>
              <textarea
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="请说明下一步的具体安排..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={requireConfirmation && (!reason.trim() || !nextStep.trim())}
            className={cn(
              'px-6 py-2 text-white rounded-lg font-medium transition-colors',
              requireConfirmation && (!reason.trim() || !nextStep.trim())
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            )}
          >
            确认变更
          </button>
        </div>
      </div>
    </Modal>
  );
}
