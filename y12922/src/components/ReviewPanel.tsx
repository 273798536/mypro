import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Ban, Save } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { cn } from '@/lib/utils';
import type { Anomaly, OpinionAction, AnomalyStatus } from '@shared/types';
import {
  OPINION_ACTION_LABELS,
  ANOMALY_STATUS_LABELS,
} from '@shared/types';

export function ReviewPanel({
  anomaly,
  onReviewed,
}: {
  anomaly: Anomaly;
  onReviewed?: () => void;
}) {
  const reviewAnomaly = useReviewStore((s) => s.reviewAnomaly);
  const submitting = useReviewStore((s) => s.submitting);
  const error = useReviewStore((s) => s.error);

  const [action, setAction] = useState<OpinionAction>(anomaly.opinion?.action ?? 'KEEP');
  const [text, setText] = useState(anomaly.opinion?.text ?? '');
  const [reviewer, setReviewer] = useState(anomaly.opinion?.reviewer ?? '');
  const [status, setStatus] = useState<AnomalyStatus>(anomaly.status);

  useEffect(() => {
    setAction(anomaly.opinion?.action ?? 'KEEP');
    setText(anomaly.opinion?.text ?? '');
    setReviewer(anomaly.opinion?.reviewer ?? '');
    setStatus(anomaly.status);
  }, [anomaly]);

  const submit = async (overrideStatus?: AnomalyStatus) => {
    await reviewAnomaly(anomaly.id, {
      action,
      text,
      reviewer,
      status: overrideStatus ?? status,
    });
    if (overrideStatus) setStatus(overrideStatus);
    onReviewed?.();
  };

  const inputCls =
    'w-full bg-paper-100 border border-ink/10 rounded-sm px-2.5 py-1.5 text-sm focus:outline-none focus:border-teal/50';

  return (
    <div className="bg-paper-50 border border-ink/10 rounded-sm p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h5 className="font-display text-sm text-ink">处理意见</h5>
        <span className="font-mono text-[11px] text-ink-faint">异常 #{anomaly.id.slice(0, 8)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-ink-muted">处理动作</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as OpinionAction)}
            className={inputCls}
          >
            {(Object.keys(OPINION_ACTION_LABELS) as OpinionAction[]).map((k) => (
              <option key={k} value={k}>
                {OPINION_ACTION_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-ink-muted">复核人</span>
          <input
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="录入复核人姓名"
            className={inputCls}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-ink-muted">处理说明</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="说明该异常如何处置及原因"
          rows={2}
          className={cn(inputCls, 'resize-none')}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-ink-muted">异常状态</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AnomalyStatus)}
          className={inputCls}
        >
          {(Object.keys(ANOMALY_STATUS_LABELS) as AnomalyStatus[]).map((k) => (
            <option key={k} value={k}>
              {ANOMALY_STATUS_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-xs text-oxblood">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={() => submit()}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 text-sm text-paper-50 bg-teal px-3 py-1.5 rounded-sm hover:bg-teal-soft disabled:opacity-50"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          保存意见
        </button>
        <button
          onClick={() => submit('RESOLVED')}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 text-sm text-teal border border-teal/30 px-3 py-1.5 rounded-sm hover:bg-teal-tint disabled:opacity-50"
        >
          <CheckCircle2 size={14} /> 标记为已处理
        </button>
        <button
          onClick={() => submit('DISMISSED')}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted border border-ink/15 px-3 py-1.5 rounded-sm hover:bg-paper-200 disabled:opacity-50"
        >
          <Ban size={14} /> 忽略
        </button>
      </div>
    </div>
  );
}
