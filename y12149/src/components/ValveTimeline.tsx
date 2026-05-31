import React, { useMemo } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { SourceTooltip } from './SourceTooltip';

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 120;
const CHART_PADDING = 10;

export const ValveTimeline: React.FC = () => {
  const {
    network,
    valveActions,
    issues,
    currentTime,
    duration,
    selectedIssueId,
    selectIssue,
    setHoveredElement,
  } = useSimulationStore();

  const valvesByRow = useMemo(() => {
    const grouped: { [valveId: string]: typeof valveActions } = {};
    valveActions.forEach(va => {
      if (!grouped[va.valveId]) grouped[va.valveId] = [];
      grouped[va.valveId].push(va);
    });
    return Object.entries(grouped).map(([valveId, actions]) => ({
      valveId,
      valve: network.valves.find(v => v.id === valveId),
      actions: actions.sort((a, b) => a.designedTime - b.designedTime),
    }));
  }, [valveActions, network.valves]);

  const chartWidth = useMemo(() => {
    return 600;
  }, []);

  const timeToX = (time: number) => {
    return CHART_PADDING + (time / duration) * (chartWidth - CHART_PADDING * 2);
  };

  const getTimingIssue = (actionId: string) => {
    const action = valveActions.find(va => va.id === actionId);
    if (!action) return null;
    return issues.find(
      i => i.type === 'valve_timing' && i.location.includes(action.valveId)
    );
  };

  const isHighlighted = (valveId: string) => {
    if (!selectedIssueId) return false;
    const issue = issues.find(i => i.id === selectedIssueId);
    return issue?.type === 'valve_timing' && issue.location.includes(valveId);
  };

  return (
    <div className="w-full h-full bg-white border-2 border-gray-300 rounded relative overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-gray-300 flex items-center justify-between">
        <span className="font-bold text-sm text-gray-800">阀门动作时间轴</span>
        <span className="text-[10px] font-mono text-gray-500">设计值 vs 实际值</span>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <svg
          width={chartWidth + LABEL_WIDTH}
          height={valvesByRow.length * ROW_HEIGHT + 30}
          className="font-mono"
        >
          {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
            <g key={i}>
              <line
                x1={LABEL_WIDTH + timeToX(i)}
                y1={0}
                x2={LABEL_WIDTH + timeToX(i)}
                y2={valvesByRow.length * ROW_HEIGHT}
                stroke={i % 5 === 0 ? '#d1d5db' : '#e5e7eb'}
                strokeWidth="1"
              />
              <text
                x={LABEL_WIDTH + timeToX(i)}
                y={valvesByRow.length * ROW_HEIGHT + 18}
                textAnchor="middle"
                className="text-[9px]"
                fill="#6b7280"
              >
                {i}s
              </text>
            </g>
          ))}

          {valvesByRow.map((row, rowIndex) => {
            const y = rowIndex * ROW_HEIGHT + 15;
            
            return (
              <g key={row.valveId}>
                <rect
                  x={0}
                  y={y - 12}
                  width={LABEL_WIDTH}
                  height={ROW_HEIGHT - 6}
                  fill={isHighlighted(row.valveId) ? '#fef3c7' : '#f9fafb'}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={8}
                  y={y + 4}
                  className="text-[10px] font-mono"
                  fill={isHighlighted(row.valveId) ? '#92400e' : '#374151'}
                  fontWeight={isHighlighted(row.valveId) ? 'bold' : 'normal'}
                >
                  {row.valve?.name || row.valveId}
                </text>

                {row.actions.map(action => {
                  const hasIssue = issues.some(
                    i => i.type === 'valve_timing' && i.location.includes(action.valveId) &&
                      Math.abs(i.timePoint - action.actualTime) < 0.1
                  );
                  const timingIssue = getTimingIssue(action.id);
                  const designedX = LABEL_WIDTH + timeToX(action.designedTime);
                  const actualX = LABEL_WIDTH + timeToX(action.actualTime);
                  const barWidth = 20;
                  const isActionDone = action.actualTime <= currentTime;
                  const deviation = action.actualTime - action.designedTime;

                  return (
                    <g key={action.id}>
                      <rect
                        x={designedX - barWidth / 2}
                        y={y - 10}
                        width={barWidth}
                        height={20}
                        fill="#dcfce7"
                        stroke="#059669"
                        strokeWidth="1"
                        rx="2"
                        className="transition-all duration-200"
                      />
                      <text
                        x={designedX}
                        y={y + 4}
                        textAnchor="middle"
                        className="text-[9px] font-mono"
                        fill="#059669"
                        fontWeight="bold"
                      >
                        设
                      </text>

                      <SourceTooltip
                        sourceMaterial={action.sourceMaterial}
                        sourceLine={action.sourceLine}
                        hasIssue={hasIssue}
                      >
                        <g
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredElement({ type: 'valve', id: action.valveId })}
                          onMouseLeave={() => setHoveredElement(null)}
                          onClick={() => timingIssue && selectIssue(timingIssue.id)}
                        >
                          {hasIssue && deviation !== 0 && (
                            <rect
                              x={Math.min(designedX, actualX) - barWidth / 2}
                              y={y - 10}
                              width={Math.abs(actualX - designedX)}
                              height={20}
                              fill="#fee2e2"
                              stroke="#dc2626"
                              strokeWidth="2"
                              strokeDasharray="4,2"
                              rx="2"
                            />
                          )}

                          <rect
                            x={actualX - barWidth / 2}
                            y={y - 10}
                            width={barWidth}
                            height={20}
                            fill={isActionDone ? (action.action === 'close' ? '#dc2626' : '#059669') : 'white'}
                            stroke={hasIssue ? '#dc2626' : '#1e3a5f'}
                            strokeWidth={hasIssue ? 3 : 2}
                            rx="2"
                            className="transition-all duration-200"
                          />
                          <text
                            x={actualX}
                            y={y + 4}
                            textAnchor="middle"
                            className="text-[9px] font-mono"
                            fill={isActionDone ? 'white' : '#1e3a5f'}
                            fontWeight="bold"
                          >
                            {action.action === 'close' ? '关' : '开'}
                          </text>
                        </g>
                      </SourceTooltip>

                      {hasIssue && (
                        <g>
                          <line
                            x1={designedX}
                            y1={y - 15}
                            x2={actualX}
                            y2={y - 15}
                            stroke="#dc2626"
                            strokeWidth="2"
                            markerEnd="url(#arrowhead)"
                          />
                          <rect
                            x={(designedX + actualX) / 2 - 28}
                            y={y - 35}
                            width="56"
                            height="18"
                            fill="#fef2f2"
                            stroke="#dc2626"
                            strokeWidth="2"
                            rx="2"
                          />
                          <text
                            x={(designedX + actualX) / 2}
                            y={y - 22}
                            textAnchor="middle"
                            className="text-[10px] font-mono font-bold"
                            fill="#dc2626"
                          >
                            +{deviation.toFixed(2)}s
                          </text>
                        </g>
                      )}

                      {hasIssue && (
                        <text
                          x={actualX + 15}
                          y={y - 12}
                          className="text-[9px] font-mono font-bold"
                          fill="#dc2626"
                        >
                          [2]
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          <line
            x1={LABEL_WIDTH + timeToX(currentTime)}
            y1={0}
            x2={LABEL_WIDTH + timeToX(currentTime)}
            y2={valvesByRow.length * ROW_HEIGHT}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="6,3"
          />
          <rect
            x={LABEL_WIDTH + timeToX(currentTime) - 20}
            y={valvesByRow.length * ROW_HEIGHT - 5}
            width="40"
            height="20"
            fill="#f59e0b"
            rx="2"
          />
          <text
            x={LABEL_WIDTH + timeToX(currentTime)}
            y={valvesByRow.length * ROW_HEIGHT + 10}
            textAnchor="middle"
            className="text-[10px] font-mono font-bold"
            fill="white"
          >
            {currentTime.toFixed(1)}s
          </text>

          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#dc2626" />
            </marker>
          </defs>
        </svg>
      </div>

      <div className="px-3 py-2 border-t border-gray-300 flex items-center gap-4 text-[10px] font-mono">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 border border-green-600 rounded"></div>
          <span className="text-gray-600">设计时间</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-white border-2 border-blue-900 rounded"></div>
          <span className="text-gray-600">实际动作</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-100 border-2 border-red-600 rounded" style={{ borderStyle: 'dashed' }}></div>
          <span className="text-gray-600">时间偏差</span>
        </div>
      </div>
    </div>
  );
};
