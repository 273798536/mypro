import { useState } from 'react';
import { useAppStore } from '../store';
import { formatDateTime, anomalyTypeLabel, statusLabel, actionLabel } from '../utils/data';
import { AlertTriangle, CheckCircle, XCircle, Clock, User, MessageSquare, Plus } from 'lucide-react';

export default function RecordDetail() {
  const selectedRecordId = useAppStore((s) => s.selectedRecordId);
  const records = useAppStore((s) => s.records);
  const getAnomalyForRecord = useAppStore((s) => s.getAnomalyForRecord);
  const getHistoryForAnomaly = useAppStore((s) => s.getHistoryForAnomaly);
  const reviewAnomaly = useAppStore((s) => s.reviewAnomaly);
  const markAnomaly = useAppStore((s) => s.markAnomaly);

  const [reviewer, setReviewer] = useState('物理老师');
  const [reason, setReason] = useState('');

  const record = records.find((r) => r.id === selectedRecordId);
  const anomaly = record ? getAnomalyForRecord(record.id) : undefined;
  const history = anomaly ? getHistoryForAnomaly(anomaly.id) : [];

  if (!record) {
    return (
      <div className="panel h-full flex items-center justify-center">
        <div className="text-center text-metro-muted">
          <AlertTriangle size={32} className="mx-auto mb-2 opacity-40" />
          <p className="font-mono text-sm">点击剖面图中的点查看详情</p>
        </div>
      </div>
    );
  }

  const handleConfirm = () => {
    if (!anomaly) return;
    if (!reason.trim()) {
      alert('请填写复核原因');
      return;
    }
    reviewAnomaly(anomaly.id, 'confirmed', reviewer, reason);
    setReason('');
  };

  const handleDismiss = () => {
    if (!anomaly) return;
    if (!reason.trim()) {
      alert('请填写排除原因');
      return;
    }
    reviewAnomaly(anomaly.id, 'dismissed', reviewer, reason);
    setReason('');
  };

  const handleMark = () => {
    markAnomaly(record.id);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      pending: 'bg-metro-warning/20 text-metro-warning border-metro-warning/40',
      confirmed: 'bg-metro-danger/20 text-metro-danger border-metro-danger/40',
      dismissed: 'bg-metro-muted/20 text-metro-muted border-metro-muted/40',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${styles[status] || ''}`}>
        {status === 'pending' && <Clock size={10} />}
        {status === 'confirmed' && <CheckCircle size={10} />}
        {status === 'dismissed' && <XCircle size={10} />}
        {statusLabel(status)}
      </span>
    );
  };

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="panel-header">
        <h3 className="panel-title">记录详情</h3>
        {record.isAnomaly && anomaly && <StatusBadge status={anomaly.status} />}
        {!record.isAnomaly && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-metro-success/20 text-metro-success border border-metro-success/40">
            <CheckCircle size={10} /> 正常
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="data-label">记录ID</div>
            <div className="data-value text-sm">{record.id}</div>
          </div>
          <div>
            <div className="data-label">时间戳</div>
            <div className="data-value text-sm">{formatDateTime(record.timestamp)}</div>
          </div>
          <div>
            <div className="data-label">X 坐标</div>
            <div className="data-value text-sm">{record.x.toFixed(2)}</div>
          </div>
          <div>
            <div className="data-label">Y 坐标</div>
            <div className="data-value text-sm">{record.y.toFixed(2)}</div>
          </div>
          <div>
            <div className="data-label">楼层</div>
            <div className="data-value text-sm">F{record.floor}</div>
          </div>
          <div>
            <div className="data-label">人流量</div>
            <div className="data-value text-sm">{record.peopleCount} 人</div>
          </div>
        </div>

        {record.isAnomaly && (
          <div className="p-3 bg-metro-anomaly/10 border border-metro-anomaly/30 rounded-lg">
            <div className="flex items-center gap-2 text-metro-anomaly font-mono text-sm mb-1">
              <AlertTriangle size={14} />
              {anomalyTypeLabel(record.anomalyType)}
            </div>
            <p className="text-xs text-metro-muted">
              {record.anomalyType === 'out_of_bounds' && '该记录坐标超出了剖面图画布边界，属于漂浮离群点'}
              {record.anomalyType === 'sudden_spike' && '该记录人流量突然超过正常阈值'}
              {record.anomalyType === 'zero_flow' && '该时段检测到零人流，与历史模式不符'}
            </p>
          </div>
        )}

        {record.isAnomaly && anomaly && anomaly.status === 'pending' && (
          <div className="space-y-3 pt-2 border-t border-metro-border">
            <div>
              <label className="data-label block mb-1 flex items-center gap-1">
                <User size={10} /> 复核人
              </label>
              <input
                type="text"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                className="w-full px-3 py-1.5 bg-metro-bg border border-metro-border rounded text-sm text-metro-text focus:outline-none focus:border-metro-primary"
              />
            </div>
            <div>
              <label className="data-label block mb-1 flex items-center gap-1">
                <MessageSquare size={10} /> 处理意见
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="请详细说明复核原因，记录将存入历史..."
                className="w-full px-3 py-1.5 bg-metro-bg border border-metro-border rounded text-sm text-metro-text focus:outline-none focus:border-metro-primary resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleConfirm} className="btn-control btn-danger flex-1 flex items-center justify-center gap-1.5">
                <CheckCircle size={14} /> 确认异常
              </button>
              <button onClick={handleDismiss} className="btn-control flex-1 flex items-center justify-center gap-1.5">
                <XCircle size={14} /> 排除异常
              </button>
            </div>
          </div>
        )}

        {!record.isAnomaly && !anomaly && (
          <div className="pt-2 border-t border-metro-border">
            <button onClick={handleMark} className="btn-control btn-warning w-full flex items-center justify-center gap-1.5">
              <Plus size={14} /> 手动标记为异常
            </button>
          </div>
        )}

        {anomaly && anomaly.status !== 'pending' && (
          <div className="pt-2 border-t border-metro-border">
            <div className="data-label mb-2">复核信息</div>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="text-metro-muted">复核人:</span>
                <span className="text-metro-text">{anomaly.reviewer}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-metro-muted">时间:</span>
                <span className="text-metro-text">{formatDateTime(anomaly.reviewedAt)}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-metro-muted">意见:</span>
                <span className="text-metro-text">{anomaly.comment}</span>
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="pt-2 border-t border-metro-border">
            <div className="data-label mb-2">处理历史（回溯链）</div>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex gap-3 text-xs">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-metro-primary mt-1.5" />
                    <div className="w-px flex-1 bg-metro-border mt-1" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-metro-primary">{actionLabel(h.action)}</span>
                      <span className="text-metro-muted">· {h.user}</span>
                    </div>
                    <div className="text-metro-muted mt-0.5">{formatDateTime(h.timestamp)}</div>
                    <div className="text-metro-text mt-1">{h.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
