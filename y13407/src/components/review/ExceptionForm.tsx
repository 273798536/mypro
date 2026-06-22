import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { STATUS_LABELS } from '../../types';
import type { BatchStatus } from '../../types';
import type { CalculationBatch } from '../../types';

interface ExceptionFormProps {
  batch: CalculationBatch;
}

const STATUS_ORDER: BatchStatus[] = ['pending', 'reviewing', 'exception', 'done'];

export function ExceptionForm({ batch }: ExceptionFormProps) {
  const { updateBatchStatus, closeReviewDrawer } = useAppStore();
  const [status, setStatus] = useState<BatchStatus>(batch.status);
  const [note, setNote] = useState(batch.note);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (status === batch.status && (!note || note === batch.note)) {
      closeReviewDrawer();
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      updateBatchStatus(batch.id, status, note || undefined);
      setSubmitting(false);
      closeReviewDrawer();
    }, 200);
  };

  return (
    <div className="p-4 bg-white border-t-2 border-ink-300">
      <div className="flex items-center gap-1.5 mb-3 text-[11px] font-mono uppercase tracking-wider text-ink-600">
        <AlertTriangle size={12} className="text-amber-500" />
        复核操作 · 异常处理
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-ink-400 mb-1">
            状态
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_ORDER.map((s) => {
              const active = status === s;
              const borderColor =
                s === 'exception'
                  ? 'border-amber-400'
                  : s === 'done'
                    ? 'border-mint-400'
                    : 'border-ink-300';
              const activeBg =
                s === 'exception'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : s === 'done'
                    ? 'bg-mint-500 text-white border-mint-500'
                    : 'bg-ink-700 text-white border-ink-700';
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 text-xs font-mono border-2 transition-all ${
                    active ? activeBg : `bg-white text-ink-600 ${borderColor} hover:border-ink-500`
                  }`}
                >
                  {STATUS_LABELS[s]}
                  {s !== batch.status && active && (
                    <span className="ml-1.5 opacity-80">· 变更</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-ink-400 mb-1">
            补充说明
            <span className="ml-2 font-normal normal-case text-ink-400">
              （改动原因、备注等，提交后会写入时间线）
            </span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="例如：符号 π 与 p 在新版板书中含义不同，导致结果偏差..."
            className="w-full px-3 py-2 border-2 border-ink-300 font-mono text-sm text-ink-800 focus:border-ink-500 outline-none resize-none placeholder:text-ink-300"
          />
        </div>

        {(status !== batch.status || (note && note !== batch.note)) && (
          <div className="p-2.5 bg-ink-50 border border-ink-200 text-[11px] font-mono text-ink-600">
            {status !== batch.status && (
              <div className="flex items-center gap-2">
                <span className="line-through text-ink-400">
                  {STATUS_LABELS[batch.status]}
                </span>
                <span>→</span>
                <span className="font-bold text-ink-800">
                  {STATUS_LABELS[status]}
                </span>
              </div>
            )}
            {note && note !== batch.note && (
              <div className="mt-1 truncate">
                新增说明：{note}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={closeReviewDrawer}
            className="px-4 py-2 text-xs font-mono text-ink-600 border-2 border-ink-300 hover:bg-ink-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-xs font-mono text-white bg-ink-700 border-2 border-ink-700 hover:bg-ink-800 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <Check size={13} />
            提交并写入时间线
          </button>
        </div>
      </div>
    </div>
  );
}
