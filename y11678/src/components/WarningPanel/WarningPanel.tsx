import { AlertTriangle, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ComputationWarning } from '../../types';

function WarningItem({ warning }: { warning: ComputationWarning }) {
  const [expanded, setExpanded] = useState(false);
  const removeWarning = useStore((state) => state.removeWarning);

  const iconMap = {
    singularity: AlertTriangle,
    sampling_gap: AlertTriangle,
    slice_break: AlertCircle,
    degenerate: AlertTriangle,
    out_of_bounds: AlertCircle,
  };

  const Icon = iconMap[warning.type] || AlertTriangle;

  return (
    <div
      className={`p-3 rounded-lg border-l-4 ${
        warning.severity === 'error'
          ? 'bg-error-500/10 border-error-500'
          : 'bg-warning-500/10 border-warning-500'
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon
          size={18}
          className={
            warning.severity === 'error' ? 'text-error-500' : 'text-warning-500'
          }
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span
              className={`text-sm font-medium ${
                warning.severity === 'error' ? 'text-error-500' : 'text-warning-500'
              }`}
            >
              {warning.type === 'singularity' && '参数奇异'}
              {warning.type === 'sampling_gap' && '采样空洞'}
              {warning.type === 'slice_break' && '切片断裂'}
              {warning.type === 'degenerate' && '退化曲面'}
              {warning.type === 'out_of_bounds' && '超出边界'}
            </span>
            <button
              onClick={() => removeWarning(warning.id)}
              className="p-0.5 rounded hover:bg-space-600 text-space-400 hover:text-space-200"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-space-300 mt-1">{warning.message}</p>
          
          {warning.suggestion && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary-500 mt-2 hover:text-primary-400"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? '收起建议' : '查看建议'}
            </button>
          )}
          
          {expanded && warning.suggestion && (
            <p className="text-xs text-space-400 mt-1 pl-3 border-l border-space-600">
              💡 {warning.suggestion}
            </p>
          )}

          {warning.location && (
            <div className="text-xs text-space-500 mt-2">
              位置: ({warning.location.x.toFixed(2)}, {warning.location.y.toFixed(2)}, {warning.location.z.toFixed(2)})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WarningPanel() {
  const warnings = useStore((state) => state.warnings);
  const clearWarnings = useStore((state) => state.clearWarnings);
  const [collapsed, setCollapsed] = useState(false);

  if (warnings.length === 0) return null;

  const errorCount = warnings.filter((w) => w.severity === 'error').length;
  const warningCount = warnings.filter((w) => w.severity === 'warning').length;

  return (
    <div className="glass-card overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-space-700/50 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={18}
            className={errorCount > 0 ? 'text-error-500' : 'text-warning-500'}
          />
          <span className="font-medium text-sm">
            计算警告 ({warnings.length})
          </span>
          {errorCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-error-500/20 text-error-500">
              {errorCount} 错误
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-warning-500/20 text-warning-500">
              {warningCount} 警告
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearWarnings();
            }}
            className="text-xs text-space-400 hover:text-space-200"
          >
            清除全部
          </button>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>
      
      {!collapsed && (
        <div className="p-3 pt-0 space-y-2 max-h-60 overflow-y-auto border-t border-space-600">
          {warnings.map((warning) => (
            <WarningItem key={warning.id} warning={warning} />
          ))}
        </div>
      )}
    </div>
  );
}
