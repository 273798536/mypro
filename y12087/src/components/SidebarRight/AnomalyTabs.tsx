import { useCallback } from 'react';
import { AlertTriangle, Zap, ArrowLeftRight, Box } from 'lucide-react';
import type { AnomalyType } from '@/types';
import { useVectorFieldStore } from '@/store/vectorFieldStore';
import { useDetectionStore } from '@/store/detectionStore';
import { useAnomaliesByType } from '@/hooks/useDetection';
import { ANOMALY_LABELS, STATUS_COLORS } from '@/utils/color';
import { clsx } from '@/lib/utils';

interface TabProps {
  type: AnomalyType | 'all';
  label: string;
  count: number;
  icon: React.ElementType;
  color: string;
  isActive: boolean;
  onClick: () => void;
}

function Tab({ type, label, count, icon: Icon, color, isActive, onClick }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 border',
        isActive
          ? 'bg-slate-700/50 border-slate-500 shadow-md'
          : 'bg-slate-800/30 border-transparent hover:bg-slate-700/30 hover:border-slate-600'
      )}
    >
      <Icon size={14} style={{ color }} />
      <span className={clsx(isActive ? 'text-white' : 'text-slate-400')}>
        {label}
      </span>
      <span
        className={clsx(
          'px-1.5 py-0.5 rounded text-[10px] font-mono',
          isActive ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-500'
        )}
      >
        {count}
      </span>
    </button>
  );
}

export function AnomalyTabs() {
  const currentResult = useDetectionStore((s) => s.currentResult);
  const filterConditions = useVectorFieldStore((s) => s.filterConditions);
  const toggleAnomalyType = useVectorFieldStore((s) => s.toggleAnomalyType);
  const setShowOnlyAnomalies = useVectorFieldStore((s) => s.setShowOnlyAnomalies);

  const anomaliesByType = useAnomaliesByType(currentResult?.anomalies || []);

  const handleTabClick = useCallback(
    (type: AnomalyType | 'all') => {
      if (type === 'all') {
        filterConditions.anomalyTypes.forEach((t) => toggleAnomalyType(t));
        setShowOnlyAnomalies(false);
      } else {
        if (filterConditions.anomalyTypes.includes(type)) {
          toggleAnomalyType(type);
        } else {
          filterConditions.anomalyTypes.forEach((t) => toggleAnomalyType(t));
          toggleAnomalyType(type);
          setShowOnlyAnomalies(true);
        }
      }
    },
    [filterConditions.anomalyTypes, toggleAnomalyType, setShowOnlyAnomalies]
  );

  const tabs = [
    {
      type: 'all' as const,
      label: '全部',
      count: currentResult?.anomalies.length || 0,
      icon: Box,
      color: '#94a3b8',
    },
    {
      type: 'explosion' as const,
      label: ANOMALY_LABELS.explosion,
      count: anomaliesByType.explosion.length,
      icon: Zap,
      color: STATUS_COLORS.explosion,
    },
    {
      type: 'direction_flip' as const,
      label: ANOMALY_LABELS.direction_flip,
      count: anomaliesByType.direction_flip.length,
      icon: ArrowLeftRight,
      color: STATUS_COLORS.direction_flip,
    },
    {
      type: 'out_of_bounds' as const,
      label: ANOMALY_LABELS.out_of_bounds,
      count: anomaliesByType.out_of_bounds.length,
      icon: AlertTriangle,
      color: STATUS_COLORS.out_of_bounds,
    },
  ];

  const activeType =
    filterConditions.anomalyTypes.length === 1
      ? filterConditions.anomalyTypes[0]
      : 'all';

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        异常筛选
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {tabs.map((tab) => (
          <Tab
            key={tab.type}
            type={tab.type}
            label={tab.label}
            count={tab.count}
            icon={tab.icon}
            color={tab.color}
            isActive={activeType === tab.type}
            onClick={() => handleTabClick(tab.type)}
          />
        ))}
      </div>

      {currentResult && (
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={clsx(
                'w-2 h-2 rounded-full animate-pulse',
                currentResult.isConsistent ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            <span className="text-xs text-slate-400">
              可重复性验证:
              <span
                className={clsx(
                  'ml-1 font-medium',
                  currentResult.isConsistent
                    ? 'text-green-400'
                    : 'text-red-400'
                )}
              >
                {currentResult.isConsistent ? '通过' : '失败'}
              </span>
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            运行次数: 第 {currentResult.runNumber} 次
            {currentResult.hasColorScale && (
              <span className="ml-2 text-cyan-400">
                · 已应用颜色标尺
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
