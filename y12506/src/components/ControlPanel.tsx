import React from 'react';
import { 
  AnomalyType, 
  AnomalySeverity, 
  ANOMALY_TYPE_LABELS, 
  SEVERITY_LABELS 
} from '../types';

interface ControlPanelProps {
  filters: {
    showAnomalies: boolean;
    showValidFrames: boolean;
    anomalyTypes: AnomalyType[];
    severityLevels: AnomalySeverity[];
  };
  onFilterChange: (filters: ControlPanelProps['filters']) => void;
  viewMode: '3d' | '2d' | 'split';
  onViewModeChange: (mode: '3d' | '2d' | 'split') => void;
  onResetView: () => void;
  onExportData: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
  onResetView,
  onExportData
}) => {
  const handleAnomalyTypeToggle = (type: AnomalyType) => {
    const newTypes = filters.anomalyTypes.includes(type)
      ? filters.anomalyTypes.filter(t => t !== type)
      : [...filters.anomalyTypes, type];
    onFilterChange({ ...filters, anomalyTypes: newTypes });
  };

  const handleSeverityToggle = (severity: AnomalySeverity) => {
    const newLevels = filters.severityLevels.includes(severity)
      ? filters.severityLevels.filter(s => s !== severity)
      : [...filters.severityLevels, severity];
    onFilterChange({ ...filters, severityLevels: newLevels });
  };

  return (
    <div className="bg-spectrum-mid/90 backdrop-blur-sm rounded-lg p-4 text-sm">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        控制面板
      </h3>

      <div className="mb-4">
        <label className="block text-gray-300 mb-2 text-xs uppercase tracking-wider">视图模式</label>
        <div className="flex gap-2">
          {(['3d', '2d', 'split'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {mode === '3d' ? '3D 视图' : mode === '2d' ? '2D 视图' : '分屏'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-300 mb-2 text-xs uppercase tracking-wider">显示选项</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showAnomalies}
              onChange={(e) => onFilterChange({ ...filters, showAnomalies: e.target.checked })}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-gray-300">显示异常标记</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showValidFrames}
              onChange={(e) => onFilterChange({ ...filters, showValidFrames: e.target.checked })}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-gray-300">显示有效帧</span>
          </label>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-300 mb-2 text-xs uppercase tracking-wider">异常类型筛选</label>
        <div className="space-y-1">
          {(Object.keys(ANOMALY_TYPE_LABELS) as AnomalyType[]).map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.anomalyTypes.includes(type)}
                onChange={() => handleAnomalyTypeToggle(type)}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-300 text-xs">{ANOMALY_TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-300 mb-2 text-xs uppercase tracking-wider">严重程度筛选</label>
        <div className="space-y-1">
          {(Object.keys(SEVERITY_LABELS) as AnomalySeverity[]).map((severity) => (
            <label key={severity} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.severityLevels.includes(severity)}
                onChange={() => handleSeverityToggle(severity)}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-300 text-xs">{SEVERITY_LABELS[severity]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-gray-700">
        <button
          onClick={onResetView}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          重置视图
        </button>
        <button
          onClick={onExportData}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出报告
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
