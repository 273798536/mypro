import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  ArrowRightCircle,
  Fingerprint,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { BatchStatusBadge, AnomalyTypeBadge, AnomalyStatusBadge, SeverityBadge } from '@/components/Badge';
import { ProgressBar } from '@/components/ProgressBar';
import { AnomalyTracePanel } from '@/components/AnomalyTracePanel';
import { ReviewPanel } from '@/components/ReviewPanel';
import { cn } from '@/lib/utils';
import {
  BATCH_STATUS_LABELS,
  nextStatus,
  type Anomaly,
} from '@shared/types';

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    batchDetail,
    anomalies,
    loadingDetail,
    loadingAnomalies,
    submitting,
    error,
    fetchBatchDetail,
    fetchAnomalies,
    advanceStatus,
    fetchDashboard,
  } = useReviewStore();

  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchBatchDetail(id);
    fetchAnomalies(id);
  }, [id, fetchBatchDetail, fetchAnomalies]);

  const batch = batchDetail?.batch;
  const conclusion = batchDetail?.conclusion;
  const nxt = batch ? nextStatus(batch.status) : null;

  const onAdvance = async () => {
    if (!id || !nxt) return;
    await advanceStatus(id, nxt);
    fetchDashboard();
  };

  if (loadingDetail && !batch) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-ink-faint text-sm">
        <Loader2 size={18} className="animate-spin" /> 加载批次详情…
      </div>
    );
  }
  if (!batch || !conclusion) {
    return (
      <div className="p-6 text-sm text-oxblood">{error || '批次不存在'}</div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5 max-w-[1280px] mx-auto">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink w-fit"
      >
        <ArrowLeft size={13} /> 返回工作台
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl text-ink">{batch.batchNo}</h2>
            <BatchStatusBadge status={batch.status} />
          </div>
          <p className="mt-1 flex items-center gap-3 text-[11px] text-ink-muted">
            <span className="inline-flex items-center gap-1 font-mono">
              <Fingerprint size={12} /> {batch.fingerprint.slice(0, 16)}…
            </span>
            <span>{batch.sampleCount} 样本</span>
            {batch.sourceFileName && (
              <span className="font-mono">{batch.sourceFileName}</span>
            )}
          </p>
        </div>
        <button
          onClick={onAdvance}
          disabled={!nxt || submitting}
          className="inline-flex items-center gap-1.5 text-sm text-paper-50 bg-teal px-3 py-2 rounded-sm hover:bg-teal-soft disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <ArrowRightCircle size={15} />}
          {nxt ? `推进至「${BATCH_STATUS_LABELS[nxt]}」` : '流程已完成'}
        </button>
      </div>

      <section className="bg-paper-50 border border-ink/10 rounded-sm shadow-ledger p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Users size={14} className="text-teal" /> 一致性结论
        </div>
        <p className="font-display text-base text-ink leading-relaxed">
          {conclusion.summary}
        </p>
        <div className="grid grid-cols-4 gap-3 rule pt-3">
          <Metric label="一致率" value={`${Math.round(batch.agreementRate * 100)}%`} />
          <Metric label="Cohen's Kappa" value={batch.kappa.toFixed(3)} />
          <Metric label="样本数" value={batch.sampleCount} />
          <Metric label="异常数" value={batch.anomalyCount} tone={batch.anomalyCount > 0 ? 'amber' : 'teal'} />
        </div>
        <div className="rule pt-3 flex flex-col gap-2">
          <span className="text-[11px] text-ink-muted">按标注员一致率</span>
          <div className="grid grid-cols-3 gap-4">
            {conclusion.perAnnotator.map((p) => (
              <div key={p.annotator} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-soft">{p.annotator}</span>
                  <span className="tnum text-ink-muted">{p.count} 条</span>
                </div>
                <ProgressBar value={p.agreeRate} showValue />
                <div className="flex flex-wrap gap-1">
                  {Object.entries(p.labels).map(([k, v]) => (
                    <span key={k} className="font-mono text-[10px] text-ink-faint bg-paper-200 rounded-sm px-1.5 py-0.5">
                      {k}:{v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-ink">异常清单</h3>
          <span className="text-[11px] text-ink-muted">
            {anomalies.length} 条 · 点击行展开反查
          </span>
        </div>

        {loadingAnomalies ? (
          <div className="flex items-center justify-center py-12 text-ink-faint text-sm gap-2">
            <Loader2 size={16} className="animate-spin" /> 加载异常…
          </div>
        ) : anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-ink-faint gap-2">
            <AlertTriangle size={24} />
            <p className="text-sm">未检测到异常</p>
          </div>
        ) : (
          <div className="flex flex-col border border-ink/10 rounded-sm overflow-hidden">
            {anomalies.map((a, i) => (
              <AnomalyRow
                key={a.id}
                anomaly={a}
                index={i}
                expanded={expanded === a.id}
                onToggle={() =>
                  setExpanded(expanded === a.id ? null : a.id)
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'ink',
}: {
  label: string;
  value: ReactNode;
  tone?: 'ink' | 'teal' | 'amber';
}) {
  const c =
    tone === 'teal' ? 'text-teal' : tone === 'amber' ? 'text-amber2' : 'text-ink';
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-ink-muted">{label}</span>
      <span className={cn('tnum font-display text-xl', c)}>{value}</span>
    </div>
  );
}

function AnomalyRow({
  anomaly,
  index,
  expanded,
  onToggle,
}: {
  anomaly: Anomaly;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn('rule', index === 0 && 'border-t-0')}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-paper-100/60"
      >
        {expanded ? (
          <ChevronDown size={15} className="text-ink-muted shrink-0" />
        ) : (
          <ChevronRight size={15} className="text-ink-muted shrink-0" />
        )}
        <span className="font-mono text-[11px] text-ink-faint w-6">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="font-display text-sm text-ink flex-1 truncate">
          {anomaly.title}
        </span>
        <AnomalyTypeBadge type={anomaly.type} />
        <SeverityBadge severity={anomaly.severity} />
        <AnomalyStatusBadge status={anomaly.status} />
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          <AnomalyTracePanel anomaly={anomaly} />
          <ReviewPanel anomaly={anomaly} />
        </div>
      )}
    </div>
  );
}
