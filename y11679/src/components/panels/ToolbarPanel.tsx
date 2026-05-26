import React from 'react';
import { Upload, MousePointer2, Box, Filter, Download, Camera, History, Save, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { DamageLevel, DAMAGE_LEVEL_LABELS, DAMAGE_LEVEL_COLORS } from '../../types';

interface ToolbarPanelProps {
  onImport: () => void;
  onExportScreenshot: () => void;
  onExportReport: () => void;
  onSaveVersion: () => void;
  onShowHistory: () => void;
  hasUnsavedChanges: boolean;
  hasWarnings: boolean;
}

const ToolbarPanel: React.FC<ToolbarPanelProps> = ({
  onImport,
  onExportScreenshot,
  onExportReport,
  onSaveVersion,
  onShowHistory,
  hasUnsavedChanges,
  hasWarnings,
}) => {
  const {
    selectionMode,
    setSelectionMode,
    damageLevelFilter,
    setDamageLevelFilter,
    annotations,
  } = useAppStore();

  const damageLevels: DamageLevel[] = ['none', 'minor', 'moderate', 'severe', 'critical'];

  const toggleFilter = (level: DamageLevel) => {
    if (damageLevelFilter.includes(level)) {
      setDamageLevelFilter(damageLevelFilter.filter((l) => l !== level));
    } else {
      setDamageLevelFilter([...damageLevelFilter, level]);
    }
  };

  return (
    <div className="w-64 h-full bg-slate-900 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white mb-1">标注工具</h2>
        <p className="text-xs text-slate-400">保险灾损三维标注</p>
      </div>

      <div className="p-4 border-b border-slate-700">
        <button
          onClick={onImport}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          <Upload size={18} />
          <span>导入材料</span>
        </button>
      </div>

      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-3">交互模式</h3>
        <div className="space-y-2">
          <button
            onClick={() => setSelectionMode('view')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
              selectionMode === 'view'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <MousePointer2 size={16} />
            <span>浏览模式</span>
          </button>
          <button
            onClick={() => setSelectionMode('box-select')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
              selectionMode === 'box-select'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Box size={16} />
            <span>框选标注</span>
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-slate-700 flex-1 overflow-auto">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">损失等级筛选</h3>
        </div>
        <div className="space-y-1.5">
          {damageLevels.map((level) => (
            <label
              key={level}
              className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-slate-800 transition-colors"
            >
              <input
                type="checkbox"
                checked={damageLevelFilter.includes(level) || damageLevelFilter.length === 0}
                onChange={() => {
                  if (damageLevelFilter.length === 0) {
                    setDamageLevelFilter([level]);
                  } else {
                    toggleFilter(level);
                  }
                }}
                className="sr-only"
              />
              <div
                className="w-3 h-3 rounded-sm border"
                style={{
                  backgroundColor: damageLevelFilter.includes(level) || damageLevelFilter.length === 0
                    ? DAMAGE_LEVEL_COLORS[level]
                    : 'transparent',
                  borderColor: DAMAGE_LEVEL_COLORS[level],
                }}
              />
              <span className="text-sm text-slate-300">{DAMAGE_LEVEL_LABELS[level]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-2">统计信息</h3>
        <div className="text-xs text-slate-400 space-y-1">
          <p>总标注数: <span className="text-white">{annotations.length}</span></p>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={onSaveVersion}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
            hasUnsavedChanges
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Save size={16} />
          <span>保存版本{hasUnsavedChanges && ' *'}</span>
        </button>
        <button
          onClick={onShowHistory}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
        >
          <History size={16} />
          <span>版本历史</span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={onExportScreenshot}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
          >
            <Camera size={14} />
            <span>截图</span>
          </button>
          <button
            onClick={onExportReport}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
          >
            <Download size={14} />
            <span>报告</span>
          </button>
        </div>
        {hasWarnings && (
          <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-amber-900/50 border border-amber-700 rounded text-amber-400 text-xs">
            <AlertTriangle size={12} />
            <span>存在异常警告</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolbarPanel;
