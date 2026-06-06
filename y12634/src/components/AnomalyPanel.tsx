import { AlertTriangle, FileEdit, PackageOpen } from 'lucide-react';
import { BeatNode } from '@/types';
import { getNeedCaliberNodes, getNeedMaterialNodes, useProductionStore } from '@/store/productionStore';

function NodeCard({ node, onClick }: { node: BeatNode; onClick: () => void }) {
  const isMaterial = node.anomalyType === 'need_material';
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-md border transition hover:shadow-md group ${
        isMaterial
          ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20'
          : 'border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isMaterial ? (
              <PackageOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            ) : (
              <FileEdit className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            )}
            <span className={`text-xs font-medium ${isMaterial ? 'text-amber-300' : 'text-rose-300'}`}>
              {isMaterial ? '需补材料' : '需改口径'}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-100 font-medium truncate">{node.title}</div>
          <div className="mt-0.5 text-[11px] text-slate-400 truncate">{node.nextAction}</div>
        </div>
        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">{node.id}</span>
      </div>
    </button>
  );
}

export function AnomalyPanel() {
  const { productionData, selectNode } = useProductionStore();
  const needMaterial = getNeedMaterialNodes(productionData);
  const needCaliber = getNeedCaliberNodes(productionData);

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border-r border-slate-700/60">
      <div className="px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            异常分层看板
          </h3>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
          所有异常不再合并为一个红色数字，分别提示下一步操作方向。
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <div className="flex items-center gap-1.5">
              <PackageOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-300">需补材料</span>
            </div>
            <span className="text-xs font-semibold text-amber-300 tabular-nums">{needMaterial.length}</span>
          </div>
          <div className="space-y-2">
            {needMaterial.length === 0 ? (
              <div className="text-xs text-slate-500 px-1 py-3 text-center">暂无需要补充材料的节点</div>
            ) : (
              needMaterial.map((n) => <NodeCard key={n.id} node={n} onClick={() => selectNode(n.id)} />)
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <div className="flex items-center gap-1.5">
              <FileEdit className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-medium text-rose-300">需改口径</span>
            </div>
            <span className="text-xs font-semibold text-rose-300 tabular-nums">{needCaliber.length}</span>
          </div>
          <div className="space-y-2">
            {needCaliber.length === 0 ? (
              <div className="text-xs text-slate-500 px-1 py-3 text-center">暂无需要修正口径的节点</div>
            ) : (
              needCaliber.map((n) => <NodeCard key={n.id} node={n} onClick={() => selectNode(n.id)} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
