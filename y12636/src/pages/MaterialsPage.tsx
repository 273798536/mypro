import { useState } from 'react';
import MaterialList from '../components/Materials/MaterialList';
import AnnotationEditor from '../components/Materials/AnnotationEditor';
import CommentSection from '../components/Materials/CommentSection';
import { Material } from '../types';
import { useStore } from '../store/useStore';
import { X, AlertTriangle, Tag, Calendar, User, Link } from 'lucide-react';

export default function MaterialsPage() {
  const [selected, setSelected] = useState<Material | null>(null);
  const { materials, operations, selectMaterial, berths } = useStore();

  const current = selected || materials.find((m) => m.id === useStore.getState().selectedMaterialId) || materials[0];

  const relatedOps = current
    ? operations.filter((o) => o.materialId === current.id)
    : [];

  const relatedBerths = current
    ? berths.filter((b) => b.materialIds.includes(current.id))
    : [];

  return (
    <div className="w-full h-full flex">
      <div className="w-[420px] border-r border-port-border flex flex-col bg-port-panel/30">
        <div className="px-5 py-4 border-b border-port-border">
          <h2 className="text-lg font-bold text-white">材料管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">截图素材、标注草稿、处理意见统一管理</p>
        </div>
        <MaterialList onSelect={setSelected} />
      </div>

      {current ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-port-border flex items-start justify-between bg-port-panel/50">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{current.title}</h3>
                {current.comments.some((c) => c.isSupplementary) && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-port-warning/20 text-port-warning border border-port-warning/50">
                    含补录
                  </span>
                )}
                {current.annotations.some((a) => a.color === '#E74C3C') && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-port-danger/20 text-port-danger border border-port-danger/50 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> 含错误标注
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 flex-wrap">
                {current.source && (
                  <span className="flex items-center gap-1">
                    <Link className="w-3 h-3" /> 来源: {current.source}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> 创建: {new Date(current.createdAt).toLocaleString('zh-CN')}
                </span>
                <span className="flex items-center gap-1 flex-wrap">
                  <Tag className="w-3 h-3" />
                  {current.tags.map((t) => (
                    <span key={t} className="text-slate-300">#{t}</span>
                  ))}
                </span>
              </div>
              {relatedBerths.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400 flex-wrap">
                  <span>关联泊位:</span>
                  {relatedBerths.map((b) => (
                    <span
                      key={b.id}
                      className={`px-1.5 py-0.5 rounded ${
                        b.hasError
                          ? 'bg-port-danger/20 text-port-danger border border-port-danger/50'
                          : 'bg-port-border text-slate-300'
                      }`}
                    >
                      {b.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <button
                onClick={() => { setSelected(null); selectMaterial(null); }}
                className="p-1.5 rounded-md hover:bg-port-border text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 border-r border-port-border flex flex-col">
              <AnnotationEditor material={current} />
            </div>
            <div className="w-[360px] flex flex-col bg-port-panel/30">
              {relatedOps.length > 0 && (
                <div className="px-4 py-3 border-b border-port-border">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    关联操作 ({relatedOps.length})
                  </p>
                  <div className="space-y-1.5">
                    {relatedOps.slice(0, 3).map((op) => (
                      <div key={op.id} className="text-xs p-2 panel">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200 font-medium">{op.description}</span>
                          {op.isError && <AlertTriangle className="w-3 h-3 text-port-danger" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                          <User className="w-2.5 h-2.5" />{op.operator}
                          <span>·</span>
                          {new Date(op.timestamp).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0 flex flex-col">
                <CommentSection material={current} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          请从左侧选择材料
        </div>
      )}
    </div>
  );
}
