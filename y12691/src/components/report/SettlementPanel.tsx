import { Trophy, RotateCcw, Camera, FileText, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { formatDate } from '../../utils/helpers';

export function SettlementPanel() {
  const { phase, measurements, auditRecords, conclusions, syncIssues, snapshots, reset, startReview } = useAppStore();

  if (phase !== 'settled' && phase !== 'reviewing') {
    return null;
  }

  const approvedOutliers = measurements.filter(m => m.outlierReviewStatus === 'approved').length;
  const rejectedOutliers = measurements.filter(m => m.outlierReviewStatus === 'rejected').length;
  const modifiedOutliers = measurements.filter(m => m.outlierReviewStatus === 'modified').length;
  const pendingOutliers = measurements.filter(m => m.isOutlier && (!m.outlierReviewStatus || m.outlierReviewStatus === 'pending')).length;

  const validMeasurements = measurements.filter(m => !m.isOutlier || m.outlierReviewStatus === 'approved' || m.outlierReviewStatus === 'modified');
  const avgThickness = validMeasurements.reduce((sum, m) => sum + m.thickness, 0) / validMeasurements.length;

  const latestConclusion = conclusions.find(c => !c.superseded);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin animate-slide-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-ice-blue to-info mb-4">
            <Trophy size={32} className="text-white" />
          </div>
          <h2 className="font-display text-2xl text-gradient mb-1">
            {phase === 'settled' ? '复核结算完成' : '历史复盘模式'}
          </h2>
          <p className="text-text-secondary text-sm">
            {phase === 'settled' ? '本轮海冰厚度立体切片复核已完成' : '查看历史状态快照和操作记录'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatBox label="有效测点" value={validMeasurements.length} color="text-success" />
          <StatBox label="平均厚度" value={`${avgThickness.toFixed(2)}m`} color="text-ice-blue" />
          <StatBox label="复核操作" value={auditRecords.filter(a => a.operation.type === 'review').length} color="text-info" />
          <StatBox label="同步问题" value={syncIssues.length} color={syncIssues.length > 0 ? 'text-warning' : 'text-success'} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="bg-bg-tertiary/40 rounded-xl p-4">
            <h4 className="font-medium text-sm text-text-primary mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              离群点处理结果
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">已保留</span>
                <span className="text-success font-medium">{approvedOutliers} 个</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">已剔除</span>
                <span className="text-danger font-medium">{rejectedOutliers} 个</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">已修正</span>
                <span className="text-modified font-medium">{modifiedOutliers} 个</span>
              </div>
              {pendingOutliers > 0 && (
                <div className="flex justify-between pt-2 border-t border-ice-blue/20">
                  <span className="text-warning flex items-center gap-1">
                    <AlertTriangle size={12} />待复核
                  </span>
                  <span className="text-warning font-medium">{pendingOutliers} 个</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-bg-tertiary/40 rounded-xl p-4">
            <h4 className="font-medium text-sm text-text-primary mb-3 flex items-center gap-2">
              <FileText size={16} className="text-info" />
              最新结论
            </h4>
            {latestConclusion ? (
              <div className="space-y-2 text-sm">
                <p className="text-text-secondary text-xs leading-relaxed">{latestConclusion.content}</p>
                <div className="flex items-center justify-between pt-2 border-t border-ice-blue/20">
                  <span className="text-text-muted text-xs">
                    {latestConclusion.author.name} · {formatDate(latestConclusion.timestamp)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${
                    latestConclusion.riskLevel === 'low' ? 'bg-success/20 text-success border-success/30'
                      : latestConclusion.riskLevel === 'medium' ? 'bg-warning/20 text-warning border-warning/30'
                      : 'bg-danger/20 text-danger border-danger/30'
                  }`}>
                    {latestConclusion.riskLevel === 'low' ? '低风险' : latestConclusion.riskLevel === 'medium' ? '中风险' : '高风险'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-text-muted text-sm">暂无结论报告</p>
            )}
          </div>
        </div>

        {snapshots.length > 0 && (
          <div className="bg-bg-tertiary/40 rounded-xl p-4 mb-6">
            <h4 className="font-medium text-sm text-text-primary mb-3 flex items-center gap-2">
              <Camera size={16} className="text-ice-blue" />
              状态快照 ({snapshots.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
              {snapshots.slice().reverse().map(snap => (
                <div key={snap.id} className="flex items-center justify-between text-xs bg-bg-primary/40 rounded p-2">
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-text-muted" />
                    <span className="text-text-primary">{formatDate(snap.timestamp)}</span>
                  </div>
                  <div className="text-text-muted">
                    {snap.auditCount} 条记录 · {snap.measurements.length} 个测点
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={reset} className="btn-secondary flex items-center gap-2">
            <RotateCcw size={18} />
            重新开始
          </button>
          {phase === 'settled' && (
            <button onClick={startReview} className="btn-primary flex items-center gap-2">
              <Camera size={18} />
              进入复盘
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-bg-tertiary/40 rounded-xl p-3 text-center">
      <div className={`text-2xl font-display font-bold ${color}`}>{value}</div>
      <div className="text-xs text-text-muted mt-1">{label}</div>
    </div>
  );
}
