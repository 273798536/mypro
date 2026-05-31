import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, XCircle, Check, Wrench } from 'lucide-react';
import { Anomaly } from '../../types';
import { getAnomalyTypeLabel, getSeverityColor } from '../../engine/anomalyDetector';
import { useGameStore, useUnlockedTools } from '../../store/useGameStore';

interface AnomalyListProps {
  anomalies: Anomaly[];
}

const severityIcons = {
  warning: AlertCircle,
  error: AlertTriangle,
  critical: XCircle,
};

export default function AnomalyList({ anomalies }: AnomalyListProps) {
  const repairAnomaly = useGameStore(state => state.actions.repairAnomaly);
  const unlockedTools = useUnlockedTools();
  const canRepair = unlockedTools.includes('repair_team');

  const importantAnomalies = anomalies.filter(
    a => a.type !== 'invalid_connection'
  );

  if (importantAnomalies.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Check className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
        <p className="text-sm">暂无异常</p>
        <p className="text-xs mt-1">电路运行正常，继续保持</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {importantAnomalies.map((anomaly, index) => {
        const Icon = severityIcons[anomaly.severity];
        const color = getSeverityColor(anomaly.severity);

        return (
          <motion.div
            key={anomaly.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`anomaly-item p-3 rounded-lg border bg-slate-800/50 ${
              anomaly.resolved
                ? 'border-green-500/30 opacity-60'
                : 'border-red-500/50 bg-red-500/5'
            }`}
            style={{
              borderLeftColor: anomaly.resolved ? '#10B981' : color,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  anomaly.resolved
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400 animate-pulse'
                }`}
              >
                {anomaly.resolved ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      anomaly.resolved
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {getAnomalyTypeLabel(anomaly.type)}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    步骤 {anomaly.stepNumber}
                  </span>
                  {anomaly.resolved && (
                    <span className="text-[10px] text-green-400">已修复</span>
                  )}
                </div>

                <p className="text-xs text-slate-300 mb-2">{anomaly.description}</p>

                <div className="flex items-center gap-2 flex-wrap">
                  {anomaly.relatedNodeIds.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">相关节点:</span>
                      {anomaly.relatedNodeIds.map(nodeId => (
                        <span
                          key={nodeId}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400"
                        >
                          {nodeId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {!anomaly.resolved && canRepair && (
                  <button
                    onClick={() => repairAnomaly(anomaly.id)}
                    className="mt-2 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                  >
                    <Wrench className="w-3 h-3" />
                    派遣维修队修复
                  </button>
                )}

                {!anomaly.resolved && !canRepair && (
                  <p className="mt-2 text-[10px] text-amber-400">
                    完成更多操作后解锁维修队
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
