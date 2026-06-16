import { AlertTriangle, ArrowDown, Link2 } from 'lucide-react';
import type { ReasonNode, Material, ImpactLevel } from '../types';

interface Props {
  nodes: ReasonNode[];
  materials: Material[];
  onMaterialHover?: (id: string | undefined) => void;
}

const levelStyle: Record<ImpactLevel, { bar: string; text: string; badge: string }> = {
  high: {
    bar: 'bg-alert-500',
    text: 'text-alert-700',
    badge: 'bg-alert-50 border-alert-500 text-alert-700',
  },
  medium: {
    bar: 'bg-amberX-500',
    text: 'text-amberX-700',
    badge: 'bg-amberX-50 border-amberX-500 text-amberX-700',
  },
  low: {
    bar: 'bg-engineering-500',
    text: 'text-engineering-700',
    badge: 'bg-engineering-50 border-engineering-500 text-engineering-700',
  },
};

const levelLabel: Record<ImpactLevel, string> = {
  high: '高影响',
  medium: '中',
  low: '低',
};

export function ReasonChain({ nodes, materials, onMaterialHover }: Props) {
  if (nodes.length === 0) {
    return <div className="text-center py-8 text-sm text-slateX-400">暂无原因链记录</div>;
  }

  const roots = nodes.filter((n) => !n.parentNodeId);
  const childrenOf = (id: string) => nodes.filter((n) => n.parentNodeId === id);

  const renderNode = (node: ReasonNode, depth = 0) => {
    const style = levelStyle[node.impactLevel];
    const refMaterial = node.referencedMaterialId
      ? materials.find((m) => m.id === node.referencedMaterialId)
      : undefined;
    const children = childrenOf(node.id);
    const isLateRef = refMaterial?.isLateArrival;

    return (
      <div key={node.id} className="relative">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center pt-1.5">
            <div className={`w-1 h-16 ${style.bar} rounded-full`} />
          </div>
          <div
            className={`flex-1 border-l-4 bg-white rounded-sm p-3 shadow-sm ${
              isLateRef ? 'border-alert-600 ring-2 ring-alert-100' : `border-l-${style.bar.replace('bg-', '')}`
            }`}
            style={{ borderLeftColor: isLateRef ? '#dc2626' : undefined }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-serif text-sm text-slateX-900">{node.title}</h4>
                  <span className={`px-1.5 py-0.5 text-[10px] border rounded-sm ${style.badge}`}>
                    {levelLabel[node.impactLevel]}
                  </span>
                  {isLateRef && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-alert-600 text-white rounded-sm">
                      <AlertTriangle size={10} />
                      晚到附件影响
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slateX-600 leading-relaxed">{node.description}</p>
              </div>
            </div>

            {refMaterial && (
              <button
                type="button"
                onMouseEnter={() => onMaterialHover?.(refMaterial.id)}
                onMouseLeave={() => onMaterialHover?.(undefined)}
                className="mt-2 inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-slateX-50 border border-slateX-200 rounded-sm text-slateX-600 hover:bg-engineering-50 hover:border-engineering-300 hover:text-engineering-700 transition-colors"
              >
                <Link2 size={11} />
                关联材料：
                <span className="font-mono">{refMaterial.originalFilename}</span>
              </button>
            )}
          </div>
        </div>

        {children.length > 0 && (
          <div className="relative ml-4 mt-1 pl-4 border-l border-slateX-200 space-y-2">
            {children.map((c) => renderNode(c, depth + 1))}
          </div>
        )}

        {children.length > 0 && (
          <div className="absolute left-[7px] top-[72px] w-4 h-4 -translate-x-1/2 flex items-center justify-center text-slateX-400">
            <ArrowDown size={14} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {roots.map((root) => renderNode(root))}
    </div>
  );
}
