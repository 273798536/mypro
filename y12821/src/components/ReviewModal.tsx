import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, Skull } from 'lucide-react';
import { SampleStatus, STATUS_LABELS } from '../../shared/types';
import { useSampleStore } from '../store/useSampleStore';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sampleId: string;
  sampleCode: string;
  sampleName: string;
  currentStatus: SampleStatus;
  isContaminated?: boolean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  sampleId,
  sampleCode,
  sampleName,
  currentStatus,
  isContaminated,
}) => {
  const [newStatus, setNewStatus] = useState<SampleStatus>(currentStatus);
  const [opinion, setOpinion] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const reviewSample = useSampleStore((state) => state.reviewSample);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newStatus === currentStatus && !opinion.trim()) {
      setError('状态未改变时请填写复核意见');
      return;
    }

    if (!reason.trim()) {
      setError('请填写变更原因，这是审计追踪的必要信息');
      return;
    }

    if (isContaminated && newStatus !== 'contaminated') {
      if (reason.length < 20) {
        setError('污染样本复核通过时，请详细说明原因（至少20字），这将永久记录在审计日志中');
        return;
      }
    }

    reviewSample(sampleId, newStatus, opinion, reason);
    onClose();
    setNewStatus('pending');
    setOpinion('');
    setReason('');
  };

  const statusOptions: { value: SampleStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'normal', label: '正常样本', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { value: 'borderline', label: '边界样本', icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'contaminated', label: '污染样本', icon: <Skull className="w-4 h-4" />, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">样本复核</h3>
            <p className="text-sm text-slate-500 mt-0.5">{sampleCode} - {sampleName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {isContaminated && (
          <div className="mx-6 mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-rose-800">⚠️ 污染样本特殊处理</p>
              <p className="text-sm text-rose-700 mt-1">
                该样本已标记为污染。如您确认要复核通过，请详细说明原因，此操作将永久记录在审计日志中。
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              当前状态
            </label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
              {STATUS_LABELS[currentStatus]}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              复核结论 <span className="text-rose-500">*</span>
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
              复核意见
            </label>
            <textarea
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              placeholder="请详细描述您的复核依据，如检测结果、观察到的现象等..."
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              变更原因 <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isContaminated ? "请详细说明为何对污染样本进行此操作（至少20字）..." : "请说明变更原因，这将记录在审计日志中..."}
              rows={2}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm ${
                isContaminated ? 'border-rose-300 bg-rose-50/50' : 'border-slate-300'
              }`}
            />
            {isContaminated && (
              <p className="text-xs text-rose-600 mt-1">
                已输入 {reason.length} 字，至少需要 20 字
              </p>
            )}
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
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              提交复核
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
