import { AlertTriangle, FileText, Wrench, CheckCircle } from 'lucide-react';
import type { Anomaly } from '@/types';
import { useAppStore } from '@/store';

const typeConfig: Record<Anomaly['type'], { label: string; color: string; icon: React.ElementType }> = {
  supplement: { label: '需补材料', color: 'bg-warning-amber/20 text-warning-amber border-warning-amber/30', icon: FileText },
  recalibrate: { label: '需改口径', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Wrench },
};

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const { resolveAnomaly } = useAppStore();
  const cfg = typeConfig[anomaly.type];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border p-3 ${cfg.color}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">{cfg.label}</span>
        <span className="text-[10px] opacity-70 ml-auto">
          {anomaly.status === 'resolved' ? '已解决' : '未解决'}
        </span>
      </div>
      <p className="text-[11px] text-slate-400 mb-1.5">{anomaly.description}</p>
      {anomaly.status === 'pending' ? (
        <button
          onClick={() => resolveAnomaly(anomaly.id, anomaly.resolution || '')}
          className="text-[11px] px-2.5 py-1 rounded bg-slate-700 text-white hover:bg-slate-600 transition-colors"
        >
          标记解决
        </button>
      ) : (
        <div className="flex items-center gap-1 text-[11px] text-success-green">
          <CheckCircle className="w-3 h-3" />
          <span>已解决：{anomaly.resolution}</span>
        </div>
      )}
    </div>
  );
}

export default function AnomalyCards({ anomalies }: { anomalies: Anomaly[] }) {
  if (!anomalies.length) return null;
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4 text-warning-amber" /> 异常标记
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {anomalies.map((a) => (
          <AnomalyCard key={a.id} anomaly={a} />
        ))}
      </div>
    </div>
  );
}
