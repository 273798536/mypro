import { ArrowRight, AlertOctagon } from 'lucide-react';
import type { ImpactNode, ImpactLink } from '@/types';

interface Props {
  nodes: ImpactNode[];
  links: ImpactLink[];
}

const NODE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  withdrawn: { bg: 'bg-gray-100', border: 'border-withdrawn-gray', label: '已撤回节点' },
  impacted: { bg: 'bg-white', border: 'border-deep-sea/40', label: '中间节点' },
  conclusion: { bg: 'bg-deep-sea', border: 'border-deep-sea', label: '最终结论' },
};

export default function ImpactChain({ nodes, links }: Props) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const byIndex = new Map<string, number>();
  nodes.forEach((n, i) => byIndex.set(n.id, i));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        {Object.entries(NODE_COLORS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`inline-block w-4 h-4 rounded-sm border-2 ${v.bg} ${v.border}`} />
            {v.label}
          </span>
        ))}
      </div>

      <div className="space-y-0">
        {nodes.map((node, idx) => {
          const c = NODE_COLORS[node.type] || NODE_COLORS.impacted;
          const nextLink = links.find((l) => l.from === node.id);
          return (
            <div key={node.id}>
              <div
                className={`relative rounded-sm border-2 p-4 ${c.bg} ${c.border} ${
                  node.type === 'conclusion' ? 'text-white' : 'text-gray-800'
                } ${node.type === 'withdrawn' ? 'border-dashed' : ''}`}
                style={{ marginLeft: `${idx * 24}px` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className={`font-medium text-sm ${
                        node.type === 'conclusion' ? 'text-white' : 'text-deep-sea'
                      }`}
                    >
                      {node.label}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        node.type === 'conclusion' ? 'text-white/85' : 'text-gray-500'
                      }`}
                    >
                      {node.description}
                    </div>
                  </div>
                  <span className="font-mono-data text-[10px] text-gray-400 flex-shrink-0">
                    {node.id}
                  </span>
                </div>
                {node.type === 'withdrawn' && (
                  <span className="absolute -top-2 right-3 text-[10px] bg-withdrawn-gray text-white px-1.5 py-0.5 rounded-sm">
                    已撤回
                  </span>
                )}
                {node.type === 'conclusion' && (
                  <span className="absolute -top-2 right-3 text-[10px] bg-alert-orange text-white px-1.5 py-0.5 rounded-sm">
                    最终结论
                  </span>
                )}
              </div>
              {nextLink && (
                <div
                  className="flex items-center py-1 text-xs text-gray-500"
                  style={{ marginLeft: `${idx * 24 + 24}px` }}
                >
                  <div className="h-5 w-px bg-gray-300" />
                  <ArrowRight className="w-3 h-3 text-gray-400 -ml-1" strokeWidth={2} />
                  <span className="ml-1">{nextLink.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
