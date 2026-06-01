import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useBlochSphereStore } from '@/store/blochSphereStore';
import type { ValidationIssue } from '@/types/quantum';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<ValidationIssue['type'], { label: string; bg: string }> = {
  UNNORMALIZED_PROBABILITY: { label: '概率未归一', bg: 'bg-red-600/80' },
  PHASE_OVERFLOW: { label: '相位越界', bg: 'bg-amber-600/80' },
  BASIS_CONFUSION: { label: '测量基混淆', bg: 'bg-red-600/80' },
};

function SeverityIcon({ severity }: { severity: ValidationIssue['severity'] }) {
  if (severity === 'error') return <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />;
  return <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />;
}

function AnomalyCard({ issue }: { issue: ValidationIssue }) {
  const resolveAnomaly = useBlochSphereStore((s) => s.resolveAnomaly);
  const resolved = issue.resolvedAt !== null;
  const config = TYPE_CONFIG[issue.type];

  return (
    <div
      className={cn(
        'rounded-lg border border-white/10 p-3 transition-all',
        resolved ? 'opacity-50' : 'animate-pulse',
        'bg-[#0f1629]'
      )}
    >
      <div className="flex items-start gap-2">
        <SeverityIcon severity={issue.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs px-2 py-0.5 rounded font-medium text-white', config.bg)}>
              {config.label}
            </span>
            {resolved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> 已解决
              </span>
            )}
          </div>
          <p className="text-sm text-gray-300 mb-1.5">{issue.message}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 border border-white/10 rounded px-1.5 py-0.5 truncate">
              {issue.relatedField}
            </span>
            {!resolved && (
              <button
                onClick={() => resolveAnomaly(issue.id)}
                className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-400/30 hover:border-cyan-300/50 rounded px-2 py-0.5 transition-colors shrink-0"
              >
                确认解决
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnomalyList() {
  const anomalyList = useBlochSphereStore((s) => s.anomalyList);

  if (anomalyList.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        暂无异常项
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {anomalyList.map((issue) => (
        <AnomalyCard key={issue.id} issue={issue} />
      ))}
    </div>
  );
}
