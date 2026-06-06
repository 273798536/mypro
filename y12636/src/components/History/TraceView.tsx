import { useStore } from '../../store/useStore';
import {
  ChevronDown, ChevronRight, FileText, AlertTriangle, Ship,
  ArrowRight, FolderTree,
} from 'lucide-react';
import { useState } from 'react';

export default function TraceView() {
  const { berths, materials, operations, errors } = useStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (k: string) => setExpanded((s) => ({ ...s, [k]: !s[k] }));

  const errorBerths = berths.filter((b) => b.hasError);

  return (
    <div className="border-t border-port-border">
      <div className="px-5 py-3 border-b border-port-border flex items-center gap-2 bg-port-panel/30">
        <FolderTree className="w-4 h-4 text-port-deep" />
        <h4 className="text-sm font-semibold text-white">材料溯源树</h4>
        <span className="text-xs text-slate-500">从泊位追溯到错误和材料证据</span>
      </div>

      <div className="p-4 space-y-1 max-h-80 overflow-y-auto">
        {errorBerths.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">暂无异常泊位</p>
        )}

        {errorBerths.map((b) => {
          const berthErrors = errors.filter((e) => {
            const op = operations.find((o) => o.id === e.operationId);
            return op?.berthId === b.id;
          });
          const berthMats = materials.filter((m) => b.materialIds.includes(m.id));
          const isOpen = expanded[b.id] !== false;

          return (
            <div key={b.id} className="text-sm">
              <button
                onClick={() => toggle(b.id)}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-port-border/40 text-left"
              >
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                <Ship className="w-4 h-4 text-port-danger" />
                <span className="text-white font-medium">{b.name}</span>
                <span className="text-xs text-port-danger px-1.5 py-0.5 rounded bg-port-danger/10 ml-auto">
                  {b.errorType}
                </span>
              </button>

              {isOpen && (
                <div className="ml-8 border-l border-port-border pl-3 space-y-1 mt-1">
                  {berthErrors.map((e) => {
                    const eMat = materials.find((m) => m.id === e.materialId);
                    const errOpen = expanded[e.id] !== false;
                    return (
                      <div key={e.id}>
                        <button
                          onClick={() => toggle(e.id)}
                          className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-port-border/40 text-left"
                        >
                          {errOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                          <AlertTriangle className="w-3.5 h-3.5 text-port-warning" />
                          <span className="text-xs text-slate-200">{e.errorType}</span>
                        </button>

                        {errOpen && (
                          <div className="ml-5 border-l border-port-border pl-3 space-y-0.5 mt-0.5 mb-1">
                            <p className="text-[11px] text-slate-400 p-1.5 rounded bg-port-bg">
                              {e.errorReason}
                            </p>
                            {eMat && (
                              <div className="flex items-start gap-2 p-1.5 rounded bg-port-warning/5 border border-port-warning/20">
                                <FileText className="w-3 h-3 text-port-warning mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-[11px] font-medium text-port-warning">{eMat.title}</p>
                                  <p className="text-[10px] text-slate-500">
                                    学生由此材料可定位 {e.errorType} 的具体来源
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {berthMats.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-500 px-2 py-1">关联材料:</p>
                      {berthMats.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-port-border/40 ml-2">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span className="text-[11px] text-slate-300">{m.title}</span>
                          <ArrowRight className="w-3 h-3 text-slate-600 ml-auto" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
