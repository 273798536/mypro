import React from 'react';
import { MapPin, AlertTriangle, Save, Clock, CheckCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { WarningItem } from '../../hooks/useAnomalyDetection';

interface StatusBarProps {
  warnings: WarningItem[];
  cameraPosition: [number, number, number];
  selectionMode: string;
}

const StatusBar: React.FC<StatusBarProps> = ({
  warnings,
  cameraPosition,
  selectionMode,
}) => {
  const { unsavedChanges, lastModifiedTime, pointclouds, annotations } = useAppStore();

  const modeLabels: Record<string, string> = {
    view: '浏览模式',
    'box-select': '框选模式',
    edit: '编辑模式',
  };

  const coordinateWarnings = warnings.filter((w) => w.type === 'coordinate');
  const overlapWarnings = warnings.filter((w) => w.type === 'overlap');
  const unsavedWarnings = warnings.filter((w) => w.type === 'unsaved');

  return (
    <div className="h-10 bg-slate-900 border-t border-slate-700 flex items-center px-4 gap-6 text-xs">
      <div className="flex items-center gap-2 text-slate-400">
        <MapPin size={12} />
        <span>
          相机: ({cameraPosition[0].toFixed(1)}, {cameraPosition[1].toFixed(1)}, {cameraPosition[2].toFixed(1)})
        </span>
      </div>

      <div className="flex items-center gap-2 text-slate-400">
        <span>模式:</span>
        <span className="text-slate-300">{modeLabels[selectionMode] || selectionMode}</span>
      </div>

      <div className="flex items-center gap-2 text-slate-400">
        <span>点云:</span>
        <span className="text-slate-300">{pointclouds.length}</span>
      </div>

      <div className="flex items-center gap-2 text-slate-400">
        <span>标注:</span>
        <span className="text-slate-300">{annotations.length}</span>
      </div>

      <div className="flex-1" />

      {coordinateWarnings.length > 0 && (
        <div className="flex items-center gap-1.5 text-amber-400">
          <AlertTriangle size={12} />
          <span>坐标偏移警告</span>
        </div>
      )}

      {overlapWarnings.length > 0 && (
        <div className="flex items-center gap-1.5 text-amber-400">
          <AlertTriangle size={12} />
          <span>等级覆盖警告</span>
        </div>
      )}

      {unsavedChanges ? (
        <div className="flex items-center gap-1.5 text-amber-400 animate-pulse">
          <Save size={12} />
          <span>未保存</span>
          {lastModifiedTime && (
            <span className="text-slate-500">
              ({new Date(lastModifiedTime).toLocaleTimeString()})
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-emerald-400">
          <CheckCircle size={12} />
          <span>已保存</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="flex items-center gap-1 text-slate-500">
          <span>共</span>
          <span className="text-amber-400 font-medium">{warnings.length}</span>
          <span>条警告</span>
        </div>
      )}
    </div>
  );
};

export default StatusBar;
