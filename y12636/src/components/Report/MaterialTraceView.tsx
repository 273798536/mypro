import { useStore } from '../../store/useStore';
import {
  FileText, AlertTriangle, CheckCircle2, Clock, FolderOpen,
  ArrowRight, Link,
} from 'lucide-react';

export default function MaterialTraceView() {
  const { materials, errors, berths } = useStore();

  const problematic = materials.filter((m) => {
    const hasError = errors.some((e) => e.materialId === m.id);
    const hasErrorAnnotation = m.annotations.some((a) => a.color === '#E74C3C');
    return hasError || hasErrorAnnotation;
  });

  return (
    <div className="border-t border-port-border" style={{ maxHeight: '45%' }}>
      <div className="px-5 py-3 border-b border-port-border flex items-center justify-between bg-port-panel/30">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-port-warning" />
          <h4 className="text-sm font-semibold text-white">材料证据溯源</h4>
          <span className="text-[11px] text-slate-500">
            每条错误都能卡到具体材料，避免学生只看最后报告
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
        {problematic.map((m) => {
          const relatedErrors = errors.filter((e) => e.materialId === m.id);
          const relatedBerths = berths.filter((b) => b.materialIds.includes(m.id));
          const hasSupplementary = m.comments.some((c) => c.isSupplementary);

          return (
            <div key={m.id} className="panel p-3 flex gap-3">
              <img src={m.imageUrl} className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white truncate">{m.title}</p>
                  {relatedErrors.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-port-danger/20 text-port-danger flex items-center gap-1">
                      <AlertTriangle className="w-2 h-2" />
                      {relatedErrors.length} 条错误
                    </span>
                  )}
                  {hasSupplementary && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-port-warning/20 text-port-warning flex items-center gap-1">
                      <Clock className="w-2 h-2" /> 补录
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 flex-wrap">
                  <FileText className="w-3 h-3" />
                  <span>{m.annotations.length}标注 · {m.comments.length}意见</span>
                  {m.source && (
                    <>
                      <span className="text-slate-600">·</span>
                      <Link className="w-3 h-3" />
                      <span>{m.source}</span>
                    </>
                  )}
                </div>

                {relatedErrors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {relatedErrors.map((e) => (
                      <div key={e.id} className="text-[11px] p-1.5 rounded bg-port-danger/5 border border-port-danger/20 flex items-start gap-1.5">
                        <ArrowRight className="w-3 h-3 text-port-danger mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-port-danger">{e.errorType}:</span>
                          <span className="text-slate-300 ml-1">{e.errorReason.slice(0, 40)}...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {relatedBerths.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500">关联泊位:</span>
                    {relatedBerths.map((b) => (
                      <span
                        key={b.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          b.hasError
                            ? 'bg-port-danger/20 text-port-danger border border-port-danger/40'
                            : 'bg-port-border text-slate-300'
                        }`}
                      >
                        {b.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
