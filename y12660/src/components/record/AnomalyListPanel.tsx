import type { Anomaly } from '@/types';
import { ANOMALY_LABELS } from '@/types';
import { SectionTitle } from '@/components/common/Badges';
import { AlertTriangle, AlertOctagon, ShieldCheck } from 'lucide-react';

export function AnomalyListPanel({ anomalies }: { anomalies: Anomaly[] }) {
  const errors = anomalies.filter((a) => a.severity === 'error');
  const warns = anomalies.filter((a) => a.severity === 'warning');

  return (
    <section className="card p-4">
      <SectionTitle
        right={
          <div className="flex items-center gap-2 text-[11px]">
            {errors.length > 0 && (
              <span className="inline-flex items-center gap-1 text-status-unusable">
                <AlertOctagon size={11} /> {errors.length} 错误
              </span>
            )}
            {warns.length > 0 && (
              <span className="inline-flex items-center gap-1 text-anomaly-warn">
                <AlertTriangle size={11} /> {warns.length} 警告
              </span>
            )}
            {anomalies.length === 0 && (
              <span className="inline-flex items-center gap-1 text-status-usable">
                <ShieldCheck size={11} /> 未检测到异常
              </span>
            )}
          </div>
        }
      >
        <span className="flex items-center gap-1.5">
          <AlertTriangle size={13} /> 异常检测结果
        </span>
      </SectionTitle>

      {anomalies.length === 0 ? (
        <div className="text-xs text-status-usable/90 p-3 rounded border border-status-usable/20 bg-status-usable/5">
          所有字段通过自动检测，可以直接交由运维组流转。
        </div>
      ) : (
        <ul className="space-y-2">
          {anomalies.map((a) => (
            <li
              key={a.id}
              className={`p-3 rounded border text-xs ${
                a.severity === 'error'
                  ? 'border-status-unusable/30 bg-status-unusable/5'
                  : 'border-anomaly-warn/30 bg-anomaly-warn/5'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                    a.severity === 'error'
                      ? 'bg-status-unusable/15 text-status-unusable border border-status-unusable/30'
                      : 'bg-anomaly-warn/15 text-anomaly-warn border border-anomaly-warn/30'
                  }`}
                >
                  {a.severity === 'error' ? <AlertOctagon size={11} /> : <AlertTriangle size={11} />}
                  {ANOMALY_LABELS[a.type]}
                </span>
                {a.fieldName && <span className="text-[10px] font-mono text-hall-textMute">{a.fieldName}</span>}
              </div>
              <div className="text-hall-textDim">{a.description}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
