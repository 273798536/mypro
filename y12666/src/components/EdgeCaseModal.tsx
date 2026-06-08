import { useState } from 'react';
import { X, AlertTriangle, Play, RotateCcw, AlertCircle, FileWarning } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { edgeCases } from '@/data/mockData';

export default function EdgeCaseModal() {
  const show = useProjectStore((s) => s.showEdgeCaseModal);
  const setShow = useProjectStore((s) => s.setShowEdgeCaseModal);
  const activeEdgeCaseId = useProjectStore((s) => s.activeEdgeCaseId);
  const activateEdgeCase = useProjectStore((s) => s.activateEdgeCase);

  const [selectedId, setSelectedId] = useState<string | null>(activeEdgeCaseId);
  const selected = edgeCases.find((e) => e.id === selectedId);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="panel-card p-0 w-[720px] max-w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-wake-teal/20">
          <h3 className="font-engineering text-base text-sea-mist font-semibold flex items-center gap-2">
            <AlertTriangle size={16} className="text-alert-orange" />
            边界案例库
            <span className="text-[10px] text-sea-mist/50 font-normal ml-2">
              用于验证单位换算、坐标混用等常见工程材料问题
            </span>
          </h3>
          <button onClick={() => setShow(false)} className="text-sea-mist/60 hover:text-sea-mist">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-[240px] border-r border-wake-teal/15 overflow-y-auto p-2 space-y-1.5">
            {edgeCases.map((ec) => (
              <button
                key={ec.id}
                onClick={() => setSelectedId(ec.id)}
                className={`w-full text-left p-2.5 rounded transition-all ${
                  selectedId === ec.id
                    ? 'bg-wake-teal/20 border border-wake-teal/40'
                    : 'bg-ocean-slate/30 border border-transparent hover:bg-ocean-slate/50'
                } ${activeEdgeCaseId === ec.id ? 'animate-blink-border' : ''}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {ec.caseType === 'UNIT_ERROR' ? (
                    <AlertCircle size={11} className="text-warning-amber" />
                  ) : (
                    <FileWarning size={11} className="text-alert-orange" />
                  )}
                  <span className="font-engineering text-[11px] text-sea-mist font-semibold truncate">
                    {ec.title}
                  </span>
                </div>
                <div className="text-[10px] text-sea-mist/50 line-clamp-2">
                  {ec.caseType === 'UNIT_ERROR' ? '单位换算错误' : '坐标混用/坏数据'}
                </div>
                {activeEdgeCaseId === ec.id && (
                  <div className="text-[9px] text-alert-orange mt-1 font-semibold">● 已激活</div>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-sea-mist/60 mb-1">案例类型</div>
                  <div className="font-engineering text-sm text-sea-mist font-semibold flex items-center gap-2">
                    {selected.caseType === 'UNIT_ERROR' ? (
                      <>
                        <AlertCircle size={14} className="text-warning-amber" />
                        单位换算错误
                      </>
                    ) : (
                      <>
                        <FileWarning size={14} className="text-alert-orange" />
                        坐标混用 / 人工备注坏数据
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-sea-mist/60 mb-1">案例标题</div>
                  <div className="text-sea-mist font-medium">{selected.title}</div>
                </div>

                <div>
                  <div className="text-xs text-sea-mist/60 mb-1">问题描述</div>
                  <div className="text-sm text-sea-mist/90 leading-relaxed bg-ocean-slate/40 rounded p-3 border border-wake-teal/15">
                    {selected.description}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-sea-mist/60 mb-1">对结果的真实影响</div>
                  <div className="text-sm text-alert-orange leading-relaxed bg-alert-orange/10 rounded p-3 border border-alert-orange/25">
                    {selected.impact}
                  </div>
                </div>

                {selected.caseType === 'COORDINATE_MIX' && (
                  <div>
                    <div className="text-xs text-sea-mist/60 mb-1">真实风格的坏数据样例</div>
                    <div className="bg-black/40 rounded p-3 border border-wake-teal/15 font-mono text-[11px] text-sea-mist/80 leading-relaxed">
                      <div className="text-sea-mist/40">// 风机坐标表（部分行）</div>
                      <div>WTG-03, 121.5032, 30.4287, 90m, UTM50N</div>
                      <div>WTG-04, 121.5088, 30.4311, 90m, WGS84</div>
                      <div className="text-alert-orange/90">
                        WTG-05, 121.5143, 30.4336, 90m, 备注：此处按现场放样坐标录入，非设计值。现场偏移+120m, -80m
                      </div>
                      <div>WTG-06, 630.0, 1092.0, 90m, LOCAL</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {activeEdgeCaseId !== selected.id ? (
                    <button
                      onClick={() => activateEdgeCase(selected.id)}
                      className="btn-alert !py-2 text-xs flex items-center gap-1.5"
                    >
                      <Play size={12} />
                      一键加载此案例
                    </button>
                  ) : (
                    <button
                      onClick={() => activateEdgeCase(null)}
                      className="btn-primary !py-2 text-xs flex items-center gap-1.5"
                    >
                      <RotateCcw size={12} />
                      恢复正常参数
                    </button>
                  )}
                  <button onClick={() => setShow(false)} className="btn-secondary !py-2 text-xs">
                    关闭
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-sea-mist/40">
                从左侧选择一个案例
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
