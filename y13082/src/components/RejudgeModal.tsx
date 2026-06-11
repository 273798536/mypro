import { useState } from 'react';
import type { Collision, CollisionStatus } from '../../shared/types';
import { COLLISION_STATUS_LABELS } from '../../shared/types';
import { api } from '@/lib/api';
import { useAppStore } from '@/store';
import { X, Send } from 'lucide-react';

interface Props {
  collision: Collision;
  onClose: () => void;
  onRejudged: () => void;
}

export default function RejudgeModal({ collision, onClose, onRejudged }: Props) {
  const [newStatus, setNewStatus] = useState<CollisionStatus>(collision.status);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const operator = useAppStore((s) => s.currentOperator);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await api.rejudgeCollision(collision.id, { newStatus, reason, operator });
      onRejudged();
      onClose();
    } catch (e) {
      alert('改判失败：' + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="industrial-panel w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-industrial-border">
          <h3 className="font-mono text-lg font-bold">改判碰撞/异常结果</h3>
          <button onClick={onClose} className="text-industrial-muted hover:text-industrial-text p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="industrial-panel p-3 text-sm">
            <div className="text-industrial-muted text-xs mb-1">当前判定</div>
            <div className="font-mono text-alert-orange">{collision.description}</div>
          </div>

          <div>
            <label className="block text-xs text-industrial-muted mb-1.5">改判结果</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as CollisionStatus)}
              className="industrial-select"
            >
              {(Object.keys(COLLISION_STATUS_LABELS) as CollisionStatus[]).map((k) => (
                <option key={k} value={k}>
                  {COLLISION_STATUS_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-industrial-muted mb-1.5">
              改判理由 <span className="text-industrial-muted">（必填，将写入历史记录）</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="请说明改判原因，例如：现场复核确认两桶间距符合安全规范..."
              className="industrial-input resize-none"
            />
            <div className="text-right text-[11px] text-industrial-muted mt-1">
              {reason.length} / 500
            </div>
          </div>

          <div className="text-xs text-industrial-muted">
            操作人：<span className="text-industrial-text">{operator}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-industrial-border">
          <button onClick={onClose} className="industrial-btn" disabled={submitting}>
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            className="industrial-btn-primary"
          >
            <Send className="w-4 h-4 mr-1.5 inline" />
            提交改判
          </button>
        </div>
      </div>
    </div>
  );
}
