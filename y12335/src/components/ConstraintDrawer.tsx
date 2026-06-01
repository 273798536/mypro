import { useState } from 'react';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { ConstraintNode } from '@/types';

function ConstraintTreeNode({ node, depth = 0 }: { node: ConstraintNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;

  return (
    <div className="ml-2">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-surface-700/50 cursor-pointer transition-colors ${depth === 0 ? 'font-medium' : ''}`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-brand-400 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
          )
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="text-gray-200 text-sm">{node.label}</span>
        {node.detail && (
          <span className="text-gray-500 text-xs ml-auto font-mono">{node.detail}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div className="border-l border-surface-600 ml-3">
          {node.children.map((child, i) => (
            <ConstraintTreeNode key={`${child.label}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ConstraintDrawer() {
  const constraintDrawerOpen = useStore((s) => s.constraintDrawerOpen);
  const setConstraintDrawerOpen = useStore((s) => s.setConstraintDrawerOpen);
  const selectedAssignmentId = useStore((s) => s.selectedAssignmentId);
  const currentResult = useStore((s) => s.currentResult);

  const constraintNode = selectedAssignmentId && currentResult
    ? currentResult.constraintMap[selectedAssignmentId]
    : null;

  if (!constraintDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setConstraintDrawerOpen(false)}
      />
      <div className="relative w-96 h-full bg-surface-800 border-l border-surface-700 flex flex-col shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h3 className="text-sm font-semibold text-gray-100">约束解释</h3>
          <button
            onClick={() => setConstraintDrawerOpen(false)}
            className="p-1 rounded hover:bg-surface-700 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {constraintNode ? (
            <ConstraintTreeNode node={constraintNode} />
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              无约束信息
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
