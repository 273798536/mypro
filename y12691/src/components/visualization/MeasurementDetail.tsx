import { useState } from 'react';
import { MapPin, Thermometer, Droplets, AlertTriangle, CheckCircle, XCircle, Edit3, Clock, User } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { formatDate, getThicknessColor } from '../../utils/helpers';

export function MeasurementDetail() {
  const { measurements, selectedMeasurementId, selectMeasurement, reviewOutlier } = useAppStore();
  const [reviewReason, setReviewReason] = useState('');
  const [newValue, setNewValue] = useState('');

  const measurement = measurements.find(m => m.id === selectedMeasurementId);

  if (!measurement) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center h-full">
        <MapPin size={32} className="text-ice-blue/40 mb-3" />
        <p className="text-text-secondary text-sm">点击3D视图或列表中的测点</p>
        <p className="text-text-muted text-xs mt-1">查看详细信息和复核操作</p>
      </div>
    );
  }

  const allThickness = measurements.map(m => m.thickness).filter(t => t < 10);
  const minThickness = Math.min(...allThickness);
  const maxThickness = Math.max(...allThickness);

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/20 text-warning border-warning/30',
    approved: 'bg-success/20 text-success border-success/30',
    rejected: 'bg-danger/20 text-danger border-danger/30',
    modified: 'bg-modified/20 text-modified border-modified/30',
  };

  const statusLabels: Record<string, string> = {
    pending: '待复核',
    approved: '保留',
    rejected: '剔除',
    modified: '已修正',
  };

  const handleReview = (decision: 'keep' | 'remove' | 'modify') => {
    const reason = reviewReason || '未填写具体原因';
    const newVal = decision === 'modify' && newValue ? parseFloat(newValue) : undefined;
    reviewOutlier(measurement.id, decision, reason, newVal);
    setReviewReason('');
    setNewValue('');
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3 h-full flex flex-col">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-ice-blue" />
          <h3 className="font-display text-lg text-gradient">测点详情</h3>
        </div>
        <button
          onClick={() => selectMeasurement(null)}
          className="text-text-muted hover:text-text-secondary transition-colors"
        >
          <XCircle size={18} />
        </button>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
        <div className="bg-bg-tertiary/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{measurement.id}</span>
            {(measurement.isOutlier || measurement.outlierReviewStatus) && (
              <span className={`px-2 py-0.5 rounded-full text-xs border ${
                statusColors[measurement.outlierReviewStatus || 'pending']
              }`}>
                {measurement.isOutlier ? '离群点' : ''}
                {measurement.outlierReviewStatus ? ` · ${statusLabels[measurement.outlierReviewStatus]}` : ''}
              </span>
            )}
          </div>
          <div className="text-xs text-text-muted flex items-center gap-1">
            <Clock size={12} />
            {formatDate(measurement.timestamp)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={<MapPin size={14} />}
            label="坐标位置"
            value={`(${measurement.x.toFixed(1)}, ${measurement.y.toFixed(1)})`}
          />
          <StatCard
            icon={<Thermometer size={14} />}
            label="温度"
            value={`${measurement.temperature.toFixed(2)}°C`}
          />
          <StatCard
            icon={<Droplets size={14} />}
            label="盐度"
            value={`${measurement.salinity.toFixed(2)}‰`}
          />
          <StatCard
            icon={<User size={14} />}
            label="传感器"
            value={measurement.sensorId}
          />
        </div>

        <div className="p-4 rounded-lg border" style={{
          backgroundColor: `${getThicknessColor(measurement.thickness, minThickness, maxThickness)}22`,
          borderColor: getThicknessColor(measurement.thickness, minThickness, maxThickness),
        }}>
          <div className="text-xs text-text-muted mb-1">厚度值</div>
          <div className="text-3xl font-display font-bold text-gradient">
            {measurement.thickness.toFixed(3)}
            <span className="text-base font-normal text-text-secondary ml-1">m</span>
          </div>
          <div className="text-xs text-text-muted mt-1">
            置信度: {(measurement.confidence * 100).toFixed(1)}%
          </div>
        </div>

        {measurement.outlierReview && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle size={14} />
              <span className="font-medium text-sm">已复核</span>
            </div>
            <div className="text-xs space-y-1">
              <div className="text-text-muted">
                复核人: <span className="text-text-primary">{measurement.outlierReview.reviewedBy.name}</span>
                <span className="text-text-muted/60"> ({measurement.outlierReview.reviewedBy.department})</span>
              </div>
              <div className="text-text-muted">
                复核时间: <span className="text-text-primary">{formatDate(measurement.outlierReview.reviewedAt)}</span>
              </div>
              <div className="text-text-muted">
                处理方式: <span className="text-text-primary font-medium">
                  {measurement.outlierReview.decision === 'keep' ? '保留数据' :
                   measurement.outlierReview.decision === 'remove' ? '剔除数据' : `修正为 ${measurement.outlierReview.newValue?.toFixed(3)}m`}
                </span>
              </div>
              <div className="text-text-muted mt-2 pt-2 border-t border-success/20">
                复核原因: <span className="text-text-secondary">{measurement.outlierReview.reason}</span>
              </div>
            </div>
          </div>
        )}

        {measurement.isOutlier && !measurement.outlierReview && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle size={14} />
              <span className="font-medium text-sm">待复核离群点</span>
            </div>
            <p className="text-xs text-text-secondary">{measurement.notes || '该测点数据偏离正常范围，需要人工复核确认。'}</p>

            <div>
              <label className="text-xs text-text-muted block mb-1">复核原因</label>
              <textarea
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                placeholder="请填写复核原因..."
                className="w-full p-2 rounded-lg bg-bg-primary/60 border border-ice-blue/20 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-ice-blue/50 resize-none"
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-1">修正值 (仅修正时填写)</label>
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="0.95"
                step="0.01"
                min="0"
                className="w-full p-2 rounded-lg bg-bg-primary/60 border border-ice-blue/20 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-ice-blue/50"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleReview('keep')}
                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1"
              >
                <CheckCircle size={14} className="text-success" />
                保留
              </button>
              <button
                onClick={() => handleReview('modify')}
                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1"
              >
                <Edit3 size={14} className="text-modified" />
                修正
              </button>
              <button
                onClick={() => handleReview('remove')}
                className="btn-danger text-xs py-2 flex items-center justify-center gap-1"
              >
                <XCircle size={14} />
                剔除
              </button>
            </div>
          </div>
        )}

        {measurement.notes && !measurement.isOutlier && (
          <div className="bg-bg-tertiary/40 rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">备注</div>
            <div className="text-sm text-text-secondary">{measurement.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-bg-tertiary/40 rounded-lg p-2">
      <div className="flex items-center gap-1 text-text-muted text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm text-text-primary font-medium">{value}</div>
    </div>
  );
}
