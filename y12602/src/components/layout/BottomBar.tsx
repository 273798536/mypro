import React from 'react';
import { FileText, AlertTriangle, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useActionLog } from '@/hooks/useActionLog';
import { useReport } from '@/hooks/useReport';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ANOMALY_EXPLANATIONS } from '@/types';

export const BottomBar: React.FC = () => {
  const { currentReport, gameStatus, showReportModal, setShowReportModal } = useAppStore();
  const { anomalyLogs } = useActionLog();
  const { setShowReportModal: openReport } = useReport();
  const [expanded, setExpanded] = React.useState(false);

  const hasData = anomalyLogs.length > 0 || (currentReport && currentReport.anomalyCount > 0);
  const displayAnomalies = currentReport?.anomalies || 
    anomalyLogs.map(log => ({
      logId: log.id,
      type: log.anomalyType!,
      description: log.description,
      tracePoints: log.tracePoints,
      opinion: log.opinion || '',
      relatedLogs: [] as string[],
    }));

  return (
    <div className="bg-primary/95 backdrop-blur-sm text-white border-t border-white/10">
      <div 
        className="px-6 py-2 flex items-center justify-between cursor-pointer hover:bg-primary/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            <span className="font-medium">审核报告预览</span>
          </div>
          {currentReport && (
            <StatusBadge status={gameStatus} size="sm" />
          )}
          {anomalyLogs.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-danger/20 rounded-full">
              <AlertTriangle size={12} className="text-danger" />
              <span className="text-xs font-medium">{anomalyLogs.length} 处异常待处理</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {currentReport && (
            <div className="text-sm text-white/70">
              共 {currentReport.totalMarks} 处标记 | 
              <span className="text-success ml-1">{currentReport.hitCount} 命中</span> | 
              <span className="text-danger ml-1">{currentReport.anomalyCount} 异常</span>
            </div>
          )}
          {currentReport && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowReportModal(true);
              }}
              className="btn btn-accent !py-1.5 !px-3 text-sm"
            >
              查看完整报告
            </button>
          )}
          {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 max-h-64 overflow-y-auto scrollbar-thin">
          {!hasData ? (
            <div className="p-4 text-center text-white/50">
              <CheckCircle size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无异常记录</p>
              <p className="text-xs mt-1">审核过程中发现的异常将显示在这里</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {displayAnomalies.map((anomaly, index) => (
                <div key={anomaly.logId} className="p-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-danger flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={anomaly.type} size="sm" />
                        <span className="text-sm font-medium">{anomaly.description}</span>
                      </div>
                      <p className="text-xs text-white/70 mb-1">
                        {ANOMALY_EXPLANATIONS[anomaly.type]}
                      </p>
                      {anomaly.opinion && (
                        <p className="text-xs text-accent">
                          💡 处理意见：{anomaly.opinion}
                        </p>
                      )}
                      {anomaly.tracePoints.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-white/50">
                          <span>轨迹点：</span>
                          {anomaly.tracePoints.slice(0, 3).map((p, i) => (
                            <span key={i} className="bg-white/10 px-1.5 py-0.5 rounded">
                              ({p.x}, {p.y})
                            </span>
                          ))}
                          {anomaly.tracePoints.length > 3 && (
                            <span>+{anomaly.tracePoints.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
