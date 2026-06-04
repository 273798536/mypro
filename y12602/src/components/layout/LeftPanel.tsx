import React from 'react';
import { List, Eye, MapPin } from 'lucide-react';
import { useActionLog } from '@/hooks/useActionLog';
import { useAppStore } from '@/store/useAppStore';
import { formatDateTime } from '@/utils/time';
import { ACTION_TYPE_LABELS } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';

export const LeftPanel: React.FC = () => {
  const { logs, anomalyLogs, getAnomalyTrace } = useActionLog();
  const { setShowAnomalyDetail, showAnomalyDetail } = useAppStore();

  const handleLogClick = (logId: string) => {
    const trace = getAnomalyTrace(logId);
    if (trace?.log.type === 'mark_anomaly') {
      setShowAnomalyDetail(showAnomalyDetail === logId ? null : logId);
    }
  };

  return (
    <div className="w-72 bg-white border-r border-neutral-200 flex flex-col shadow-soft">
      <div className="p-4 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-2 mb-3">
          <List size={20} className="text-primary" />
          <h3 className="font-semibold text-neutral-700">处理记录</h3>
          <span className="ml-auto text-sm text-neutral-500">{logs.length} 条</span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 text-center p-2 bg-success/10 rounded-lg">
            <div className="text-lg font-bold text-success">{logs.filter(l => l.type === 'mark_hit').length}</div>
            <div className="text-xs text-neutral-500">命中</div>
          </div>
          <div className="flex-1 text-center p-2 bg-danger/10 rounded-lg">
            <div className="text-lg font-bold text-danger">{anomalyLogs.length}</div>
            <div className="text-xs text-neutral-500">异常</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">
            <Eye size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无记录</p>
            <p className="text-xs mt-1">开始审核后记录将显示在这里</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={log.id}
              onClick={() => handleLogClick(log.id)}
              className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                log.type === 'mark_hit' 
                  ? 'border-success/30 bg-success/5 hover:bg-success/10' 
                  : log.type === 'mark_anomaly'
                    ? 'border-danger/30 bg-danger/5 hover:bg-danger/10'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
              } ${showAnomalyDetail === log.id ? 'ring-2 ring-accent ring-offset-2' : ''}`}
            >
              <div className="flex items-start gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                  log.type === 'mark_hit' ? 'bg-success' : 
                  log.type === 'mark_anomaly' ? 'bg-danger' : 'bg-neutral-400'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-neutral-700">
                      {ACTION_TYPE_LABELS[log.type]}
                    </span>
                    {log.type === 'mark_anomaly' && log.anomalyType && (
                      <StatusBadge status={log.anomalyType} size="sm" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 line-clamp-2">{log.description}</p>
                  {log.point && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-neutral-400">
                      <MapPin size={12} />
                      <span>({log.point.x}, {log.point.y})</span>
                    </div>
                  )}
                  <div className="text-[10px] text-neutral-400 mt-1">
                    {formatDateTime(log.timestamp)}
                  </div>
                </div>
              </div>

              {showAnomalyDetail === log.id && log.type === 'mark_anomaly' && (
                <AnomalyTrace logId={log.id} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AnomalyTrace: React.FC<{ logId: string }> = ({ logId }) => {
  const { getAnomalyTrace } = useActionLog();
  const trace = getAnomalyTrace(logId);

  if (!trace) return null;

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-neutral-300 animate-fade-in-up">
      <div className="text-xs font-medium text-neutral-600 mb-2">🔍 追溯信息</div>
      
      {trace.before.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] text-neutral-400 mb-1">之前操作：</div>
          <div className="space-y-1">
            {trace.before.map((l, i) => (
              <div key={l.id} className="text-[11px] text-neutral-500 pl-2 border-l-2 border-neutral-200">
                {ACTION_TYPE_LABELS[l.type]}: {l.description.substring(0, 20)}...
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-accent/10 p-2 rounded-md mb-2">
        <div className="text-[11px] font-medium text-accent mb-1">处理意见：</div>
        <div className="text-[11px] text-neutral-700">{trace.log.opinion || '无'}</div>
      </div>

      {trace.log.tracePoints.length > 0 && (
        <div>
          <div className="text-[10px] text-neutral-400 mb-1">轨迹点（{trace.log.tracePoints.length}个）：</div>
          <div className="flex flex-wrap gap-1">
            {trace.log.tracePoints.map((p, i) => (
              <span key={i} className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded">
                ({p.x}, {p.y})
              </span>
            ))}
          </div>
        </div>
      )}

      {trace.after.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] text-neutral-400 mb-1">之后操作：</div>
          <div className="space-y-1">
            {trace.after.map((l, i) => (
              <div key={l.id} className="text-[11px] text-neutral-500 pl-2 border-l-2 border-neutral-200">
                {ACTION_TYPE_LABELS[l.type]}: {l.description.substring(0, 20)}...
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
