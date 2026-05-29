import React, { useState } from 'react';
import { CalcTraceNode, GameStep } from '../types/game';

interface CalcTraceDisplayProps {
  step: GameStep | null;
}

const TraceNode: React.FC<{ node: CalcTraceNode; depth?: number }> = ({ node, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        className={`
          flex items-center gap-2 py-1.5 px-2 rounded my-0.5 cursor-pointer
          hover:bg-white/5 transition-colors
          ${depth === 0 ? 'font-semibold' : ''}
        `}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          <span className="text-gray-500 text-xs w-4">
          {expanded ? '▼' : '▶'}
        </span>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="text-gray-300 text-sm">{node.label}</span>
        {node.formula && (
          <span className="text-cyan-400 text-xs font-mono ml-2 bg-cyan-900/50 px-1.5 py-0.5 rounded">
            {node.formula}
          </span>
        )}
        <span className="ml-auto font-mono text-sm font-bold text-white">
          {node.value}
        </span>
      </div>
        {node.source && (
          <div className="text-xs text-gray-500 ml-6 mb-1">
            来源: {node.source}
          </div>
        )}
        {hasChildren && expanded && node.children?.map((child, i) => (
          <TraceNode key={child.id || i} node={child} depth={depth + 1} />
        ))}
    </div>
  );
};

export const CalcTraceDisplay: React.FC<CalcTraceDisplayProps> = ({ step }) => {
  if (!step) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-600 h-full">
        <h3 className="text-lg font-bold text-white mb-3 border-b border-gray-600 pb-2">
          📊 计算追踪
        </h3>
        <div className="text-gray-400 text-sm py-8 text-center">
          选择一个步骤查看详细计算
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-600 h-full flex flex-col">
      <h3 className="text-lg font-bold text-white mb-3 border-b border-gray-600 pb-2">
        📊 计算追踪
      </h3>

      <div className="mb-3 p-2 bg-gray-700/50 rounded">
        <div className="text-sm text-gray-300 font-semibold">{step.action}</div>
        <div className="flex gap-4 mt-2 text-xs">
          <span className={step.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'}>
          分数变化: {step.scoreChange > 0 ? '+' : ''}
          {step.scoreChange} 分
        </span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {step.scoreReason}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-2">
        <div className="text-xs text-gray-500 mb-2">计算链路:</div>
        {step.calcTrace.children?.map((child, i) => (
          <TraceNode key={child.id || i} node={child} />
        ))}
      </div>
    </div>
  );
};
