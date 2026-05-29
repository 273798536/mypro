import { useStore } from '@/store/useStore';
import { Plus, Trash2, Move, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

export function ChargePanel() {
  const charges = useStore((s) => s.charges);
  const selectedChargeId = useStore((s) => s.selectedChargeId);
  const collapsed = useStore((s) => s.panelCollapsed.left);
  const {
    addCharge, removeCharge, selectCharge,
    updateChargeMagnitude, updateChargeLabel, togglePanel,
  } = useStore();

  if (collapsed) {
    return (
      <div className="absolute left-0 top-0 h-full w-10 bg-[#0d1225]/90 backdrop-blur-md
        flex items-center justify-center border-r border-cyan-900/30 z-10">
        <button
          onClick={() => togglePanel('left')}
          className="text-cyan-400/70 hover:text-cyan-300 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute left-0 top-0 h-full w-72 bg-[#0d1225]/90 backdrop-blur-md
      border-r border-cyan-900/30 flex flex-col z-10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-900/30">
        <h2 className="text-sm font-bold text-cyan-300 tracking-wide flex items-center gap-2">
          <Zap size={14} /> 电荷管理
        </h2>
        <button
          onClick={() => togglePanel('left')}
          className="text-cyan-400/70 hover:text-cyan-300 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="flex gap-2 px-4 py-2 border-b border-cyan-900/20">
        <button
          onClick={() => addCharge(1)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded
            bg-red-900/40 hover:bg-red-800/50 text-red-300 text-xs
            border border-red-700/30 transition-colors"
        >
          <Plus size={12} /> 正电荷
        </button>
        <button
          onClick={() => addCharge(-1)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded
            bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 text-xs
            border border-blue-700/30 transition-colors"
        >
          <Plus size={12} /> 负电荷
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {charges.map((charge) => {
          const isSelected = charge.id === selectedChargeId;
          const isPositive = charge.magnitude > 0;
          const borderColor = isPositive ? 'border-red-500/40' : 'border-blue-500/40';
          const selectedBg = isSelected ? 'bg-cyan-900/20' : '';

          return (
            <div
              key={charge.id}
              onClick={() => selectCharge(charge.id)}
              className={`p-2.5 rounded-lg border ${borderColor} ${selectedBg}
                cursor-pointer transition-all hover:bg-cyan-900/10`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full
                    ${isPositive ? 'bg-red-500 shadow-[0_0_6px_rgba(255,59,92,0.5)]' : 'bg-blue-500 shadow-[0_0_6px_rgba(59,125,255,0.5)]'}`}
                  />
                  <input
                    value={charge.label}
                    onChange={(e) => updateChargeLabel(charge.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-14 bg-transparent text-xs font-mono text-white
                      border-b border-transparent hover:border-cyan-700/50
                      focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCharge(charge.id);
                  }}
                  className="text-red-400/50 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-300/60">
                <Move size={10} />
                <span>({charge.position[0].toFixed(2)}, {charge.position[1].toFixed(2)}, {charge.position[2].toFixed(2)})</span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-cyan-400/60 w-6">电量</span>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.1}
                  value={charge.magnitude}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateChargeMagnitude(charge.id, parseFloat(e.target.value));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 h-1 accent-cyan-500"
                />
                <span className={`text-xs font-mono w-10 text-right
                  ${isPositive ? 'text-red-400' : charge.magnitude < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                  {charge.magnitude > 0 ? '+' : ''}{charge.magnitude.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}

        {charges.length === 0 && (
          <div className="text-center py-8 text-cyan-500/40 text-xs">
            点击上方按钮添加电荷
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-cyan-900/20 text-[10px] text-cyan-500/40">
        共 {charges.length} 个电荷 · 拖拽球体移动
      </div>
    </div>
  );
}
