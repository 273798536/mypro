import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, Skull } from 'lucide-react';
import { SampleStatus, STATUS_LABELS } from '../../shared/types';
import { useSampleStore } from '../store/useSampleStore';

interface ManualConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  sampleId: string;
  sampleCode: string;
  sampleName: string;
  currentStatus: SampleStatus;
  autoJudge: SampleStatus;
}

export const ManualConfirmModal: React.FC<ManualConfirmModalProps> = ({
  isOpen,
  onClose,
  sampleId,
  sampleCode,
  sampleName,
  currentStatus,
  autoJudge,
}) => {
  const [newStatus, setNewStatus] = useState<SampleStatus>(currentStatus);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const manualConfirm = useSampleStore((state) => state.manualConfirm);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newStatus === currentStatus) {
      setError('人工确认需要修改状态，请选择不同的结论');
      return;
    }

    if (!reason.trim() || reason.length < 10) {
      setError('请详细说明人工确认的原因（至少10字），这将永久记录在审计日志中');
      return;
    }

    manualConfirm(sampleId, newStatus, reason);
    onClose();
    setReason('');
  };

  const statusOptions: { value: SampleStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'normal', label: '正常样本', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { value: 'borderline', label: '边界样本', icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'contaminated', label: '污染样本', icon: <Skull className="w-4 h-4" />, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">人工确认</h3>
            <p className="text-sm text-slate-500 mt-0.5">{sampleCode} - {sampleName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">人工强制确认</p>
              <p className="text-sm text-amber-700 mt-1">
                此操作将覆盖系统自动判断（{STATUS_LABELS[autoJudge]}），并永久记录在审计日志中。请谨慎操作。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                系统判断
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm">
                {STATUS_LABELS[autoJudge]}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                当前状态
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm">
                {STATUS_LABELS[currentStatus]}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              人工确认结论 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNewStatus(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1.5 ${
                    newStatus === option.value
                      ? `${option.color} border-current shadow-sm`
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {option.icon}
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              人工确认原因 <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请详细说明为何进行人工确认，如：重新检测结果、特殊情况说明等（至少10字）..."
              rows={3}
              className="w-full px-4 py-2.5 border border-amber-300 bg-amber-50/30 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none text-sm"
            />
            <p className="text-xs text-amber-600 mt-1">
              已输入 {reason.length} 字，至少需要 10 字
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium shadow-sm"
            >
              确认提交
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
