import { cn } from '@/lib/utils';
import type { Anomaly } from '@shared/types';
import {
  AnomalyTypeBadge,
  AnomalyStatusBadge,
  SeverityBadge,
  OpinionActionBadge,
} from './Badge';

function StepHead({ index, title, hint }: { index: number; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[11px] text-ink-faint">0{index}</span>
      <h5 className="font-display text-sm text-ink">{title}</h5>
      {hint && <span className="text-[11px] text-ink-muted">{hint}</span>}
    </div>
  );
}

export function AnomalyTracePanel({ anomaly }: { anomaly: Anomaly }) {
  const { trace, opinion } = anomaly;
  const currentKey = trace.sample.sampleKey;

  return (
    <div className="bg-paper-50 border border-ink/10 rounded-sm">
      <ol className="divide-y divide-ink/8">
        <li className="p-3 flex flex-col gap-1.5">
          <StepHead index={1} title="异常本身" hint="反查起点" />
          <div className="flex flex-wrap items-center gap-1.5">
            <AnomalyTypeBadge type={anomaly.type} />
            <SeverityBadge severity={anomaly.severity} />
            <AnomalyStatusBadge status={anomaly.status} />
          </div>
          <p className="font-display text-sm text-ink">{anomaly.title}</p>
          <p className="text-xs text-ink-soft leading-relaxed">{anomaly.description}</p>
        </li>

        <li className="p-3 flex flex-col gap-2">
          <StepHead
            index={2}
            title="切分清单"
            hint={`train ${trace.splitList.trainCount} · eval ${trace.splitList.evalCount}`}
          />
          <div className="flex items-center gap-3 text-[11px] text-ink-muted">
            <span className="font-mono">当前样本：<span className="text-teal">{currentKey}</span> · {trace.sample.splitTag}</span>
          </div>
          <p className="text-xs text-ink-soft border-l-2 border-amber2/40 pl-2 italic">
            {trace.sample.content}
          </p>
          <div className="grid grid-cols-2 gap-1 max-h-40 overflow-auto pr-1">
            {trace.splitList.items.map((it) => {
              const active = it.sampleKey === currentKey;
              return (
                <div
                  key={it.sampleKey}
                  className={cn(
                    'flex items-center justify-between rounded-sm px-2 py-1 text-[11px] border',
                    active
                      ? 'bg-teal-tint border-teal/40 text-teal'
                      : 'bg-paper-100 border-ink/8 text-ink-soft',
                  )}
                >
                  <span className="font-mono">{it.sampleKey}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-ink-faint">{it.splitTag}</span>
                    <span className={cn(active ? 'text-teal' : 'text-ink-muted')}>
                      {it.label ?? '—'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </li>

        <li className="p-3 flex flex-col gap-2">
          <StepHead index={3} title="标注明细" hint="每位标注员:标签" />
          <div className="flex flex-wrap gap-1.5">
            {trace.annotations.map((a) => (
              <div
                key={a.annotator}
                className="flex items-center gap-1.5 rounded-sm border border-ink/10 bg-paper-100 px-2 py-1 text-xs"
              >
                <span className="text-ink-muted">{a.annotator}</span>
                <span className="text-ink-faint">·</span>
                <span className="font-mono text-ink">{a.label}</span>
              </div>
            ))}
          </div>
        </li>

        <li className="p-3 flex flex-col gap-2">
          <StepHead index={4} title="处理意见" hint="复核录入" />
          {opinion ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <OpinionActionBadge action={opinion.action} />
                <span className="text-[11px] text-ink-muted">
                  复核人 {opinion.reviewer}
                </span>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed">{opinion.text || '（未填写说明）'}</p>
              <span className="font-mono text-[11px] text-ink-faint">
                {new Date(opinion.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
          ) : (
            <p className="text-xs text-ink-faint italic">尚未录入处理意见</p>
          )}
        </li>

        <li className="p-3 flex flex-col gap-1.5">
          <StepHead index={5} title="结论依据" hint="一致性结论来源" />
          <p className="text-xs text-ink-soft leading-relaxed border-l-2 border-teal/40 pl-2">
            {trace.conclusionBasis}
          </p>
        </li>
      </ol>
    </div>
  );
}
