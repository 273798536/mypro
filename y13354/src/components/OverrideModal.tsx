import { useState } from 'react';
import { X, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useGatekeeperStore } from '@/store/gatekeeper';
import { cn } from '@/lib/utils';

export default function OverrideModal() {
  const { showOverrideModal, overrideTarget, closeOverrideModal, applyOverride, currentSnapshot } =
    useGatekeeperStore();
  const [newPassed, setNewPassed] = useState<boolean>(true);
  const [reason, setReason] = useState('');

  if (!showOverrideModal || !overrideTarget) return null;

  const isSampleOverride = overrideTarget.startsWith('s_') || overrideTarget.startsWith('demo-');
  const oldPassed = isSampleOverride ? false : false;

  const canSubmit = reason.trim().length >= 10;

  const handleSubmit = () => {
    if (!canSubmit) return;
    applyOverride({
      target: overrideTarget,
      oldPassed,
      newPassed,
      reason: reason.trim(),
    });
    setReason('');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={closeOverrideModal} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <h3 className="text-[15px] font-semibold text-white">人工改判</h3>
          </div>
          <button
            onClick={closeOverrideModal}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-slate-800/60 p-3 text-[12px] text-slate-300">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">改判对象</p>
            <p className="font-mono">{overrideTarget}</p>
            <p className="mt-2 text-[11px] text-slate-500">
              所属快照：<span className="text-slate-300">{currentSnapshot?.name}</span>
            </p>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-medium text-slate-300">原判定</p>
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-3',
                oldPassed
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-rose-500/40 bg-rose-500/10'
              )}
            >
              {oldPassed ? (
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400" />
              )}
              <span className={cn('text-[13px] font-semibold', oldPassed ? 'text-emerald-400' : 'text-rose-400')}>
                {oldPassed ? '通过' : '不通过'}
              </span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-medium text-slate-300">新判定</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNewPassed(true)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 transition-all',
                  newPassed
                    ? 'border-emerald-500/60 bg-emerald-500/15 ring-2 ring-emerald-500/30'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                )}
              >
                <CheckCircle className={cn('h-5 w-5', newPassed ? 'text-emerald-400' : 'text-slate-500')} />
                <span className={cn('text-[13px] font-semibold', newPassed ? 'text-emerald-400' : 'text-slate-400')}>
                  通过
                </span>
              </button>
              <button
                onClick={() => setNewPassed(false)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 transition-all',
                  !newPassed
                    ? 'border-rose-500/60 bg-rose-500/15 ring-2 ring-rose-500/30'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                )}
              >
                <XCircle className={cn('h-5 w-5', !newPassed ? 'text-rose-400' : 'text-slate-500')} />
                <span className={cn('text-[13px] font-semibold', !newPassed ? 'text-rose-400' : 'text-slate-400')}>
                  不通过
                </span>
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center justify-between text-[12px] font-medium text-slate-300">
              <span>改判理由（必填）</span>
              <span className={cn('text-[10px]', reason.length >= 10 ? 'text-emerald-400' : 'text-slate-500')}>
                {reason.length}/10 字符
              </span>
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请详细说明改判原因，至少10个字符。此记录将保留在历史中，便于下一班同事交接。"
              className="h-28 w-full resize-none rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-[12px] text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700/60 px-5 py-4">
          <button
            onClick={closeOverrideModal}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-[12px] font-medium text-slate-300 transition hover:bg-slate-700"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'rounded-lg px-5 py-2 text-[12px] font-medium transition',
              canSubmit
                ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'
                : 'cursor-not-allowed bg-slate-700 text-slate-500'
            )}
          >
            确认改判
          </button>
        </div>
      </div>
    </>
  );
}
