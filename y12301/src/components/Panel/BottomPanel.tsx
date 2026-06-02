import { useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Layers, MapPin, Lightbulb, Eye } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnomalyItem, AnomalyType } from '../../types';
import { cn } from '../../utils/cn';

type TabType = 'anomalies' | 'pending' | 'resolved';

const anomalyTypeConfig: Record<AnomalyType, { label: string; color: string; icon: React.ElementType }> = {
  overlap: { label: '体块重叠', color: 'text-rose-400', icon: Layers },
  wind_gap: { label: '风向缺口', color: 'text-cyan-400', icon: AlertCircle },
  setback_error: { label: '退界错误', color: 'text-amber-400', icon: MapPin },
};

interface AnomalyCardProps {
  anomaly: AnomalyItem;
  isFocused: boolean;
  onFocus: () => void;
  onResolve: () => void;
}

function AnomalyCard({ anomaly, isFocused, onFocus, onResolve }: AnomalyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = anomalyTypeConfig[anomaly.type];
  const Icon = config.icon;

  const buildings = useAppStore((state) => state.buildings);
  const relatedBuildings = buildings.filter((b) =>
    anomaly.relatedEntities.includes(b.id)
  );

  return (
    <div
      className={cn(
        'bg-slate-800/50 rounded-lg border transition-all duration-200 overflow-hidden',
        isFocused
          ? 'border-cyan-500/50 ring-1 ring-cyan-500/30'
          : 'border-slate-700/50 hover:border-slate-600/50'
      )}
    >
      <div
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2 rounded-lg flex-shrink-0',
              anomaly.severity === 'error'
                ? 'bg-red-500/20'
                : 'bg-amber-500/20'
            )}
          >
            <Icon
              className={cn(
                'w-4 h-4',
                anomaly.severity === 'error' ? 'text-red-400' : 'text-amber-400'
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs font-medium', config.color)}>
                {config.label}
              </span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-xs',
                  anomaly.severity === 'error'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-amber-500/20 text-amber-400'
                )}
              >
                {anomaly.severity === 'error' ? '严重' : '警告'}
              </span>
            </div>
            <p className="text-sm text-white line-clamp-2">{anomaly.reason}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-400">关联建筑:</span>
              <div className="flex gap-1 flex-wrap">
                {relatedBuildings.slice(0, 3).map((b) => (
                  <span
                    key={b.id}
                    className="px-1.5 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300"
                  >
                    {b.name}
                  </span>
                ))}
                {relatedBuildings.length > 3 && (
                  <span className="text-xs text-slate-500">
                    +{relatedBuildings.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFocus();
              }}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isFocused
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'hover:bg-slate-700 text-slate-400 hover:text-white'
              )}
              title="定位到场景"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResolve();
              }}
              className="p-1.5 rounded-md hover:bg-green-500/20 text-slate-400 hover:text-green-400 transition-colors"
              title="标记为已解决"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-700/30">
          <div className="pt-3 space-y-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-slate-400 mb-1">处理建议</div>
                <p className="text-sm text-slate-200">{anomaly.suggestion}</p>
              </div>
            </div>

            {anomaly.overlapVolume !== undefined && (
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400">
                  重叠体积: <span className="text-white">{anomaly.overlapVolume.toFixed(1)} m³</span>
                </span>
              </div>
            )}

            {anomaly.obstructionRate !== undefined && (
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400">
                  遮挡率: <span className="text-white">{(anomaly.obstructionRate * 100).toFixed(0)}%</span>
                </span>
              </div>
            )}

            {anomaly.setbackDeficit !== undefined && (
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400">
                  退界缺口: <span className="text-white">{anomaly.setbackDeficit.toFixed(1)} m</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('anomalies');
  const [isExpanded, setIsExpanded] = useState(true);

  const anomalies = useAppStore((state) => state.anomalies);
  const focusedAnomaly = useAppStore((state) => state.focusedAnomaly);
  const setFocusedAnomaly = useAppStore((state) => state.setFocusedAnomaly);
  const resolveAnomaly = useAppStore((state) => state.resolveAnomaly);
  const unresolveAnomaly = useAppStore((state) => state.unresolveAnomaly);

  const unresolvedAnomalies = anomalies.filter((a) => !a.resolved);
  const resolvedAnomalies = anomalies.filter((a) => a.resolved);
  const pendingItems = unresolvedAnomalies.filter((a) => a.severity === 'warning');

  const displayItems =
    activeTab === 'anomalies'
      ? unresolvedAnomalies.filter((a) => a.severity === 'error')
      : activeTab === 'pending'
      ? pendingItems
      : resolvedAnomalies;

  const tabConfigs: { key: TabType; label: string; count: number; color: string }[] = [
    { key: 'anomalies', label: '异常', count: unresolvedAnomalies.filter((a) => a.severity === 'error').length, color: 'text-red-400' },
    { key: 'pending', label: '待确认', count: pendingItems.length, color: 'text-amber-400' },
    { key: 'resolved', label: '已解决', count: resolvedAnomalies.length, color: 'text-green-400' },
  ];

  if (!isExpanded) {
    return (
      <div className="h-12 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 flex items-center px-4 gap-4">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 hover:text-white text-slate-400 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
          <span className="text-sm">展开异常清单</span>
        </button>
        <div className="flex items-center gap-4 ml-auto">
          {tabConfigs.map((tab) => (
            <div key={tab.key} className="flex items-center gap-1">
              <span className="text-xs text-slate-400">{tab.label}</span>
              <span className={cn('text-sm font-medium', tab.color)}>{tab.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-72 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-medium text-white">异常检测清单</h3>
          </div>
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5">
            {tabConfigs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all duration-200',
                  activeTab === tab.key
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <span>{tab.label}</span>
                <span className={cn('font-medium', tab.color)}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {displayItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {displayItems.map((anomaly) => (
              <AnomalyCard
                key={anomaly.id}
                anomaly={anomaly}
                isFocused={focusedAnomaly === anomaly.id}
                onFocus={() =>
                  setFocusedAnomaly(focusedAnomaly === anomaly.id ? null : anomaly.id)
                }
                onResolve={() =>
                  anomaly.resolved
                    ? unresolveAnomaly(anomaly.id)
                    : resolveAnomaly(anomaly.id)
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <CheckCircle className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">
              {activeTab === 'anomalies' && '暂无严重异常'}
              {activeTab === 'pending' && '暂无待确认项'}
              {activeTab === 'resolved' && '暂无已解决项'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
