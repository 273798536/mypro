import React, { useMemo } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { getPressureAtTime } from '@/engine/waterHammer';
import { SourceTooltip } from './SourceTooltip';

export const PipeNetwork: React.FC = () => {
  const {
    network,
    valveActions,
    pressureData,
    currentTime,
    issues,
    selectedIssueId,
    hoveredElement,
    setHoveredElement,
    selectIssue,
  } = useSimulationStore();

  const currentPressure = useMemo(
    () => getPressureAtTime(pressureData, currentTime),
    [pressureData, currentTime]
  );

  const activeValveActions = useMemo(() => {
    return valveActions.filter(va => va.actualTime <= currentTime);
  }, [valveActions, currentTime]);

  const getNodePressure = (nodeId: string) => {
    return currentPressure?.[nodeId] ?? 0.3;
  };

  const getPipeStrokeWidth = (diameter: number | null) => {
    if (diameter === null) return 4;
    return Math.max(2, Math.min(12, diameter / 80));
  };

  const hasDiameterIssue = (pipeId: string) => {
    return issues.some(i => i.type === 'diameter_missing' && i.location.includes(pipeId));
  };

  const getValveState = (valveId: string) => {
    const actions = activeValveActions.filter(va => va.valveId === valveId);
    if (actions.length === 0) return 'open';
    const lastAction = actions[actions.length - 1];
    return lastAction.action;
  };

  const getValvePosition = (valveId: string) => {
    const valve = network.valves.find(v => v.id === valveId);
    if (!valve) return { x: 0, y: 0 };
    const pipe = network.pipes.find(p => p.id === valve.pipeId);
    if (!pipe) return { x: 0, y: 0 };
    const fromNode = network.nodes.find(n => n.id === pipe.fromNode);
    const toNode = network.nodes.find(n => n.id === pipe.toNode);
    if (!fromNode || !toNode) return { x: 0, y: 0 };
    return {
      x: fromNode.x + (toNode.x - fromNode.x) * valve.position,
      y: fromNode.y + (toNode.y - fromNode.y) * valve.position,
    };
  };

  const isIssueHighlighted = (type: string, id: string) => {
    if (selectedIssueId) {
      const issue = issues.find(i => i.id === selectedIssueId);
      if (issue) {
        if (issue.type === 'diameter_missing' && type === 'pipe' && issue.location.includes(id)) return true;
        if (issue.type === 'valve_timing' && type === 'valve' && issue.location.includes(id)) return true;
        if (issue.type === 'sensor_drift' && type === 'node' && issue.location.includes(id)) return true;
      }
    }
    return false;
  };

  const getDiameterIssue = (pipeId: string) => {
    return issues.find(i => i.type === 'diameter_missing' && i.location.includes(pipeId));
  };

  return (
    <div className="w-full h-full bg-white border-2 border-gray-300 rounded relative overflow-hidden">
      <div className="absolute top-2 left-2 z-10 bg-white px-3 py-1 border border-gray-300 rounded">
        <span className="font-bold text-sm text-gray-800">管网拓扑图</span>
      </div>

      <svg width="100%" height="100%" viewBox="0 0 840 360" className="font-mono">
        <defs>
          <pattern id="missingDiameter" patternUnits="userSpaceOnUse" width="8" height="8">
            <rect width="8" height="8" fill="none" />
            <line x1="0" y1="0" x2="8" y2="8" stroke="#dc2626" strokeWidth="1" strokeDasharray="2,2" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {network.pipes.map(pipe => {
          const fromNode = network.nodes.find(n => n.id === pipe.fromNode);
          const toNode = network.nodes.find(n => n.id === pipe.toNode);
          if (!fromNode || !toNode) return null;

          const hasIssue = hasDiameterIssue(pipe.id);
          const isHighlighted = isIssueHighlighted('pipe', pipe.id);
          const diameterIssue = getDiameterIssue(pipe.id);
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2 - 15;

          return (
            <g key={pipe.id}>
              <SourceTooltip
                sourceMaterial={pipe.sourceMaterial}
                sourceLine={pipe.sourceLine}
                hasIssue={hasIssue}
              >
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={hasIssue ? '#dc2626' : '#4b5563'}
                  strokeWidth={getPipeStrokeWidth(pipe.diameter) + (isHighlighted ? 4 : 0)}
                  strokeDasharray={hasIssue ? '8,4' : 'none'}
                  filter={isHighlighted ? 'url(#glow)' : 'none'}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredElement({ type: 'pipe', id: pipe.id })}
                  onMouseLeave={() => setHoveredElement(null)}
                  onClick={() => hasIssue && diameterIssue && selectIssue(diameterIssue.id)}
                />
              </SourceTooltip>

              {hasIssue && (
                <rect
                  x={midX - 60}
                  y={midY - 12}
                  width="120"
                  height="24"
                  fill="#fef2f2"
                  stroke="#dc2626"
                  strokeWidth="2"
                  rx="4"
                />
              )}
              <text
                x={midX}
                y={midY + 5}
                textAnchor="middle"
                className="text-[10px] font-mono pointer-events-none"
                fill={hasIssue ? '#dc2626' : '#374151'}
                fontWeight={hasIssue ? 'bold' : 'normal'}
              >
                {pipe.diameter !== null ? `DN${pipe.diameter}` : '管径缺失'}
                {' | '}
                {pipe.length}m
              </text>
              {hasIssue && (
                <text
                  x={midX + 55}
                  y={midY - 8}
                  className="text-[10px] font-mono font-bold pointer-events-none"
                  fill="#dc2626"
                >
                  [1]
                </text>
              )}
            </g>
          );
        })}

        {network.valves.map(valve => {
          const pos = getValvePosition(valve.id);
          const state = getValveState(valve.id);
          const isHighlighted = isIssueHighlighted('valve', valve.id);
          const hasTimingIssue = issues.some(
            i => i.type === 'valve_timing' && i.location.includes(valve.id)
          );
          const timingIssue = issues.find(
            i => i.type === 'valve_timing' && i.location.includes(valve.id)
          );
          const action = valveActions.find(va => va.valveId === valve.id);

          return (
            <g key={valve.id}>
              <SourceTooltip
                sourceMaterial={action?.sourceMaterial || '阀门调度程序'}
                sourceLine={action?.sourceLine}
                hasIssue={hasTimingIssue}
              >
                <g
                  className="cursor-pointer"
                  filter={isHighlighted ? 'url(#glow)' : 'none'}
                  onMouseEnter={() => setHoveredElement({ type: 'valve', id: valve.id })}
                  onMouseLeave={() => setHoveredElement(null)}
                  onClick={() => timingIssue && selectIssue(timingIssue.id)}
                >
                  <rect
                    x={pos.x - 12}
                    y={pos.y - 12}
                    width="24"
                    height="24"
                    fill={state === 'close' ? '#dc2626' : '#059669'}
                    stroke={isHighlighted ? '#fbbf24' : hasTimingIssue ? '#dc2626' : '#1e3a5f'}
                    strokeWidth={isHighlighted || hasTimingIssue ? 3 : 2}
                    transform={`rotate(45 ${pos.x} ${pos.y})`}
                  />
                  <rect
                    x={pos.x - 4}
                    y={pos.y - 16}
                    width="8"
                    height="8"
                    fill="#1e3a5f"
                    stroke="#1e3a5f"
                    strokeWidth="1"
                  />
                </g>
              </SourceTooltip>

              <text
                x={pos.x}
                y={pos.y + 28}
                textAnchor="middle"
                className="text-[10px] font-mono pointer-events-none"
                fill={hasTimingIssue ? '#dc2626' : '#374151'}
                fontWeight={hasTimingIssue ? 'bold' : 'normal'}
              >
                {valve.name}
                {hasTimingIssue && ' [2]'}
              </text>
            </g>
          );
        })}

        {network.nodes.map(node => {
          const pressure = getNodePressure(node.id);
          const hasDriftIssue = issues.some(
            i => i.type === 'sensor_drift' && i.location.includes(node.id)
          );
          const driftIssue = issues.find(
            i => i.type === 'sensor_drift' && i.location.includes(node.id)
          );
          const isHighlighted = isIssueHighlighted('node', node.id);
          const pressureColor = pressure > 1.0 ? '#dc2626' : pressure > 0.7 ? '#f59e0b' : '#059669';

          return (
            <g key={node.id}>
              <SourceTooltip
                sourceMaterial={hasDriftIssue ? driftIssue!.sourceMaterial : 'SCADA实时数据'}
                sourceLine={hasDriftIssue ? driftIssue!.sourceLine : undefined}
                hasIssue={hasDriftIssue}
              >
                <g
                  className="cursor-pointer"
                  filter={isHighlighted ? 'url(#glow)' : 'none'}
                  onMouseEnter={() => setHoveredElement({ type: 'node', id: node.id })}
                  onMouseLeave={() => setHoveredElement(null)}
                  onClick={() => driftIssue && selectIssue(driftIssue.id)}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isHighlighted ? 16 : 12}
                    fill="white"
                    stroke={isHighlighted ? '#fbbf24' : hasDriftIssue ? '#f59e0b' : '#1e3a5f'}
                    strokeWidth={isHighlighted || hasDriftIssue ? 3 : 2}
                    className="transition-all duration-200"
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="6"
                    fill={pressureColor}
                  />
                </g>
              </SourceTooltip>

              <text
                x={node.x}
                y={node.y - 20}
                textAnchor="middle"
                className="text-[11px] font-mono font-bold pointer-events-none"
                fill="#1e3a5f"
              >
                {node.name}
              </text>

              <text
                x={node.x}
                y={node.y + 30}
                textAnchor="middle"
                className="text-[11px] font-mono pointer-events-none"
                fill={hasDriftIssue ? '#f59e0b' : pressureColor}
                fontWeight="bold"
              >
                {pressure.toFixed(2)} MPa
                {hasDriftIssue && ' [3]'}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-2 right-2 bg-white px-3 py-2 border border-gray-300 rounded text-[10px] font-mono">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 bg-green-600 rotate-45 border border-gray-700"></div>
          <span>阀门开启</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 bg-red-600 rotate-45 border border-gray-700"></div>
          <span>阀门关闭</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-1 bg-gray-600"></div>
          <span>管线正常</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-red-600" style={{ borderStyle: 'dashed' }}></div>
          <span>管径缺失</span>
        </div>
      </div>
    </div>
  );
};
