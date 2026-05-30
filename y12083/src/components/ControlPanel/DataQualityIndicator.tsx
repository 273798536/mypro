import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAttitudeStore } from '../../store/useAttitudeStore';
import { AXIS_NAMES } from '../../utils/constants';

export const DataQualityIndicator = () => {
  const { overallQuality } = useAttitudeStore();

  if (!overallQuality) {
    return (
      <div
        className="p-3 rounded-lg border"
        style={{
          backgroundColor: 'rgba(30, 58, 95, 0.3)',
          borderColor: '#1e3a5f',
        }}
      >
        <div className="flex items-center gap-2">
          <Info size={16} style={{ color: '#64748b' }} />
          <span className="text-xs" style={{ color: '#64748b' }}>
            请先加载数据
          </span>
        </div>
      </div>
    );
  }

  const hasIssues = overallQuality.hasMissingFields || overallQuality.hasLateAxes;

  const getStatusIcon = () => {
    if (hasIssues) {
      return <AlertTriangle size={16} style={{ color: '#faad14' }} />;
    }
    return <CheckCircle size={16} style={{ color: '#52c41a' }} />;
  };

  const getStatusText = () => {
    if (hasIssues) {
      return '数据存在问题';
    }
    return '数据质量良好';
  };

  const getStatusColor = () => {
    if (hasIssues) {
      return {
        bg: 'rgba(250, 173, 20, 0.1)',
        border: '#faad14',
        text: '#faad14',
      };
    }
    return {
      bg: 'rgba(82, 196, 26, 0.1)',
      border: '#52c41a',
      text: '#52c41a',
    };
  };

  const statusColor = getStatusColor();

  return (
    <div
      className="p-3 rounded-lg border"
      style={{
        backgroundColor: statusColor.bg,
        borderColor: statusColor.border,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {getStatusIcon()}
        <span className="text-xs font-medium" style={{ color: statusColor.text }}>
          {getStatusText()}
        </span>
      </div>

      {overallQuality.hasMissingFields && (
        <div className="mb-2">
          <div className="text-xs font-medium mb-1" style={{ color: '#e8f4ff' }}>
            缺失字段：
          </div>
          <div className="flex flex-wrap gap-1">
            {overallQuality.missingFields.map((field) => (
              <span
                key={field}
                className="px-1.5 py-0.5 text-xs rounded"
                style={{
                  backgroundColor: 'rgba(250, 173, 20, 0.2)',
                  color: '#faad14',
                }}
              >
                {AXIS_NAMES[field]}
              </span>
            ))}
          </div>
        </div>
      )}

      {overallQuality.hasLateAxes && (
        <div className="mb-2">
          <div className="text-xs font-medium mb-1" style={{ color: '#e8f4ff' }}>
            坐标轴晚到：
          </div>
          <div className="flex flex-wrap gap-1">
            {overallQuality.lateAxes.map((field) => (
              <span
                key={field}
                className="px-1.5 py-0.5 text-xs rounded"
                style={{
                  backgroundColor: 'rgba(250, 173, 20, 0.2)',
                  color: '#faad14',
                }}
              >
                {AXIS_NAMES[field]}
              </span>
            ))}
          </div>
        </div>
      )}

      {overallQuality.hasRemarks && (
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: '#e8f4ff' }}>
            备注信息：
          </div>
          <div className="text-xs opacity-80" style={{ color: '#94a3b8' }}>
            {overallQuality.remarks.length} 条备注
          </div>
        </div>
      )}

      {hasIssues && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <div className="text-xs opacity-70" style={{ color: '#94a3b8' }}>
            系统已自动使用预测值填充缺失数据，详见诊断面板的修正建议。
          </div>
        </div>
      )}
    </div>
  );
};
