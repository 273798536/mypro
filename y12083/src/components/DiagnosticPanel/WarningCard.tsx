import { useState } from 'react';
import { AlertTriangle, Lock, ArrowUpDown, TrendingDown, Clock, XCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { AttitudeWarning } from '../../types';
import { WARNING_COLORS, AXIS_NAMES } from '../../utils/constants';
import { getWarningTypeLabel } from '../../engine/correctionEngine';
import { useAttitudeStore } from '../../store/useAttitudeStore';

interface WarningCardProps {
  warning: AttitudeWarning;
}

export const WarningCard = ({ warning }: WarningCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { selectedWarningId, setSelectedWarningId } = useAttitudeStore();

  const isSelected = selectedWarningId === warning.id;

  const getIcon = () => {
    switch (warning.type) {
      case 'gimbal_lock':
        return <Lock size={16} />;
      case 'angle_out_of_range':
        return <ArrowUpDown size={16} />;
      case 'axis_reversed':
        return <ArrowUpDown size={16} />;
      case 'trend_reversed':
        return <TrendingDown size={16} />;
      case 'missing_data':
        return <XCircle size={16} />;
      case 'late_axis':
        return <Clock size={16} />;
      default:
        return <AlertTriangle size={16} />;
    }
  };

  const color = WARNING_COLORS[warning.type];

  const handleCopyStep = async (step: string, index: number) => {
    try {
      await navigator.clipboard.writeText(step);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleClick = () => {
    setSelectedWarningId(isSelected ? null : warning.id);
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className="rounded-lg border transition-all cursor-pointer"
      style={{
        backgroundColor: isSelected ? `${color}15` : 'rgba(30, 58, 95, 0.3)',
        borderColor: isSelected ? color : '#1e3a5f',
        boxShadow: isSelected ? `0 0 10px ${color}40` : 'none',
      }}
      onClick={handleClick}
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div
            className="p-1.5 rounded flex-shrink-0"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {getIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium" style={{ color }}>
                {getWarningTypeLabel(warning.type)}
              </span>
              {warning.axis && (
                <span className="text-xs opacity-60" style={{ color: '#e8f4ff' }}>
                  {AXIS_NAMES[warning.axis]}
                </span>
              )}
            </div>

            <p className="text-xs mt-1 line-clamp-2" style={{ color: '#e8f4ff' }}>
              {warning.message}
            </p>

            {warning.currentValue !== undefined && (
              <div className="mt-2 text-xs font-mono" style={{ color }}>
                当前值：{warning.currentValue.toFixed(1)}°
                {warning.expectedRange && (
                  <span className="opacity-60 ml-2" style={{ color: '#64748b' }}>
                    期望范围：[{warning.expectedRange[0]}°, {warning.expectedRange[1]}°]
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            className="flex-shrink-0 p-1 rounded hover:bg-slate-700/50 transition-colors"
            style={{ color: '#64748b' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && warning.correctionSteps.length > 0 && (
        <div
          className="px-3 pb-3 border-t"
          style={{ borderColor: `${color}30` }}
        >
          <div className="pt-3">
            <div className="text-xs font-medium mb-2" style={{ color: '#52c41a' }}>
              修正建议：
            </div>
            <ol className="space-y-2">
              {warning.correctionSteps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-xs group"
                  style={{ color: '#e8f4ff' }}
                >
                  <span
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 opacity-90">{step}</span>
                  <button
                    className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-700/50 transition-all"
                    style={{ color: '#64748b' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyStep(step, index);
                    }}
                    title="复制步骤"
                  >
                    {copiedIndex === index ? (
                      <Check size={12} style={{ color: '#52c41a' }} />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
