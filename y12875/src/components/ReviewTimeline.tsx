import { CorrectionLog, BuoyRecord } from "@/types";
import { formatTimestamp, formatValue } from "@/utils/correctionLogger";
import { ArrowRight, FileText, User, Clock } from "lucide-react";

interface Props {
  logs: CorrectionLog[];
  recordMap?: Map<string, BuoyRecord>;
}

export default function ReviewTimeline({ logs, recordMap }: Props) {
  if (logs.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-ocean-400/70">
        暂无修正留痕记录
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log, idx) => {
        const rec = recordMap?.get(log.buoyRecordId);
        return (
          <div
            key={log.id}
            className="glass-card glass-card-hover p-4 animate-float-in"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ocean-500/20 border border-ocean-500/40 flex items-center justify-center">
                <span className="font-serif text-ocean-300 text-xs font-semibold">
                  {idx + 1}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ocean-100">
                      {log.fieldLabel}
                    </span>
                    {rec && (
                      <span className="font-mono text-xs text-ocean-500 bg-ocean-700/40 px-2 py-0.5 rounded">
                        {rec.buoyId}
                      </span>
                    )}
                    {rec && (
                      <span className="text-xs text-ocean-400/70">
                        {rec.location}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ocean-500 flex items-center gap-1">
                    <Clock size={12} />
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-sm text-quality-recollect px-2 py-1 bg-quality-recollect/10 rounded line-through">
                    {formatValue(log.oldValue, log.fieldName)}
                  </span>
                  <ArrowRight size={14} className="text-ocean-500" />
                  <span className="font-mono text-sm text-quality-available px-2 py-1 bg-quality-available/10 rounded">
                    {formatValue(log.newValue, log.fieldName)}
                  </span>
                </div>

                <p className="text-sm text-ocean-200/90 mb-1.5">{log.remark}</p>

                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xs text-ocean-400/70 flex items-center gap-1">
                    <User size={12} />
                    {log.operator}
                  </span>
                  {log.sourceMaterial && (
                    <span className="text-xs text-ocean-500 flex items-center gap-1">
                      <FileText size={12} />
                      来源：{log.sourceMaterial}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
