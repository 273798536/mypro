import { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import type { RecordStatus } from '../shared/types';

interface JudgmentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newStatus: RecordStatus, reason: string, markAsException?: boolean) => Promise<boolean>;
  currentStatus?: RecordStatus;
  recordCode?: string;
}

const statusOptions: { value: RecordStatus; label: string }[] = [
  { value: 'pending', label: '待处理' },
  { value: 'approved', label: '已通过' },
  { value: 'exception', label: '异常' },
  { value: 'need_evidence', label: '待补证' },
  { value: 'suspected_duplicate', label: '疑似重复' },
];

export default function JudgmentModal({ open, onClose, onConfirm, currentStatus, recordCode }: JudgmentModalProps) {
  const [newStatus, setNewStatus] = useState<RecordStatus>(currentStatus || 'pending');
  const [reason, setReason] = useState('');
  const [markAsException, setMarkAsException] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    const ok = await onConfirm(newStatus, reason.trim(), markAsException);
    setSubmitting(false);
    if (ok) {
      setNewStatus(currentStatus || 'pending');
      setReason('');
      setMarkAsException(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-paper rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-200 animate-slideIn">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-serif font-semibold text-lg text-text-dark">改判记录状态</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {recordCode && (
            <div className="text-sm text-gray-600 font-mono">{recordCode}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1.5">
              选择新状态 <span className="text-accent">*</span>
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as RecordStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="markAsException"
              checked={markAsException}
              onChange={(e) => setMarkAsException(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="markAsException" className="text-sm text-gray-700">
              同时标记为异常
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1.5">
              改判理由 <span className="text-accent">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="请详细说明改判理由..."
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-600 bg-warning/10 border border-warning/30 rounded px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <span>此操作将永久留痕，所有改判记录将计入操作日志，请谨慎操作。</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50/50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            确认改判
          </button>
        </div>
      </div>
    </div>
  );
}
