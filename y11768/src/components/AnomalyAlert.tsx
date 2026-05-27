import { useFunnelStore } from '@/store/funnelStore';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState } from 'react';
import { getAnomalyIcon, getAnomalyColor } from '@/utils/anomalyDetection';
import type { Anomaly } from '@/data/types';

export default function AnomalyAlert() {
  const { anomalies, selectApplication } = useFunnelStore();
  const [expanded, setExpanded] = useState(true);
  const [expandedAnomalyId, setExpandedAnomalyId] = useState<string | null>(null);

  if (anomalies.length === 0) return null;

  const errorCount = anomalies.filter(a => a.severity === 'error').length;
  const warningCount = anomalies.filter(a => a.severity === 'warning').length;

  return (
    <div className="absolute bottom-4 left-4 z-20 w-80">
      <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-950/80 to-[#0A1628]/90 backdrop-blur-xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-400 animate-pulse" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white/90">数据异常检测</div>
              <div className="text-[10px] text-white/50">
                发现 {anomalies.length} 个异常（错误 {errorCount}，警告 {warningCount}）
              </div>
            </div>
          </div>
          {expanded ? <ChevronDown size={16} className="text-white/40" /> : <ChevronUp size={16} className="text-white/40" />}
        </button>

        {expanded && (
          <div className="max-h-60 overflow-y-auto border-t border-white/5">
            {anomalies.map(anomaly => (
              <AnomalyItem
                key={anomaly.id}
                anomaly={anomaly}
                isExpanded={expandedAnomalyId === anomaly.id}
                onToggle={() => setExpandedAnomalyId(expandedAnomalyId === anomaly.id ? null : anomaly.id)}
                onViewApp={() => selectApplication(useFunnelStore.getState().applications.find(a => a.id === anomaly.applicationId) || null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnomalyItem({
  anomaly,
  isExpanded,
  onToggle,
  onViewApp,
}: {
  anomaly: Anomaly;
  isExpanded: boolean;
  onToggle: () => void;
  onViewApp: () => void;
}) {
  const color = getAnomalyColor(anomaly.type);
  const icon = getAnomalyIcon(anomaly.type);

  return (
    <div className={`border-t border-white/5 first:border-t-0 ${anomaly.severity === 'error' ? 'bg-red-500/5' : 'bg-amber-500/5'}`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-white/5 transition-colors text-left"
      >
        <span className="text-base">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white/80 truncate">{anomaly.description}</div>
          <div className="text-[10px] text-white/40">
            {anomaly.type === 'duplicate_node' && '节点重复'}
            {anomaly.type === 'channel_mismatch' && '渠道错归'}
            {anomaly.type === 'reason_overwritten' && '拒绝原因覆盖'}
            {' · '}
            <span style={{ color }} className="font-medium">
              {anomaly.severity === 'error' ? '错误' : '警告'}
            </span>
          </div>
        </div>
        {isExpanded ? <ChevronDown size={12} className="text-white/30" /> : <ChevronUp size={12} className="text-white/30" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          <p className="text-[11px] text-white/50 leading-relaxed">{anomaly.details}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onViewApp(); }}
              className="text-[10px] px-2 py-1 rounded-md bg-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-colors"
            >
              查看申请详情
            </button>
            <div
              className="text-[10px] px-2 py-0.5 rounded-sm"
              style={{ backgroundColor: `${color}20`, color }}
            >
              异常已标记，不计入正常统计
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
