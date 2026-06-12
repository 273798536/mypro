import { ChevronLeft, ChevronRight, Sliders, Plus, FileWarning } from 'lucide-react';
import { useState } from 'react';
import { useParamStore } from '@/store/paramStore';
import { useTraceStore } from '@/store/traceStore';

export default function ParamPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    activeGroupId,
    groups,
    selectedParamId,
    selectParam,
    updateParamValue,
    boundaryThreshold,
    safeCoefficient,
    setBoundaryThreshold,
    setSafeCoefficient,
    addLateAttachment,
  } = useParamStore();
  const { setRightTab } = useTraceStore();
  const activeGroup = groups[activeGroupId];

  const handleValueChange = (id: string, raw: string) => {
    const v = parseFloat(raw);
    if (!isNaN(v)) updateParamValue(activeGroupId, id, v);
  };

  const handleAddLate = () => {
    const name = prompt('晚到附件参数名称（例：转移概率 P(S₃→S₄)）：', 'P(S₃→S₄)');
    if (!name) return;
    const rawV = prompt('参数值（数字）：', '0.15');
    const v = parseFloat(rawV || '');
    if (isNaN(v)) return;
    const unit = prompt('单位：', '概率') || '概率';
    const remark = prompt('备注（将被引用到异常说明）：', '晚到附件补录，待复核') || '';
    addLateAttachment(activeGroupId, {
      name,
      value: v,
      unit,
      remark,
      isBoundary: false,
    });
  };

  return (
    <aside
      className={`flex-shrink-0 border-r border-academic-navy/15 bg-academic-paper/60 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-12' : 'w-[320px]'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-academic-navy/15 bg-academic-navy text-academic-paper">
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4" />
            <span className="font-serif text-sm font-semibold">参数控制面板</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-sm"
          title={collapsed ? '展开参数面板' : '折叠参数面板'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {collapsed ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="writing-mode-vertical text-academic-navy/50 text-xs font-serif tracking-widest -rotate-180">
            参数控制
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-academic-navy/10 bg-academic-paper-dark/40">
            <div className="text-[11px] mono text-academic-navy/60 mb-1">
              当前参数组
            </div>
            <div className="font-serif text-sm font-semibold text-academic-navy">
              {activeGroup.label}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll">
            <div className="px-2 py-2">
              <div className="grid grid-cols-[34px_1fr_64px_60px_50px] gap-1 px-2 py-1.5 text-[10px] font-serif text-academic-navy/60 border-b border-academic-navy/15 bg-academic-paper-dark/60 sticky top-0 z-10">
                <span>编号</span>
                <span>参数名</span>
                <span>值</span>
                <span>单位</span>
                <span>来源</span>
              </div>

              {activeGroup.rows.map((row) => {
                const classes = [
                  'param-row-zebra grid grid-cols-[34px_1fr_64px_60px_50px] gap-1 px-2 py-1.5 items-center text-xs transition-all cursor-pointer',
                  row.isLateAttachment ? 'late-attachment-row' : '',
                  row.isBoundary ? 'boundary-row' : '',
                  selectedParamId === row.id ? 'bg-diff-gold/60 ring-1 ring-diff-gold-deep' : '',
                ].join(' ');
                return (
                  <div
                    key={row.id}
                    className={classes}
                    onClick={() => {
                      selectParam(row.id === selectedParamId ? null : row.id);
                      setRightTab('trace');
                    }}
                    title={row.remark}
                  >
                    <span className="mono text-[10px] text-academic-navy/70 font-semibold">
                      {row.id}
                    </span>
                    <div>
                      <div className="font-serif text-[12px] leading-tight">{row.name}</div>
                      {row.isBoundary && (
                        <div className="text-[9px] text-abnormal-brick/80 mono mt-0.5">
                          【边界条件】
                        </div>
                      )}
                      {row.isLateAttachment && (
                        <div className="text-[9px] text-late-ochre mono mt-0.5 flex items-center gap-0.5">
                          <FileWarning className="w-2.5 h-2.5 inline" />
                          【晚到附件】
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={row.value}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleValueChange(row.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mono w-full text-[11px] px-1 py-0.5 border border-academic-navy/25 bg-white focus:outline-none focus:ring-1 focus:ring-academic-navy"
                    />
                    <span className="mono text-[10px] text-academic-navy/70 truncate">
                      {row.unit}
                    </span>
                    <span className="mono text-[9px] text-academic-navy/50 text-center truncate">
                      {row.sourceRecordId || '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleAddLate}
              className="w-full px-2 py-2 mx-2 my-1 text-[11px] font-serif border-2 border-dashed border-late-ochre/70 text-late-ochre hover:bg-late-ochre/10 flex items-center justify-center gap-1 transition-all rounded-sm"
              style={{ width: 'calc(100% - 16px)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              + 追加晚到附件记录
            </button>
          </div>

          <div className="border-t border-academic-navy/15 px-3 py-3 bg-academic-paper-dark/40 space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px] font-serif mb-1">
                <span className="text-academic-navy/80">P-07 边界样本阈值 θ</span>
                <span className="mono text-abnormal-brick font-semibold">
                  {boundaryThreshold}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={boundaryThreshold}
                onChange={(e) => setBoundaryThreshold(parseFloat(e.target.value))}
                className="w-full accent-abnormal-brick"
              />
              <div className="flex justify-between text-[9px] mono text-academic-navy/50">
                <span>0</span>
                <span>默认=5</span>
                <span>20</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] font-serif mb-1">
                <span className="text-academic-navy/80">P-08 外推安全系数 k</span>
                <span className="mono text-academic-navy font-semibold">
                  {safeCoefficient.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.9}
                max={1.2}
                step={0.01}
                value={safeCoefficient}
                onChange={(e) => setSafeCoefficient(parseFloat(e.target.value))}
                className="w-full accent-academic-navy"
              />
              <div className="flex justify-between text-[9px] mono text-academic-navy/50">
                <span>0.90严格</span>
                <span>默认=1.00</span>
                <span>1.20宽松</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
