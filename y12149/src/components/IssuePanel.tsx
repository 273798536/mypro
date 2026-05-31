import React from 'react';
import { AlertTriangle, FileWarning, Clock, Gauge, ChevronRight, X } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';
import { ISSUE_TYPE_LABELS, ISSUE_TYPE_COLORS } from '@/types';
import { SourceTooltip } from './SourceTooltip';

const issueIcons = {
  valve_timing: Clock,
  diameter_missing: FileWarning,
  sensor_drift: Gauge,
};

export const IssuePanel: React.FC = () => {
  const {
    issues,
    currentTime,
    selectedIssueId,
    pausedForIssue,
    selectIssue,
    clearPausedIssue,
    setHoveredElement,
  } = useSimulationStore();

  const sortedIssues = [...issues].sort((a, b) => {
    if (a.timePoint === 0) return -1;
    if (b.timePoint === 0) return 1;
    return a.timePoint - b.timePoint;
  });

  return (
    <div className="w-full h-full bg-white border-2 border-gray-300 rounded relative overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-gray-300 flex items-center justify-between bg-red-50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="font-bold text-sm text-red-800">问题追踪</span>
          <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-mono rounded">
            {issues.length}
          </span>
        </div>
      </div>

      {pausedForIssue && (
        <div className="p-3 bg-red-100 border-b-2 border-red-500 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold text-sm text-red-800">检测到问题！已自动暂停</div>
                <div className="text-[11px] text-red-700 mt-0.5">
                  {issues.find(i => i.id === pausedForIssue)?.description}
                </div>
              </div>
            </div>
            <button
              onClick={clearPausedIssue}
              className="p-1 hover:bg-red-200 rounded transition-colors"
            >
              <X className="w-4 h-4 text-red-700" />
            </button>
          </div>
          <button
            onClick={() => clearPausedIssue()}
            className="mt-2 w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-mono rounded transition-colors"
          >
            继续播放 →
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-2 space-y-2">
        {sortedIssues.map((issue, index) => {
          const isSelected = selectedIssueId === issue.id;
          const isTriggered = issue.timePoint === 0 || currentTime >= issue.timePoint;
          const Icon = issueIcons[issue.type];
          const color = ISSUE_TYPE_COLORS[issue.type];
          const refNumber = index + 1;

          return (
            <div
              key={issue.id}
              className={`
                relative p-3 rounded border-2 cursor-pointer transition-all duration-200
                ${isSelected 
                  ? 'border-amber-500 bg-amber-50 shadow-lg scale-[1.02]' 
                  : isTriggered
                    ? 'border-gray-300 bg-white hover:border-gray-400'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }
              `}
              onClick={() => selectIssue(issue.id)}
              onMouseEnter={() => setHoveredElement({ type: 'issue', id: issue.id })}
              onMouseLeave={() => setHoveredElement(null)}
            >
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center">
                [{refNumber}]
              </div>

              <div className="flex items-start gap-2">
                <div 
                  className="p-1.5 rounded flex-shrink-0"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span 
                      className="text-[11px] font-mono font-bold"
                      style={{ color }}
                    >
                      {ISSUE_TYPE_LABELS[issue.type]}
                    </span>
                    {issue.timePoint > 0 && (
                      <span className="text-[10px] font-mono text-gray-500 flex-shrink-0">
                        t={issue.timePoint.toFixed(1)}s
                      </span>
                    )}
                  </div>
                  
                  <div className="text-[11px] font-mono text-gray-800 mt-0.5 font-bold">
                    {issue.location}
                  </div>
                  
                  <div className="text-[11px] text-gray-600 mt-0.5">
                    {issue.description}
                  </div>

                  {issue.deviation !== undefined && (
                    <div 
                      className="mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-block"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      偏差: +{issue.deviation.toFixed(2)}
                      {issue.type === 'valve_timing' ? 's' : ' MPa'}
                    </div>
                  )}

                  <SourceTooltip
                    sourceMaterial={issue.sourceMaterial}
                    sourceLine={issue.sourceLine}
                    hasIssue={true}
                  >
                    <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-gray-500 hover:text-gray-700">
                      <FileWarning className="w-3 h-3" />
                      <span className="truncate">
                        来源: {issue.sourceMaterial} {issue.sourceLine}
                      </span>
                      <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    </div>
                  </SourceTooltip>
                </div>
              </div>

              {issue.timePoint > 0 && (
                <div className="mt-2 h-1 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${isTriggered ? 100 : Math.max(0, (currentTime / issue.timePoint) * 100)}%`,
                      backgroundColor: isTriggered ? color : '#d1d5db',
                    }}
                  />
                </div>
              )}

              {issue.severity === 3 && (
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[9px] font-mono text-red-600 font-bold">
                    ●●● 严重
                  </span>
                </div>
              )}
              {issue.severity === 2 && (
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[9px] font-mono text-amber-600 font-bold">
                    ●●○ 中等
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-gray-300 bg-gray-50">
        <div className="text-[10px] font-mono text-gray-500">
          点击问题卡片定位到对应位置
        </div>
      </div>
    </div>
  );
};
