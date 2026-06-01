import React, { useState } from 'react';
import { TraceNode } from '../types';
import { FileText, Shield, Cpu, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

interface TraceChainProps {
  nodes: TraceNode[];
}

const nodeIcons = {
  material: FileText,
  constraint: Shield,
  algorithm: Cpu,
  result: AlertTriangle,
};

const nodeColors = {
  material: 'bg-blue-100 text-blue-600 border-blue-200',
  constraint: 'bg-purple-100 text-purple-600 border-purple-200',
  algorithm: 'bg-green-100 text-green-600 border-green-200',
  result: 'bg-red-100 text-red-600 border-red-200',
};

export const TraceChain: React.FC<TraceChainProps> = ({ nodes }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(nodes.filter((n) => n.expanded).map((n) => n.id))
  );

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {nodes.map((node, index) => {
        const Icon = nodeIcons[node.type];
        const isExpanded = expandedNodes.has(node.id);
        const isLast = index === nodes.length - 1;

        return (
          <div key={node.id} className="relative">
            {!isLast && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-surface-200" />
            )}

            <div
              className={`relative border rounded-lg overflow-hidden transition-all duration-300 ${nodeColors[node.type]}`}
            >
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/50 transition-colors"
                onClick={() => toggleNode(node.id)}
              >
                <div className="p-2 rounded-lg bg-white/80 shadow-sm">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{node.title}</p>
                  <p className="text-sm opacity-75">{node.description}</p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 opacity-60" />
                ) : (
                  <ChevronRight className="w-5 h-5 opacity-60" />
                )}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/50">
                  <div className="mt-4 bg-white/70 rounded-lg p-4">
                    <table className="w-full text-sm">
                      <tbody>
                        {Object.entries(node.details).map(([key, value]) => (
                          <tr key={key} className="border-b border-surface-100 last:border-0">
                            <td className="py-2 text-surface-500 font-medium w-1/3">
                              {key}
                            </td>
                            <td className="py-2 text-surface-700">
                              <pre className="whitespace-pre-wrap font-sans text-sm">
                                {String(value)}
                              </pre>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
