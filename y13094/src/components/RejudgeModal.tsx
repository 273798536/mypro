import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useSchemeStore } from '@/hooks/useSchemeStore';
import { CONCLUSION_LABELS } from '../../shared/types';
import type { ConclusionStatus } from '../../shared/types';

export default function RejudgeModal() {
  const { rejudgeModalOpen, closeRejudgeModal, rejudgeTargetId, currentDetail, rejudge, fetchList } = useSchemeStore();
  const [newConclusion, setNewConclusion] = useState<ConclusionStatus>('approved');
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState('老何');
  const [submitting, setSubmitting] = useState(false);

  if (!rejudgeModalOpen || !rejudgeTargetId || !currentDetail) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await rejudge(rejudgeTargetId, newConclusion, reason, operator);
    await fetchList();
    setSubmitting(false);
    setReason('');
    closeRejudgeModal();
  };

  const handleClose = () => {
    setReason('');
    setNewConclusion('approved');
    closeRejudgeModal();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={handleClose}>
      <div className="animate-slide-up bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-[480px] max-w-[90vw] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-[var(--color-accent)]" />
            <span className="font-medium">改判方案</span>
          </div>
          <button onClick={handleClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-[var(--color-bg)] rounded-lg p-3">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">当前方案</div>
            <div className="font-mono text-sm">{currentDetail.schemeNo} — {currentDetail.bridgeTunnelName}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              当前结论：<span className="text-[var(--color-accent)]">{CONCLUSION_LABELS[currentDetail.conclusion]}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">新结论</label>
            <select
              value={newConclusion}
              onChange={(e) => setNewConclusion(e.target.value as ConclusionStatus)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            >
              {Object.entries(CONCLUSION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">改判原因 <span className="text-[var(--color-danger)]">*</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="请填写改判原因..."
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">操作人</label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-md hover:border-[var(--color-border-light)] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            className="px-4 py-2 text-sm text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '提交中...' : '确认改判'}
          </button>
        </div>
      </div>
    </div>
  );
}
