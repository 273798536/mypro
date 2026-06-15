import { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { ConflictRecord } from '@/types';
import { useConflictStore } from '@/store/conflictStore';
import { OPERATORS } from '@/types';

interface OverrideModalProps {
  record: ConflictRecord | null;
  mode: 'override' | 'note';
  onClose: () => void;
}

export default function OverrideModal({ record, mode, onClose }: OverrideModalProps) {
  const { overrideAnnotation, appendSupplementaryNote } = useConflictStore();
  const [content, setContent] = useState('');
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState<string>('林姐');

  useEffect(() => {
    if (record && mode === 'override') {
      setContent(record.currentRemark || '');
      setReason('');
    } else {
      setContent('');
    }
  }, [record, mode]);

  if (!record) return null;

  const handleSubmit = () => {
    if (mode === 'override') {
      if (!content.trim() || !reason.trim()) return;
      overrideAnnotation(record.id, content.trim(), reason.trim(), operator);
    } else {
      if (!content.trim()) return;
      appendSupplementaryNote(record.id, content.trim(), operator);
    }
    onClose();
  };

  const isOverride = mode === 'override';
  const canSubmit = isOverride ? content.trim() && reason.trim() : content.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border animate-slide-in overflow-hidden">
        <div
          className={
            isOverride
              ? 'flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-status-confirm to-red-500 text-white'
              : 'flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-brand-700 to-brand-600 text-white'
          }
        >
          {isOverride ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          <div className="flex-1">
            <h3 className="text-lg font-bold">
              {isOverride ? '⚠️ 批注覆盖旧判断（自动挂起）' : '追加后补说明'}
            </h3>
            <p className="text-xs opacity-90 mt-0.5">
              {isOverride
                ? '覆盖会自动将此条挂起待确认，不给假稳定结论'
                : '后补说明将计入变更历史，不可删除'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/15 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 bg-paper-50 rounded-lg border border-paper-200">
            <div className="text-xs text-gray-500 font-semibold tracking-wider mb-1">当前曲目</div>
            <div className="font-bold text-gray-800">{record.title}</div>
            {isOverride && record.currentRemark && (
              <>
                <div className="text-xs text-gray-500 font-semibold tracking-wider mt-3 mb-1">
                  旧备注（将被覆盖）
                </div>
                <div className="text-sm text-gray-600 line-through decoration-status-confirm/50 italic">
                  {record.currentRemark}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {isOverride ? '新批注备注 *' : '后补说明内容 *'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder={
                isOverride
                  ? '请输入新的批注，覆盖旧判断后系统将自动挂起...'
                  : '例如：6/14 群里再次 @对方 催授权书，学生家长回执已达 85%...'
              }
              className="input-field resize-none"
            />
          </div>

          {isOverride && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">覆盖原因 *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="请说明覆盖旧判断的原因（必填，将永久写入历史）"
                className="input-field resize-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">操作人</label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="input-field"
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={isOverride ? 'btn-danger disabled:opacity-40' : 'btn-primary disabled:opacity-40'}
          >
            {isOverride ? '确认覆盖并挂起' : '追加后补说明'}
          </button>
        </div>
      </div>
    </div>
  );
}
