import { ANOMALY_COLORS } from '@/types';
import type { AnomalyDetail } from '@/types';
import AnomalyTag from './AnomalyTag';
import StatusTag from './StatusTag';

interface Props {
  anomalies: AnomalyDetail[];
  selectedAnomalyId: string | null;
  onSelect: (id: string | null) => void;
}

export default function AnomalyLegend({ anomalies, selectedAnomalyId, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1">
        <span className="label-text">异常明细 · 颜色说明</span>
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        {(Object.keys(ANOMALY_COLORS) as Array<keyof typeof ANOMALY_COLORS>).map((key) => {
          const c = ANOMALY_COLORS[key];
          return (
            <div key={key} className="flex items-center gap-1.5 text-[11px] text-surface-300">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: c.hex }}
              />
              <span>{c.name}</span>
            </div>
          );
        })}
      </div>

      <div className="divider -mx-2" />

      {anomalies.length === 0 ? (
        <div className="text-xs text-surface-400 py-4 text-center">
          暂无异常
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto">
          {anomalies.map((a, idx) => {
            const selected = selectedAnomalyId === a.id;
            const c = ANOMALY_COLORS[a.type];
            return (
              <button
                key={a.id}
                onClick={() => onSelect(selected ? null : a.id)}
                className={`text-left p-2 rounded-sm border transition-all ${
                  selected
                    ? 'bg-primary-500/20 border-primary-500'
                    : 'bg-surface-800/40 border-surface-600 hover:border-surface-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className="shrink-0 font-mono text-xs font-bold w-5 h-5 flex items-center justify-center rounded-sm"
                      style={{ backgroundColor: c.hex, color: '#fff' }}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <AnomalyTag type={a.type} />
                        <StatusTag status={a.status} />
                      </div>
                      <div className="text-[11px] text-surface-200 font-medium mt-0.5 truncate">
                        {a.partName}
                      </div>
                      <div className="text-[10px] text-surface-400 mt-0.5 truncate">
                        {a.description}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[10px] font-mono text-surface-400 shrink-0">
                    <div>实测 {a.measuredValue}</div>
                    <div>标准 {a.standardValue}</div>
                    <div style={{ color: c.hex }}>偏差 {a.deviation > 0 ? '+' : ''}{a.deviation}</div>
                    <div>阈值 {a.threshold}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
